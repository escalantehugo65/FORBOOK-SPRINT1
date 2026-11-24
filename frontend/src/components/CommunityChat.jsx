import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityService, notifyUnreadChanged } from '../services/communities';
import { Loading, ErrorMessage } from './Feedback';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import { CloseIcon, FlagIcon, ImageIcon, MicIcon, SendIcon, StopIcon, TrashIcon } from './Icons';
import ReportAction from './ReportAction';
import { audioType, blobToDataUrl, chatTime, formatSeconds, groupMessages, mergeMessages, prepareImage, rankBadges } from '../utils/communities';

const pollEvery = 4000;

// Un mensaje del chat. El texto se muestra como texto (React lo escapa): nunca se interpreta como HTML.
// Los mensajes de otras personas se pueden reportar: moderación decide si los borra.
function Message({ communityId, message, compact, onDelete, onImageLoad }) {
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const author = message.author;
  const src = message.attachment ? communityService.attachmentUrl(communityId, message.id) : null;
  async function remove() {
    setBusy(true);
    try { await onDelete(message); } finally { setBusy(false); setConfirming(false); }
  }
  return <li className={`chat-message${compact ? ' is-compact' : ''}${message.own ? ' is-own' : ''}`}>
    <div className="chat-avatar">{!compact && <Avatar person={author} size="small"/>}</div>
    <div className="chat-content">
      {!compact && <p className="chat-author">
        {author.id ? <Link to={`/usuarios/${author.id}`}><DecoratedName name={author.name} color={author.decorations?.nameColor}/></Link> : <span>{author.name}</span>}
        {rankBadges[author.rank] && <span className={`rank-badge rank-${author.rank}`}>{rankBadges[author.rank]}</span>}
        {author.role && <span className={`role-chip tone-${author.role.color}`}>{author.role.name}</span>}
        <time dateTime={message.createdAt}>{chatTime(message.createdAt)}</time>
      </p>}
      {message.deleted ? <p className="chat-deleted">Mensaje borrado.</p> : <>
        {message.kind === 'image' && <a className="chat-image" href={src} target="_blank" rel="noopener noreferrer">
          <img src={src} alt={`Imagen que mandó ${author.name}`} width={message.attachment.width} height={message.attachment.height} loading="lazy" decoding="async" onLoad={onImageLoad}/>
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>}
        {message.kind === 'audio' && <div className="chat-audio">
          <audio controls preload="none" src={src} aria-label={`Audio de ${author.name}, ${formatSeconds(message.attachment.seconds)}`}/>
          <span>{formatSeconds(message.attachment.seconds)}</span>
        </div>}
        {message.body && <p className="chat-body">{message.body}</p>}
      </>}
      {reporting && <ReportAction targetType="message" targetId={message.id} startOpen onCancel={() => setReporting(false)} className="chat-report"
        label={`Reportar el mensaje de ${author.name}`} reasons={['offensive', 'spam', 'personal_data', 'false', 'other']}/>}
    </div>
    {(message.canDelete || (!message.own && !message.deleted)) && <div className="chat-actions">
      {!message.own && !message.deleted && !reporting && <button className="icon-button chat-delete" type="button" onClick={() => setReporting(true)} aria-label={`Reportar el mensaje de ${author.name} de las ${chatTime(message.createdAt)}`} title="Reportar mensaje"><FlagIcon/></button>}
      {confirming
        ? <><button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={remove}>{busy ? 'Borrando…' : 'Sí, borrar'}</button><button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setConfirming(false)}>No</button></>
        : message.canDelete && <button className="icon-button chat-delete" type="button" onClick={() => setConfirming(true)} aria-label={`Borrar el mensaje de ${message.own ? 'vos' : author.name} de las ${chatTime(message.createdAt)}`} title="Borrar mensaje"><TrashIcon/></button>}
    </div>}
  </li>;
}

// Chat general de la comunidad. Trae los últimos mensajes y pregunta por nuevos cada pocos segundos
// (sin WebSockets: alcanza para un chat de grupo y no suma dependencias).
// readOnly: moderación de Forbook mira el chat sin ser miembro (puede borrar y reportar, pero no escribir).
export default function CommunityChat({ communityId, limits, readOnly = false }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: null, hasMore: false, loadingOlder: false });
  const [revision, setRevision] = useState(0);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [recording, setRecording] = useState(null); // { seconds } mientras graba
  const [audio, setAudio] = useState(null); // { dataUrl, url, seconds } listo para mandar
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [newBelow, setNewBelow] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const lastId = useRef(0);
  const stick = useRef(true);
  const recorder = useRef(null);
  const canRecord = useMemo(() => Boolean(audioType() && navigator.mediaDevices?.getUserMedia), []);

  const atBottom = () => { const box = scrollRef.current; return !box || box.scrollHeight - box.scrollTop - box.clientHeight < 80; };
  const toBottom = useCallback(() => { const box = scrollRef.current; if (box) box.scrollTop = box.scrollHeight; setNewBelow(0); }, []);

  // Primera carga.
  useEffect(() => {
    const controller = new AbortController();
    setStatus({ loading: true, error: null, hasMore: false, loadingOlder: false });
    communityService.messages(communityId, {}, controller.signal).then(result => {
      setMessages(result.data);
      lastId.current = result.data.length ? result.data[result.data.length - 1].id : 0;
      stick.current = true;
      setStatus({ loading: false, error: null, hasMore: result.meta.hasMore, loadingOlder: false });
      notifyUnreadChanged();
    }).catch(failure => { if (failure.name !== 'AbortError') setStatus({ loading: false, error: failure, hasMore: false, loadingOlder: false }); });
    return () => controller.abort();
  }, [communityId, revision]);

  // Mensajes nuevos: cada 4 segundos, y solo con la pestaña a la vista.
  useEffect(() => {
    if (status.loading || status.error) return undefined;
    let active = true;
    let running = false;
    const check = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        const result = await communityService.messages(communityId, { after: lastId.current });
        if (!active) return;
        if (result.data.length) {
          stick.current = atBottom();
          lastId.current = Math.max(lastId.current, result.data[result.data.length - 1].id);
          setMessages(current => mergeMessages(current, result.data));
          if (!stick.current) setNewBelow(count => count + result.data.filter(message => !message.own).length);
          notifyUnreadChanged();
        }
        if (result.meta.deletedIds.length) {
          const gone = new Set(result.meta.deletedIds);
          setMessages(current => (current.some(message => gone.has(message.id) && !message.deleted)
            ? current.map(message => (gone.has(message.id) ? { ...message, deleted: true, body: null, attachment: null, canDelete: false } : message))
            : current));
        }
      } catch { /* si falla una consulta, se vuelve a intentar en la siguiente */ } finally { running = false; }
    };
    const timer = setInterval(check, pollEvery);
    document.addEventListener('visibilitychange', check);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [communityId, status.loading, status.error]);

  // Después de dibujar: si estaba abajo, sigue abajo.
  useLayoutEffect(() => { if (stick.current) toBottom(); }, [messages, toBottom]);

  async function loadOlder() {
    if (!messages.length || status.loadingOlder) return;
    const box = scrollRef.current;
    const previousHeight = box.scrollHeight;
    setStatus(current => ({ ...current, loadingOlder: true }));
    try {
      const result = await communityService.messages(communityId, { before: messages[0].id });
      stick.current = false;
      setMessages(current => [...result.data, ...current]);
      setStatus(current => ({ ...current, hasMore: result.meta.hasMore, loadingOlder: false }));
      // Se conserva la posición: los mensajes viejos aparecen arriba sin mover lo que se estaba leyendo.
      requestAnimationFrame(() => { box.scrollTop = box.scrollHeight - previousHeight; });
    } catch (failure) { setError(failure.message); setStatus(current => ({ ...current, loadingOlder: false })); }
  }

  function clearImage() { if (image) URL.revokeObjectURL(image.preview); setImage(null); }
  function clearAudio() { if (audio) URL.revokeObjectURL(audio.url); setAudio(null); }
  useEffect(() => () => { recorder.current?.cancel(); }, []);

  async function pickImage(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try { clearAudio(); clearImage(); setImage(await prepareImage(file, limits.imageBytes)); inputRef.current?.focus(); }
    catch (failure) { setError(failure.message); }
  }

  async function startRecording() {
    setError('');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError('No pudimos usar el micrófono. Revisá el permiso del navegador para este sitio.'); return; }
    clearImage(); clearAudio();
    const type = audioType();
    const media = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32000 });
    const chunks = [];
    const started = Date.now();
    let cancelled = false;
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      setRecording({ seconds });
      if (seconds >= limits.audioSeconds) media.stop();
    }, 250);
    media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    media.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach(track => track.stop());
      recorder.current = null;
      setRecording(null);
      if (cancelled) return;
      const seconds = Math.min(limits.audioSeconds, Math.max(1, Math.round((Date.now() - started) / 1000)));
      const blob = new Blob(chunks, { type });
      if (blob.size < 200) { setError('El audio quedó vacío. Probá grabarlo de nuevo.'); return; }
      if (blob.size > limits.audioBytes) { setError('El audio es demasiado pesado. Grabá uno más corto.'); return; }
      setAudio({ dataUrl: await blobToDataUrl(blob), url: URL.createObjectURL(blob), seconds });
    };
    recorder.current = { stop: () => media.state !== 'inactive' && media.stop(), cancel: () => { cancelled = true; if (media.state !== 'inactive') media.stop(); } };
    setRecording({ seconds: 0 });
    media.start();
  }

  async function submit(event) {
    event?.preventDefault();
    if (sending || recording) return;
    const body = text.trim();
    if (!body && !image && !audio) return;
    if (body.length > limits.messageLength) { setError(`El mensaje puede tener hasta ${limits.messageLength} caracteres.`); return; }
    setSending(true); setError('');
    try {
      const payload = audio ? { audio: audio.dataUrl, seconds: audio.seconds } : image ? { image: image.dataUrl, ...(body ? { body } : {}) } : { body };
      const { data } = await communityService.send(communityId, payload);
      stick.current = true;
      lastId.current = Math.max(lastId.current, data.id);
      setMessages(current => mergeMessages(current, [data]));
      if (!audio) setText('');
      clearImage(); clearAudio();
    } catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  async function remove(message) {
    setError('');
    try {
      await communityService.deleteMessage(communityId, message.id);
      setMessages(current => current.map(item => (item.id === message.id ? { ...item, deleted: true, body: null, attachment: null, canDelete: false } : item)));
    } catch (failure) { setError(failure.message); }
  }

  const items = useMemo(() => groupMessages(messages), [messages]);
  if (status.loading) return <Loading text="Abriendo el chat…"/>;
  if (status.error) return <ErrorMessage message={status.error.message} retry={() => setRevision(value => value + 1)}/>;

  return <section className="chat" aria-label="Chat general">
    <div className="chat-scroll" ref={scrollRef} tabIndex="0" role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensajes" onScroll={() => { if (atBottom()) setNewBelow(0); }}>
      {status.hasMore && <div className="chat-older"><button className="btn btn-outline btn-small" type="button" disabled={status.loadingOlder} onClick={loadOlder}>{status.loadingOlder ? 'Cargando…' : 'Ver mensajes anteriores'}</button></div>}
      {messages.length ? <ol className="chat-list">{items.map(item => (item.type === 'day'
        ? <li key={item.key} className="chat-day"><span>{item.label}</span></li>
        : <Message key={item.key} communityId={communityId} message={item.message} compact={item.compact} onDelete={remove} onImageLoad={() => { if (stick.current) toBottom(); }}/>))}</ol>
        : <div className="chat-empty"><h3>Todavía no hay mensajes</h3><p>Rompé el hielo: presentate o contá de dónde venís.</p></div>}
    </div>
    {newBelow > 0 && <button className="chat-new" type="button" onClick={() => { stick.current = true; toBottom(); }}>{newBelow === 1 ? '1 mensaje nuevo' : `${newBelow} mensajes nuevos`} ↓</button>}

    {readOnly ? <p className="chat-readonly">Estás leyendo el chat como parte de la moderación de Forbook. Para escribir, unite a la comunidad.</p> : <form className="chat-composer" onSubmit={submit}>
      {image && <div className="chat-attachment"><img src={image.preview} alt="Imagen lista para mandar"/><span>Imagen lista. Podés sumarle un texto.</span><button className="icon-button" type="button" onClick={clearImage} aria-label="Quitar la imagen"><CloseIcon/></button></div>}
      {audio && <div className="chat-attachment"><audio controls src={audio.url} aria-label="Audio grabado"/><span>{formatSeconds(audio.seconds)}</span><button className="icon-button" type="button" onClick={clearAudio} aria-label="Descartar el audio"><CloseIcon/></button></div>}
      {recording && <div className="chat-attachment is-recording" role="status"><span className="recording-dot" aria-hidden="true"/><span>Grabando… {formatSeconds(recording.seconds)} de {formatSeconds(limits.audioSeconds)}</span><button className="btn btn-outline btn-small" type="button" onClick={() => recorder.current?.cancel()}>Cancelar</button></div>}
      {error && <p className="field-error chat-error" role="alert">{error}</p>}
      <div className="chat-row">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage}/>
        <button className="icon-button" type="button" disabled={sending || Boolean(recording)} onClick={() => fileRef.current.click()} aria-label="Mandar una imagen" title="Mandar una imagen"><ImageIcon/></button>
        {canRecord && (recording
          ? <button className="icon-button is-recording" type="button" onClick={() => recorder.current?.stop()} aria-label="Terminar de grabar" title="Terminar de grabar"><StopIcon/></button>
          : <button className="icon-button" type="button" disabled={sending} onClick={startRecording} aria-label="Grabar un audio" title="Grabar un audio"><MicIcon/></button>)}
        <label className="sr-only" htmlFor="chat-text">Escribí un mensaje</label>
        <textarea id="chat-text" ref={inputRef} rows="1" value={text} maxLength={limits.messageLength} disabled={Boolean(audio) || Boolean(recording)} placeholder={audio ? 'Mandá o descartá el audio' : 'Mensaje…'}
          onChange={event => { setText(event.target.value); setError(''); }}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }}/>
        <button className="btn btn-primary btn-small chat-send" type="submit" disabled={sending || Boolean(recording) || (!text.trim() && !image && !audio)}><SendIcon/><span>{sending ? 'Enviando…' : 'Enviar'}</span></button>
      </div>
      <small className="chat-hint">Enter envía, Mayús + Enter baja de línea. Lo que escribís lo ven todos los miembros.</small>
    </form>}
  </section>;
}
