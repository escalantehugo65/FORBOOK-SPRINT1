import { useEffect, useRef, useState } from 'react';
import AuthPage from '../pages/AuthPage';

export default function AuthModal({ mode, onClose, onModeChange }) {
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
  return <dialog ref={dialog} className="access-dialog" aria-labelledby="access-title"
    onCancel={event => { event.preventDefault(); requestClose(); }}>
    <div className="access-topline"><span className="access-brand">forbook.</span><button type="button" className="access-close" onClick={requestClose} disabled={busy} aria-label="Cerrar ventana">×</button></div>
    {confirmClose && <section className="access-confirm"><h2 id="access-title" tabIndex="-1">¿Cerrar el formulario?</h2><p>Lo que escribiste se borrará. Podés seguir completándolo o cerrar la ventana.</p><button className="welcome-cta" onClick={() => setConfirmClose(false)}>Seguir completando</button><button className="access-text-button" onClick={onClose}>Cerrar y descartar</button></section>}
    <div hidden={confirmClose}><AuthPage key={mode} registration={mode === 'register'} titleId={confirmClose ? 'access-form-title' : 'access-title'} initialNotice={notice} onModeChange={(next, message = '') => { setNotice(message); onModeChange(next); }} onBusyChange={setBusy} onDirtyChange={setDirty}/></div>
  </dialog>;
}

