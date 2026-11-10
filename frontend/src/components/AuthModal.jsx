import { useEffect, useRef, useState } from 'react';
import AuthPage from '../pages/AuthPage';
import { CloseIcon } from './Icons';

// Ventana superpuesta con <dialog>: mantiene el foco adentro y lo devuelve al botón que la abrió.
export default function AuthModal({ mode, returnTo, onClose, onModeChange }) {
  const dialog = useRef(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => { setDirty(false); setConfirmClose(false); }, [mode]);
  useEffect(() => { dialog.current?.querySelector('#access-title')?.focus(); }, [confirmClose, mode]);
  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmClose(true); else onClose();
  }
  // Los botones de arriba se desactivan mientras se envía; el formulario puede pedir el cambio con un aviso.
  function switchMode(next, message = '') {
    if (next === mode) return;
    setNotice(message);
    onModeChange(next);
  }
  return <dialog ref={dialog} className="access-dialog" aria-labelledby="access-title" onCancel={event => { event.preventDefault(); requestClose(); }}>
    <div className="access-inner">
      <div className="access-top">
        <div className="segmented" role="group" aria-label="Elegí una opción">
          <button type="button" aria-pressed={mode === 'login'} disabled={busy || confirmClose} onClick={() => switchMode('login')}>Ingresar</button>
          <button type="button" aria-pressed={mode === 'register'} disabled={busy || confirmClose} onClick={() => switchMode('register')}>Crear cuenta</button>
        </div>
        <button type="button" className="icon-button access-close" onClick={requestClose} disabled={busy} aria-label="Cerrar ventana"><CloseIcon/></button>
      </div>
      {confirmClose && <section className="access-confirm">
        <h2 id="access-title" tabIndex="-1">¿Cerrar el formulario?</h2>
        <p>Lo que escribiste se va a borrar. Podés seguir completándolo o cerrar la ventana.</p>
        <button className="btn btn-primary" type="button" onClick={() => setConfirmClose(false)}>Seguir completando</button>
        <button className="link-button" type="button" onClick={onClose}>Cerrar y descartar</button>
      </section>}
      <div hidden={confirmClose}>
        <AuthPage key={mode} registration={mode === 'register'} returnTo={returnTo} titleId={confirmClose ? 'access-form-title' : 'access-title'} initialNotice={notice}
          onModeChange={switchMode} onBusyChange={setBusy} onDirtyChange={setDirty}/>
      </div>
    </div>
  </dialog>;
}
