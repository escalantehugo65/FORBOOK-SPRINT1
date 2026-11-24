import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService } from '../services/admin';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import NoteAction from '../components/NoteAction';
import Field from '../components/Field';
import { communityKindNames } from '../utils/admin';
import { formatDateTime } from '../utils/moderation';

const statuses = [['open', 'Abiertas'], ['closed', 'Cerradas'], ['all', 'Todas']];

// /admin/comunidades?status=closed&search=centro: todas las comunidades, también las cerradas.
export default function AdminCommunitiesPage() {
  usePageTitle('Comunidades');
  const [params, setParams] = useSearchParams();
  const status = statuses.some(([key]) => key === params.get('status')) ? params.get('status') : 'open';
  const search = params.get('search') || '';
  const page = Number(params.get('page') || '1');
  const [text, setText] = useState(search);
  useEffect(() => { setText(search); }, [search]);
  const loader = useCallback(signal => adminService.communities({ status, search, page }, signal), [status, search, page]);
  const { result, loading, error, retry } = useFetch(loader);
  const [notice, setNotice] = useState('');
  const update = changes => setParams(Object.fromEntries(Object.entries({ status: status === 'open' ? '' : status, search, ...changes, page: changes.page || '' }).filter(([, value]) => value)));
  const done = message => { setNotice(message); retry(); };
  const meta = result?.meta;
  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Administración</p>
      <h1>Comunidades.</h1>
      <p className="lead">Cerrá una comunidad que no cumple las reglas (deja de verse y el chat no se puede abrir) o volvé a abrirla. Las de Forbook solo las cierra la administración.</p>
    </header>
    <ModerationNav/>
    <form className="filter-bar admin-filters" onSubmit={event => { event.preventDefault(); update({ search: text.trim().length >= 2 ? text.trim().slice(0, 80) : '' }); }} noValidate>
      <Field label="Nombre" name="community-search" type="search" value={text} maxLength={80} onChange={event => setText(event.target.value)}/>
      <Field label="Estado" name="community-status" value={status} onChange={event => update({ status: event.target.value === 'open' ? '' : event.target.value })}>
        {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </Field>
      <div className="field"><button className="btn btn-primary" type="submit">Buscar</button></div>
    </form>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {loading ? <Loading text="Cargando comunidades…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : !result.data.length ? <div className="empty"><h2>No hay comunidades con ese filtro</h2><p>Probá con otro nombre o estado.</p></div>
      : <ul className="admin-list">{result.data.map(community => <li className="admin-row" key={community.id}>
        <div className="admin-row-main">
          <p className="card-category">{communityKindNames[community.kind]}{community.owner ? ` · Creada por ${community.owner.name}` : ''}</p>
          <h3>{community.closedAt ? community.name : <Link to={`/comunidades/${community.id}`}>{community.name}</Link>}</h3>
          <div className="admin-badges">
            {community.closedAt ? <span className="badge badge-hidden">Cerrada el {formatDateTime(community.closedAt)}</span> : <span className="badge badge-official">Abierta</span>}
            <span className="card-meta">{community.membersCount} {community.membersCount === 1 ? 'miembro' : 'miembros'} · {community.messages} {community.messages === 1 ? 'mensaje' : 'mensajes'}{community.lastMessageAt ? ` · último el ${formatDateTime(community.lastMessageAt)}` : ''}</span>
          </div>
        </div>
        <div className="admin-buttons">
          {community.closedAt
            ? <NoteAction label="Volver a abrir" confirmLabel="Abrir" action={note => adminService.reopenCommunity(community.id, note)} onDone={done}/>
            : <NoteAction label="Cerrar" confirmLabel="Cerrar la comunidad" danger action={note => adminService.closeCommunity(community.id, note)} onDone={done}/>}
        </div>
      </li>)}</ul>}
    {meta?.pages > 1 && <nav className="pagination" aria-label="Páginas de comunidades">
      {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(page - 1) })}>Anterior</button>}
      <span>Página {meta.page} de {meta.pages}</span>
      {page < meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(page + 1) })}>Siguiente</button>}
    </nav>}
  </div>;
}
