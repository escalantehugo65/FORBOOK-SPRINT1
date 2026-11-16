import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { communityService, notifyUnreadChanged } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import AuthorLink from '../components/AuthorLink';
import CommunityChat from '../components/CommunityChat';
import CommunityMembers from '../components/CommunityMembers';
import CommunitySettings from '../components/CommunitySettings';
import { communityInitials } from '../components/CommunityCard';
import { ArrowIcon, BellIcon, BellOffIcon, UsersIcon } from '../components/Icons';
import { membersLabel, rankBadges, topicNames } from '../utils/communities';

// Una comunidad: portada, chat general, miembros, reglas y administración.
// La pestaña queda en la dirección: /comunidades/3?ver=miembros
export default function CommunityPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const loader = useCallback(signal => communityService.detail(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  // Tras una acción se vuelve a pedir el detalle sin tapar la página con "Cargando".
  const [fresh, setFresh] = useState(null);
  const community = fresh?.id === Number(id) ? fresh : result?.data;
  const limits = result?.meta.limits;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [leaving, setLeaving] = useState(false);
  usePageTitle(community?.name || 'Comunidad');

  const back = <Link className="back-link" to="/comunidades"><ArrowIcon/>Volver a las comunidades</Link>;
  if (loading && !community) return <div className="container page">{back}<Loading/></div>;
  if (error) return <div className="container page">{back}<ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/></div>;

  const { abilities, membership } = community;
  const banned = membership?.status === 'banned';
  const tabs = [['', 'Chat'], ['miembros', 'Miembros'], ['reglas', 'Reglas'], ...(abilities.canManage ? [['ajustes', 'Administrar']] : [])];
  const inside = abilities.isMember || abilities.canModerate;
  const view = tabs.some(([key]) => key === params.get('ver')) ? params.get('ver') : '';
  const reload = async () => { try { setFresh((await communityService.detail(id)).data); } catch { retry(); } };
  async function run(action) {
    setBusy(true); setFailure(''); setNotice('');
    try { const data = await action(); setNotice(data.message); setLeaving(false); await reload(); notifyUnreadChanged(); }
    catch (problem) { setFailure(problem.message); }
    finally { setBusy(false); }
  }
  const muted = membership?.notifications === 'muted';

  return <div className="container page community-page">
    {back}
    <header className="community-head">
      <div className={`community-cover tone-${community.color}`} aria-hidden="true"><span>{communityInitials(community.name)}</span></div>
      <div className="community-head-main">
        <p className="card-category">{topicNames[community.topic]}{community.kind === 'default' ? ' · Comunidad de Forbook' : ''}</p>
        <h1>{community.name}</h1>
        <p className="community-description">{community.description}</p>
        <p className="community-facts">
          <span className="meta-item"><UsersIcon/>{membersLabel(community.membersCount)}</span>
          {community.owner && <span>Creada por <AuthorLink author={community.owner}/></span>}
          {membership && !banned && <span className={`rank-badge rank-${membership.rank}`}>{rankBadges[membership.rank] || 'Miembro'}</span>}
          {membership?.role && <span className={`role-chip tone-${membership.role.color}`}>{membership.role.name}</span>}
        </p>
      </div>
      <div className="community-head-actions">
        {abilities.isMember ? <>
          <button className="btn btn-outline btn-small" type="button" disabled={busy} aria-pressed={muted} onClick={() => run(() => communityService.notifications(community.id, muted ? 'all' : 'muted'))}>
            {muted ? <><BellOffIcon/>Silenciada</> : <><BellIcon/>Con avisos</>}<span className="sr-only">. {muted ? 'Activar los avisos' : 'Silenciar la comunidad'}</span>
          </button>
          {membership.rank !== 'owner' && (leaving
            ? <><button className="btn btn-outline btn-small btn-danger" type="button" disabled={busy} onClick={() => run(() => communityService.leave(community.id))}>Sí, salir</button><button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setLeaving(false)}>Cancelar</button></>
            : <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setLeaving(true)}>Salir</button>)}
        </> : !banned && <button className="btn btn-primary" type="button" disabled={busy} onClick={() => run(() => communityService.join(community.id))}>{busy ? 'Uniéndote…' : 'Unirme'}</button>}
      </div>
    </header>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {failure && <div className="alert" role="alert"><p>{failure}</p></div>}
    {banned && <div className="alert" role="alert"><p>Te expulsaron de esta comunidad. No podés ver el chat ni volver a entrar, salvo que quienes la administran te lo permitan.</p></div>}

    {inside ? <>
      <nav className="mod-nav" aria-label="Secciones de la comunidad">
        {tabs.map(([key, label]) => <Link key={key} to={key ? `?ver=${key}` : '.'} replace aria-current={view === key ? 'page' : undefined} onClick={() => setNotice('')}>{label}</Link>)}
      </nav>
      {!abilities.isMember && <p className="panel-note">Estás viendo esta comunidad como parte de la moderación de Forbook. Para escribir en el chat, unite.</p>}
      {view === '' && (abilities.isMember
        ? <CommunityChat key={community.id} communityId={community.id} limits={limits}/>
        : <div className="empty"><h2>El chat es para miembros</h2><p>Podés revisar los miembros y borrar mensajes que no correspondan desde cada mensaje una vez adentro.</p><button className="btn btn-primary btn-small" type="button" disabled={busy} onClick={() => run(() => communityService.join(community.id))}>Unirme</button></div>)}
      {view === 'miembros' && <CommunityMembers community={community} onChanged={reload}/>}
      {view === 'reglas' && <section className="community-panel" aria-labelledby="rules-title">
        <h2 id="rules-title">Reglas</h2>
        <ul className="rules-list">
          <li>Tratá a las demás personas con respeto, aunque no estés de acuerdo.</li>
          <li>No compartas datos personales de otras personas (dirección, teléfono, fotos) sin su permiso.</li>
          <li>Nada de ventas engañosas, spam ni contenido que no sea para todo público.</li>
          <li>Si alguien te molesta, podés ocultarlo o bloquearlo desde su perfil.</li>
        </ul>
        {community.rules ? <><h3 className="panel-subtitle">Reglas de esta comunidad</h3><p className="community-rules">{community.rules}</p></> : <p className="panel-note">Esta comunidad no sumó reglas propias.</p>}
      </section>}
      {view === 'ajustes' && abilities.canManage && <CommunitySettings community={community} onChanged={reload}/>}
    </> : !banned && <section className="community-panel community-join" aria-labelledby="join-title">
      <h2 id="join-title">Unite para ver el chat</h2>
      <p>El chat, los miembros y los audios son solo para quienes están en la comunidad. Podés salir cuando quieras.</p>
      {community.rules && <><h3 className="panel-subtitle">Reglas de esta comunidad</h3><p className="community-rules">{community.rules}</p></>}
      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => run(() => communityService.join(community.id))}>{busy ? 'Uniéndote…' : `Unirme a ${community.name}`}</button>
    </section>}
  </div>;
}
