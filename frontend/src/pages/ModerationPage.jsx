import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { moderationService } from '../services/moderation';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import { actionNames, formatDateTime, reasonNames, reportStatusBadge, reportStatusNames, targetNames } from '../utils/moderation';

const filters = [['pending', 'Pendientes'], ['actioned', 'Con acción'], ['dismissed', 'Desestimados'], ['all', 'Todos']];
const emptyTexts = {
  pending: ['No hay reportes pendientes', 'Cuando alguien reporte una pregunta, una respuesta o una ficha, va a aparecer acá.'],
  actioned: ['Todavía no hay reportes con acción', 'Acá se ven los reportes en los que se ocultó contenido o se cerró una pregunta.'],
  dismissed: ['Todavía no hay reportes desestimados', 'Acá se ven los reportes que se revisaron y no requirieron cambios.'],
  all: ['Todavía no hay reportes', 'Cuando la comunidad reporte algo, va a aparecer acá.'],
};

// Un reporte de la cola. Si está pendiente, trae el formulario para decidir (FF-37).
function ReportCard({ report, onResolved }) {
  const { target } = report;
  const [decision, setDecision] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const decisions = [
    ['dismiss', 'Desestimar', 'El contenido queda como está.'],
    ['hide', 'Ocultar', 'Deja de verse, pero no se borra.'],
    ...(target.type === 'question' ? [['close', 'Cerrar la pregunta', 'Sigue visible, pero no recibe respuestas.']] : []),
  ].filter(([value]) => !target.missing || value === 'dismiss');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = {};
    if (!decision) invalid.decision = 'Elegí una decisión.';
    if (note.trim().length < 5 || note.trim().length > 500) invalid.note = 'Escribí entre 5 y 500 caracteres.';
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      await moderationService.resolve(report.id, { decision, note: note.trim() });
      onResolved(`Decisión guardada: ${actionNames[decision].toLowerCase()}.`);
    } catch (failure) {
      setError(failure.message); setErrors(failure.fields || {}); setBusy(false);
    }
  }

  return <li className="report-card">
    <div className="report-top">
      <span className="badge badge-warn">{reasonNames[report.reason]}</span>
      <span className={reportStatusBadge[report.status]}>{reportStatusNames[report.status]}</span>
      {target.hidden && <span className="badge badge-hidden">Oculto</span>}
      {target.closed && <span className="badge badge-soon">Cerrada</span>}
    </div>
    <div className="report-target">
      <p className="card-category">{targetNames[target.type]}{target.type === 'answer' ? ' a la pregunta' : ''}</p>
      <h2 className="report-title">{target.link ? <Link to={target.link}>{target.title}</Link> : target.title}</h2>
      {target.excerpt && <blockquote className="report-excerpt">{target.excerpt}</blockquote>}
    </div>
    {report.details && <p className="report-details"><span>Comentario de quien reportó:</span> {report.details}</p>}
    <p className="card-meta">Reportó {report.reporter.name} · {formatDateTime(report.createdAt)}</p>

    {report.resolution
      ? <div className="resolution-box">
        <p><strong>{actionNames[report.resolution.action === 'none' ? 'dismiss' : report.resolution.action]}</strong> · {report.resolution.resolver.name} · {formatDateTime(report.resolution.resolvedAt)}</p>
        <p>Motivo interno: {report.resolution.note}</p>
      </div>
      : <form className="resolve-form" onSubmit={submit} noValidate>
        <fieldset className="choice-group" disabled={busy}>
          <legend>Decisión <span aria-hidden="true">*</span></legend>
          <div className="decision-row">
            {decisions.map(([value, label, hint]) => <label className="choice decision" key={value}>
              <input type="radio" name={`decision-${report.id}`} value={value} checked={decision === value}
                onChange={() => { setDecision(value); setErrors(previous => ({ ...previous, decision: undefined })); }}
                aria-invalid={!!errors.decision} aria-describedby={errors.decision ? `decision-error-${report.id}` : undefined}/>
              <span><strong>{label}</strong><small>{hint}</small></span>
            </label>)}
          </div>
          {errors.decision && <small id={`decision-error-${report.id}`} className="field-error">{errors.decision}</small>}
        </fieldset>
        <div className="field">
          <label htmlFor={`note-${report.id}`}>Motivo interno <span aria-hidden="true">*</span></label>
          <textarea id={`note-${report.id}`} rows="3" maxLength={500} value={note} disabled={busy}
            onChange={event => { setNote(event.target.value); setErrors(previous => ({ ...previous, note: undefined })); }}
            aria-invalid={!!errors.note} aria-describedby={errors.note ? `note-error-${report.id}` : `note-hint-${report.id}`}/>
          <small id={`note-hint-${report.id}`}>Solo lo ve el equipo de moderación. Queda en el historial.</small>
          {errors.note && <small id={`note-error-${report.id}`} className="field-error">{errors.note}</small>}
        </div>
        {error && <div className="alert" role="alert"><p>{error}</p></div>}
        <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar decisión'}</button></div>
      </form>}
  </li>;
}

// Cola de reportes (FF-36). El filtro queda en la dirección: ?status=actioned
export default function ModerationPage() {
  usePageTitle('Moderación');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'pending';
  const page = Number(params.get('page') || '1');
  const loader = useCallback(signal => moderationService.reports({ status, page }, signal), [status, page]);
  const { result, loading, error, retry } = useFetch(loader);
  const [notice, setNotice] = useState('');
  const noticeRef = useRef(null);
  useEffect(() => { if (notice) noticeRef.current?.focus(); }, [notice]);
  const counts = result?.meta.counts;
  const choose = value => { setNotice(''); setParams(value === 'pending' ? {} : { status: value }); };
  const paginate = next => setParams({ ...(status === 'pending' ? {} : { status }), page: String(next) });
  const [emptyTitle, emptyText] = emptyTexts[status] || emptyTexts.all;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Moderación</p>
      <h1>Reportes de la comunidad.</h1>
      <p className="lead">Revisá cada aviso y registrá una decisión. Nada se borra: lo que se oculta queda guardado y anotado en el historial.</p>
    </header>
    <ModerationNav/>
    <div className="chip-row mod-filters" role="group" aria-label="Filtrar por estado">
      {filters.map(([value, label]) => <button key={value} className="chip" type="button" aria-pressed={status === value} onClick={() => choose(value)}>
        {label}{counts && value !== 'all' ? ` (${counts[value]})` : ''}
      </button>)}
    </div>
    {notice && <p ref={noticeRef} tabIndex="-1" className="access-notice page-notice" role="status">{notice}</p>}
    {loading ? <Loading text="Cargando reportes…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : result.data.length ? <>
        <ol className="report-list">{result.data.map(report => <ReportCard key={report.id} report={report} onResolved={message => { setNotice(message); retry(); }}/>)}</ol>
        {result.meta.pages > 1 && <nav className="pagination" aria-label="Páginas">
          {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => paginate(page - 1)}>Anterior</button>}
          <span>Página {result.meta.page} de {result.meta.pages}</span>
          {page < result.meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => paginate(page + 1)}>Siguiente</button>}
        </nav>}
      </>
      : <div className="empty"><h2>{emptyTitle}</h2><p>{emptyText}</p></div>}
  </div>;
}
