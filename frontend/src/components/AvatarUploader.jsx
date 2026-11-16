import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import Avatar from './Avatar';
import { CameraIcon, CloseIcon } from './Icons';
import { clamp, clampOffset, cropArea, maxZoom, minZoom, outputSize } from '../utils/crop';

const maxFileSize = 20 * 1024 * 1024;
const maxWorkingSide = 2048;
const maxUploadBytes = 280 * 1024;

// Abre la imagen elegida y la achica a 2048 px como máximo, con fondo blanco (un PNG transparente no queda negro).
// El navegador ya la endereza según cómo se sacó la foto.
async function loadPicture(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, maxWorkingSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('canvas');
    return { canvas, preview: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Recorta el cuadro elegido a 256 × 256 y lo pasa a JPEG. Si quedara muy pesado, baja la calidad.
function exportCrop(canvas, area) {
  const output = document.createElement('canvas');
  output.width = outputSize;
  output.height = outputSize;
  const context = output.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputSize, outputSize);
  context.imageSmoothingQuality = 'high';
  context.drawImage(canvas, area.x, area.y, area.size, area.size, 0, 0, outputSize, outputSize);
  for (const quality of [0.88, 0.8, 0.7, 0.6]) {
    const dataUrl = output.toDataURL('image/jpeg', quality);
    if ((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75 <= maxUploadBytes) return dataUrl;
  }
  return output.toDataURL('image/jpeg', 0.5);
}

// Ventana para encuadrar la foto: se arrastra con el dedo o el mouse, se acerca con el control, la rueda,
// dos dedos o las teclas + y −, y se mueve con las flechas del teclado.
function CropDialog({ picture, onCancel, onSave, onFile }) {
  const dialog = useRef(null);
  const area = useRef(null);
  const anotherInput = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const [box, setBox] = useState(280);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { width, height } = picture.canvas;

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  // El cuadro cambia de tamaño con la pantalla: se mide para que las cuentas del recorte coincidan.
  useEffect(() => {
    const element = area.current;
    const measure = () => setBox(element.clientWidth || 280);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setOffset(previous => clampOffset(previous, box, width, height, zoom)); }, [box, zoom, width, height]);
  // La rueda del mouse acerca o aleja sin mover la página (por eso el evento no es pasivo).
  useEffect(() => {
    const element = area.current;
    const wheel = event => { event.preventDefault(); setZoom(value => clamp(value * (1 - event.deltaY * 0.0015), minZoom, maxZoom)); };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);

  const move = (dx, dy) => setOffset(previous => clampOffset({ x: previous.x + dx, y: previous.y + dy }, box, width, height, zoom));
  const distance = () => { const [a, b] = [...pointers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  function pointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = pointers.current.size === 2 ? { pinch: distance(), zoom } : null;
  }
  function pointerMove(event) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && gesture.current) setZoom(clamp(gesture.current.zoom * (distance() / gesture.current.pinch), minZoom, maxZoom));
    else if (pointers.current.size === 1) move(event.clientX - last.x, event.clientY - last.y);
  }
  function pointerUp(event) {
    pointers.current.delete(event.pointerId);
    gesture.current = null;
  }
  function keyDown(event) {
    const step = event.shiftKey ? 24 : 8;
    const actions = {
      ArrowLeft: () => move(step, 0), ArrowRight: () => move(-step, 0), ArrowUp: () => move(0, step), ArrowDown: () => move(0, -step),
      '+': () => setZoom(value => clamp(value + 0.1, minZoom, maxZoom)), '=': () => setZoom(value => clamp(value + 0.1, minZoom, maxZoom)),
      '-': () => setZoom(value => clamp(value - 0.1, minZoom, maxZoom)),
    };
    if (!actions[event.key]) return;
    event.preventDefault();
    actions[event.key]();
  }
  async function save() {
    setBusy(true); setError('');
    try { await onSave(exportCrop(picture.canvas, cropArea(box, width, height, zoom, offset))); }
    catch (failure) { setError(failure.fields?.image || failure.message); setBusy(false); }
  }

  const scale = Math.max(box / width, box / height) * zoom;
  return <dialog ref={dialog} className="crop-dialog" aria-labelledby="crop-title" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="crop-inner">
      <div className="crop-top">
        <h2 id="crop-title">Ajustá tu foto</h2>
        <button type="button" className="icon-button access-close" onClick={onCancel} disabled={busy} aria-label="Cancelar"><CloseIcon/></button>
      </div>
      <div ref={area} className="crop-area" tabIndex={0} role="group" aria-label="Encuadre de la foto" aria-describedby="crop-help"
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={keyDown}>
        <img src={picture.preview} alt="" draggable="false" style={{ width: `${width}px`, height: `${height}px`, transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}/>
        <span className="crop-guide" aria-hidden="true"/>
      </div>
      <p id="crop-help" className="crop-help">Arrastrá la foto para encuadrarla. Con el teclado: flechas para moverla, + y − para acercarla.</p>
      <div className="field crop-zoom">
        <label htmlFor="crop-zoom">Acercar</label>
        <input id="crop-zoom" type="range" min={minZoom} max={maxZoom} step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} disabled={busy}/>
      </div>
      {error && <div className="alert" role="alert"><p>{error}</p></div>}
      {/* Este selector va dentro de la ventana: lo de afuera queda inactivo mientras está abierta. */}
      <input ref={anotherInput} type="file" accept="image/*" hidden onChange={onFile}/>
      <div className="admin-buttons crop-buttons">
        <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar foto'}</button>
        <button className="btn btn-outline" type="button" onClick={() => anotherInput.current?.click()} disabled={busy}>Elegir otra</button>
      </div>
    </div>
  </dialog>;
}

// Foto de perfil: elegir de la galería (o sacar con la cámara en el celular), recortar y guardar, o quitarla.
// inputRef permite abrir el selector desde otro botón (la cámara sobre la foto del perfil).
export default function AvatarUploader({ profile, inputRef, onChanged }) {
  const { reloadUser } = useAuth();
  const [picture, setPicture] = useState(null);
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => () => { if (picture) URL.revokeObjectURL(picture.preview); }, [picture]);

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // así se puede volver a elegir la misma foto
    if (!file) return;
    setError(''); setMessage(''); setConfirming(false);
    // Si algo falla se cierra la ventana del recorte, así el aviso queda a la vista.
    const problem = file.type && !file.type.startsWith('image/') ? 'Elegí un archivo de imagen (JPG, PNG o WebP).'
      : file.size > maxFileSize ? 'La foto pesa más de 20 MB. Elegí otra o una captura más liviana.' : '';
    if (problem) { setPicture(null); setError(problem); return; }
    setOpening(true);
    try { setPicture(await loadPicture(file)); }
    catch { setPicture(null); setError('No pudimos abrir esa imagen. Probá con una foto JPG, PNG o WebP.'); }
    finally { setOpening(false); }
  }
  async function save(image) {
    const { data, message: done } = await profileService.uploadAvatar(image);
    setPicture(null);
    setMessage(done);
    onChanged(data.avatarVersion);
    await reloadUser();
  }
  async function remove() {
    setBusy(true); setError('');
    try {
      const { data, message: done } = await profileService.removeAvatar();
      setConfirming(false); setMessage(done);
      onChanged(data.avatarVersion);
      await reloadUser();
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }

  const hasPhoto = Boolean(profile.avatarVersion);
  return <section className="profile-card photo-card" aria-labelledby="photo-title">
    <h2 id="photo-title">Foto de perfil</h2>
    <div className="photo-row">
      <Avatar person={profile} size="large"/>
      <p>Elegí una foto de tu galería o, desde el celular, sacala con la cámara. Antes de guardarla la encuadrás en el círculo. Se ve en tu perfil, tus preguntas y tus respuestas.</p>
    </div>
    <p className="fine-print">Guardamos solo la imagen recortada, sin la ubicación ni otros datos del archivo. No subas fotos de otras personas ni con datos personales: moderación puede quitarla.</p>
    <input ref={inputRef} type="file" accept="image/*" hidden onChange={choose}/>
    <div className="admin-buttons">
      <button className="btn btn-primary" type="button" onClick={() => inputRef.current?.click()} disabled={opening || busy}><CameraIcon/>{opening ? 'Abriendo la foto…' : hasPhoto ? 'Cambiar la foto' : 'Elegir una foto'}</button>
      {hasPhoto && !confirming && <button className="btn btn-outline" type="button" onClick={() => { setConfirming(true); setMessage(''); }} disabled={busy}>Quitar la foto</button>}
    </div>
    {confirming && <div className="confirm-box" role="group" aria-label="Confirmar">
      <p>¿Quitás tu foto? Vas a volver a mostrar tus iniciales con tu color.</p>
      <div className="admin-buttons">
        <button className="btn btn-danger btn-small" type="button" onClick={remove} disabled={busy}>{busy ? 'Quitando…' : 'Sí, quitarla'}</button>
        <button className="btn btn-outline btn-small" type="button" onClick={() => setConfirming(false)} disabled={busy}>No</button>
      </div>
    </div>}
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    {message && <p className="report-done" role="status">{message}</p>}
    {picture && <CropDialog key={picture.preview} picture={picture} onCancel={() => setPicture(null)} onSave={save} onFile={choose}/>}
  </section>;
}
