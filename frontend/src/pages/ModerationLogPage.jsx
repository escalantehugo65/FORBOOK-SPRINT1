import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { moderationService } from '../services/moderation';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import { actionNames, formatDateTime, targetNames } from '../utils/moderation';

// Historial interno de moderación (FF-38). Solo lo ve administración.
export default function ModerationLogPage() {
  usePageTitle('Historial de moderación');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || '1');
  const loader = useCallback(signal => moderationService.log(page, signal), [page]);
  const { result, loading, error, retry } = useFetch(loader);

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Moderación</p>
      <h1>Historial de decisiones.</h1>
      <p className="lead">Cada decisión sobre un reporte y cada cambio en categorías o fuentes queda registrado acá, con quién lo hizo y por qué.</p>
    </header>
    <ModerationNav/>
    {loading ? <Loading text="Cargando el historial…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : result.data.length ? <>
        <div className="table-wrap">
          <table className="log-table">
            <caption className="sr-only">Acciones de moderación, de la más nueva a la más vieja</caption>
            <thead><tr><th scope="col">Fecha</th><th scope="col">Quién</th><th scope="col">Acción</th><th scope="col">Sobre</th><th scope="col">Motivo</th></tr></thead>
            <tbody>{result.data.map(entry => <tr key={entry.id}>
              <td>{formatDateTime(entry.createdAt)}</td>
              <td>{entry.moderator.name}</td>
              <td><strong>{actionNames[entry.action]}</strong>{entry.reportId ? <small>Reporte n.º {entry.reportId}</small> : null}</td>
              <td>{targetNames[entry.target.type]}: {entry.target.link ? <Link to={entry.target.link}>{entry.target.title}</Link> : entry.target.title}{entry.target.hidden ? <small>Oculto</small> : null}</td>
              <td>{entry.note}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {result.meta.pages > 1 && <nav className="pagination" aria-label="Páginas">
          {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ page: String(page - 1) })}>Anterior</button>}
          <span>Página {result.meta.page} de {result.meta.pages}</span>
          {page < result.meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ page: String(page + 1) })}>Siguiente</button>}
        </nav>}
      </>
      : <div className="empty"><h2>Todavía no hay acciones registradas</h2><p>Cuando alguien resuelva un reporte o cambie el catálogo, va a aparecer acá.</p></div>}
  </div>;
}
