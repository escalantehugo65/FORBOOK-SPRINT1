import { useId, useState } from 'react';
import { moderationService } from '../services/moderation';
import { reasonNames } from '../utils/moderation';

// Botón que despliega un formulario corto para reportar (FF-34) o avisar que un dato cambió (FF-35).
// Enviar el aviso no borra ni modifica nada: queda pendiente para el equipo de moderación.
export default function ReportAction({ targetType, targetId, label, reasons, detailsLabel = 'Contanos qué pasa (opcional)', className = '' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons.length === 1 ? reasons[0] : '');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!reason) { setError('Elegí un motivo.'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await moderationService.report({ targetType, targetId, reason, details: details.trim() });
      setDone(data.message);
    } catch (failure) {
      setError(failure.fields?.reason || failure.fields?.details || failure.message);
    } finally { setBusy(false); }
  }

  if (done) return <p className={`report-done ${className}`} role="status">{done}</p>;
  return <div className={`report-action ${className}`}>
    <button type="button" className="link-button report-toggle" aria-expanded={open} aria-controls={`${id}-form`} onClick={() => { setOpen(value => !value); setError(''); }}>{label}</button>
    {open && <form id={`${id}-form`} className="report-form" onSubmit={submit} noValidate>
      {reasons.length > 1 && <fieldset className="choice-group">
        <legend>Motivo <span aria-hidden="true">*</span></legend>
        <div className="report-reasons">
          {reasons.map(value => <label className="choice" key={value}>
            <input type="radio" name={`${id}-reason`} value={value} checked={reason === value} onChange={() => { setReason(value); setError(''); }}/>{reasonNames[value]}
          </label>)}
        </div>
      </fieldset>}
      <div className="field">
        <label htmlFor={`${id}-details`}>{detailsLabel}</label>
        <textarea id={`${id}-details`} rows="3" maxLength={500} value={details} disabled={busy} onChange={event => setDetails(event.target.value)} aria-describedby={`${id}-hint`}/>
        <small id={`${id}-hint`}>{details.length}/500 · No se borra nada: lo revisa el equipo de moderación.</small>
      </div>
      {error && <p className="report-error" role="alert">{error}</p>}
      <div className="report-buttons">
        <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar aviso'}</button>
        <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>}
  </div>;
}
