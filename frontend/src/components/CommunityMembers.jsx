import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { communityService } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage } from './Feedback';
import Avatar from './Avatar';
import DecoratedName from './DecoratedName';
import { rankBadges, rankNames } from '../utils/communities';

// Una persona de la comunidad, con las acciones que le corresponden a quien mira.
function MemberRow({ community, member, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const canEdit = community.abilities.canEdit;
  // Quien administra también puede ponerse un rol a sí mismo.
  const canSetRole = member.manageable || (member.own && community.abilities.canManage && community.abilities.isMember);
  async function run(action) {
    setBusy(true); setError('');
    try { const result = await action(); onChanged(result.message); } catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); setBusy(false); setConfirming(false); }
  }
  return <li className="member-row">
    <Link className="member-person" to={`/usuarios/${member.userId}`}>
      <Avatar person={{ id: member.userId, ...member }}/>
      <span>
        <DecoratedName name={member.name} color={member.decorations?.nameColor}/>{member.own && <span className="member-you"> (vos)</span>}
        <small>{rankNames[member.rank]}</small>
      </span>
    </Link>
    <div className="member-tags">
      {rankBadges[member.rank] && <span className={`rank-badge rank-${member.rank}`}>{rankBadges[member.rank]}</span>}
      {member.role && <span className={`role-chip tone-${member.role.color}`}>{member.role.name}</span>}
    </div>
    {(canSetRole || member.manageable) && <div className="member-actions">
      {canSetRole && community.roles.length > 0 && <div className="field member-role">
        <label htmlFor={`role-${member.userId}`} className="sr-only">Rol de {member.name}</label>
        <select id={`role-${member.userId}`} value={member.role?.id ?? ''} disabled={busy} onChange={event => run(() => communityService.updateMember(community.id, member.userId, { roleId: event.target.value ? Number(event.target.value) : null }))}>
          <option value="">Sin rol</option>
          {community.roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
      </div>}
      {member.manageable && canEdit && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => run(() => communityService.updateMember(community.id, member.userId, { rank: member.rank === 'admin' ? 'member' : 'admin' }))}>
        {member.rank === 'admin' ? 'Quitar administrador' : 'Hacer administrador'}<span className="sr-only"> a {member.name}</span>
      </button>}
      {member.manageable && (confirming
        ? <><button className="btn btn-outline btn-small btn-danger" type="button" disabled={busy} onClick={() => run(() => communityService.ban(community.id, member.userId))}>{busy ? 'Expulsando…' : 'Sí, expulsar'}</button><button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</button></>
        : <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setConfirming(true)}>Expulsar<span className="sr-only"> a {member.name}</span></button>)}
    </div>}
    {confirming && <p className="member-note">{member.name} sale de la comunidad y no puede volver a entrar hasta que se lo permitan desde Administrar.</p>}
    {error && <p className="field-error member-note" role="alert">{error}</p>}
  </li>;
}

// Miembros de la comunidad: primero quien la creó, después quienes administran y el resto por nombre.
export default function CommunityMembers({ community, onChanged }) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('pagina'), 10) || 1);
  const search = params.get('persona') || '';
  const [text, setText] = useState(search);
  const [notice, setNotice] = useState('');
  useEffect(() => { setText(search); }, [search]);
  const loader = useCallback(signal => communityService.members(community.id, { search, page }, signal), [community.id, search, page]);
  const { result, loading, error, retry } = useFetch(loader);
  const go = next => setParams(Object.fromEntries(Object.entries({ ver: 'miembros', persona: search, pagina: page > 1 ? String(page) : '', ...next }).filter(([, value]) => value)), { replace: true });
  function submit(event) { event.preventDefault(); const clean = text.trim(); if (clean.length !== 1) go({ persona: clean, pagina: '' }); }
  function changed(message) { setNotice(message); retry(); onChanged(); }

  return <section className="community-panel" aria-labelledby="members-title">
    <div className="panel-head">
      <h2 id="members-title">Miembros</h2>
      <form className="member-search" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="member-search">Buscar a una persona</label>
        <input id="member-search" type="search" value={text} maxLength={80} placeholder="Buscar por nombre" onChange={event => setText(event.target.value)}/>
        <button className="btn btn-outline btn-small" type="submit">Buscar</button>
      </form>
    </div>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {loading ? <Loading text="Cargando miembros…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : result.data.length ? <>
        <ul className="member-list">{result.data.map(member => <MemberRow key={member.userId} community={community} member={member} onChanged={changed}/>)}</ul>
        {result.meta.pages > 1 && <nav className="pagination" aria-label="Páginas de miembros">
          {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => go({ pagina: page > 2 ? String(page - 1) : '' })}>Anterior</button>}
          <span>Página {page} de {result.meta.pages}</span>
          {page < result.meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => go({ pagina: String(page + 1) })}>Siguiente</button>}
        </nav>}
      </>
      : <div className="empty"><h3>{search ? `No hay nadie con «${search}»` : 'Todavía no hay miembros'}</h3>{search && <button className="btn btn-outline btn-small" type="button" onClick={() => go({ persona: '', pagina: '' })}>Ver a todos</button>}</div>}
  </section>;
}
