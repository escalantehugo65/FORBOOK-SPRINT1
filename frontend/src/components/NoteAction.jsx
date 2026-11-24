import { useId, useState } from 'react';

// Botón para una acción de administración que pide un motivo interno (queda en el historial).
// Al tocarlo aparece el campo del motivo y la confirmación. action(motivo) devuelve la respuesta del backend.
export default function NoteAction({ label, confirmLabel = 'Confirmar', action, onDone, danger = false, placeholder = 'Motivo (queda en el historial)', minLength = 5, maxLength = 500 }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (note.trim().length < minLength) { setError(`Escribí el motivo (al menos ${minLength} caracteres).`); return; }
    setBusy(true); setError('');
    try { const result = await action(note.trim()); setOpen(false); setNote(''); onDone?.(result.message); }
    catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); }
    finally { setBusy(false); }
  }
  if (!open) return <button className={`btn btn-outline btn-small${danger ? ' btn-danger' : ''}`} type="button" onClick={() => setOpen(true)}>{label}</button>;
  return <form className="note-action" onSubmit={submit} noValidate>
    <label className="sr-only" htmlFor={`${id}-note`}>Motivo de «{label}»</label>
    <input id={`${id}-note`} value={note} maxLength={maxLength} placeholder={placeholder} disabled={busy} autoFocus onChange={event => { setNote(event.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}/>
    <button className={`btn btn-small ${danger ? 'btn-danger' : 'btn-primary'}`} type="submit" disabled={busy}>{busy ? 'Guardando…' : confirmLabel}</button>
    <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => { setOpen(false); setError(''); }}>Cancelar</button>
    {error && <small id={`${id}-error`} className="field-error" role="alert">{error}</small>}
  </form>;
}
