import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService } from '../services/admin';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import { formatDateTime } from '../utils/moderation';
import { appealStatusBadge, appealStatusNames, sanctionLine, sanctionReasonNames } from '../utils/sanctions';

const filters = [['pending', 'Pendientes'], ['accepted', 'Aceptadas'], ['rejected', 'Rechazadas'], ['all', 'Todas']];

function AppealCard({ appeal, onResolved }) {
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const target = appeal.target;
  async function resolve(decision) {
    if (busy) return;
    const length = response.trim().length;
    if (length < 5 || length > 500) { setError('Escribí la respuesta en 5 a 500 caracteres: la va a leer la persona.'); return; }
    setBusy(true); setError('');
    try { const result = await adminService.resolveAppeal(appeal.id, { decision, response: response.trim() }); onResolved(result.message); }
    catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); setBusy(false); }
  }
  return <li className="report-card">
    <div className="report-top">
      <span className={appealStatusBadge[appeal.status]}>{appealStatusNames[appeal.status]}</span>
      {target && <span className="badge badge-warn">{sanctionReasonNames[target.reason]}</span>}
    </div>
    <div className="report-target">
      <p className="card-category">{appeal.user ? <Link to={`/admin/usuarios/${appeal.user.id}`}>{appeal.user.name}</Link> : 'Cuenta eliminada'} apeló</p>
      <h2 className="report-title">{target ? (target.kind === 'warning' ? 'Una advertencia' : sanctionLine(target)) : 'Sanción que ya no existe'}</h2>
      {target?.note && <p className="card-meta">Motivo que se le dio: {target.note}</p>}
      {target && <p className="card-meta">{target.revoked ? 'Ya está revocada.' : `Del ${formatDateTime(target.createdAt)}${target.automatic ? ' · automática' : ''}`}</p>}
      <blockquote className="report-excerpt">{appeal.body}</blockquote>
    </div>
    <p className="card-meta">Apelación del {formatDateTime(appeal.createdAt)}</p>
    {appeal.status === 'pending' ? <div className="resolve-form">
      <div className="field">
        <label htmlFor={`appeal-${appeal.id}`}>Respuesta para la persona</label>
        <textarea id={`appeal-${appeal.id}`} rows="2" maxLength={500} value={response} disabled={busy} onChange={event => { setResponse(event.target.value); setError(''); }} aria-describedby={`appeal-${appeal.id}-hint`}/>
        <small id={`appeal-${appeal.id}-hint`}>Aceptar revoca la {target?.kind === 'warning' ? 'advertencia y devuelve sus puntos' : 'sanción'}. Rechazar la deja como está.</small>
      </div>
      {error && <p className="report-error" role="alert">{error}</p>}
      <div className="report-buttons">
        <button className="btn btn-primary btn-small" type="button" disabled={busy} onClick={() => resolve('accept')}>Aceptar</button>
        <button className="btn btn-outline btn-small btn-danger" type="button" disabled={busy} onClick={() => resolve('reject')}>Rechazar</button>
      </div>
    </div> : <div className="resolution-box">
      <p><strong>{appealStatusNames[appeal.status]}</strong> · {appeal.resolver || 'Administración'} · {formatDateTime(appeal.resolvedAt)}</p>
      <p>Respuesta: {appeal.response}</p>
    </div>}
  </li>;
}

// /admin/apelaciones?status=pending: apelaciones de advertencias y sanciones.
export default function AdminAppealsPage() {
  usePageTitle('Apelaciones');
  const [params, setParams] = useSearchParams();
  const status = filters.some(([key]) => key === params.get('status')) ? params.get('status') : 'pending';
  const page = Number(params.get('page') || '1');
  const loader = useCallback(signal => adminService.appeals({ status, page }, signal), [status, page]);
  const { result, loading, error, retry } = useFetch(loader);
  const [notice, setNotice] = useState('');
  const meta = result?.meta;
  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Administración</p>
      <h1>Apelaciones.</h1>
      <p className="lead">Cada persona puede apelar una vez cada advertencia o sanción. Leé su explicación y respondé: la respuesta le aparece en Mis sanciones.</p>
    </header>
    <ModerationNav/>
    <div className="chip-row" role="group" aria-label="Estado de las apelaciones">
      {filters.map(([key, label]) => <button key={key} className="chip" type="button" aria-pressed={status === key} onClick={() => { setNotice(''); setParams(key === 'pending' ? {} : { status: key }); }}>{label}</button>)}
    </div>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {loading ? <Loading text="Cargando apelaciones…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : result.data.length ? <ul className="report-list">{result.data.map(appeal => <AppealCard key={appeal.id} appeal={appeal} onResolved={message => { setNotice(message); retry(); }}/>)}</ul>
      : <div className="empty"><h2>{status === 'pending' ? 'No hay apelaciones pendientes' : 'No hay apelaciones con ese estado'}</h2><p>Cuando alguien apele una advertencia o una sanción, aparece acá.</p></div>}
    {meta?.pages > 1 && <nav className="pagination" aria-label="Páginas de apelaciones">
      {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ ...(status !== 'pending' ? { status } : {}), page: String(page - 1) })}>Anterior</button>}
      <span>Página {meta.page} de {meta.pages}</span>
      {page < meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ ...(status !== 'pending' ? { status } : {}), page: String(page + 1) })}>Siguiente</button>}
    </nav>}
  </div>;
}
