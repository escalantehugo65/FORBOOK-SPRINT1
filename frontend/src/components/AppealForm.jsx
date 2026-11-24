import { useId, useState } from 'react';
import { sanctionService } from '../services/sanctions';
import { appealError, appealLimits } from '../utils/sanctions';

// Apelar una advertencia o una sanción propia. Se puede una sola vez por cada una; la revisa la administración.
export default function AppealForm({ item, onSent }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = appealError(text);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try {
      const result = await sanctionService.appeal({ targetType: item.kind, targetId: item.id, body: text.trim() });
      onSent?.(result.message);
    } catch (failure) { setError(failure.fields?.body || failure.message); setBusy(false); }
  }
  if (!open) return <button className="btn btn-outline btn-small" type="button" onClick={() => setOpen(true)} aria-controls={`${id}-form`}>Apelar</button>;
  return <form id={`${id}-form`} className="appeal-form" onSubmit={submit} noValidate>
    <div className="field">
      <label htmlFor={`${id}-text`}>¿Por qué creés que es un error?</label>
      <textarea id={`${id}-text`} rows="4" maxLength={appealLimits.max} value={text} disabled={busy} autoFocus
        onChange={event => { setText(event.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}/>
      <small id={`${id}-hint`}>{text.trim().length}/{appealLimits.max} · Al menos {appealLimits.min} caracteres. Se puede apelar una sola vez.</small>
      {error && <small id={`${id}-error`} className="field-error" role="alert">{error}</small>}
    </div>
    <div className="report-buttons">
      <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar apelación'}</button>
      <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => { setOpen(false); setError(''); }}>Cancelar</button>
    </div>
  </form>;
}
