import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { friendService } from '../services/friends';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import CommunitiesNav from '../components/CommunitiesNav';
import PersonCard from '../components/PersonCard';
import { SearchIcon } from '../components/Icons';
import { friendsLabel } from '../utils/friends';
import { formatDate } from '../utils/content';

const tabs = [['', 'Amigos'], ['solicitudes', 'Solicitudes'], ['enviadas', 'Enviadas']];
const notifyFriends = () => window.dispatchEvent(new Event('forbook:friends'));

// /amigos: mis amigos, las solicitudes que me mandaron y las que mandé (?ver=solicitudes / ?ver=enviadas).
export default function FriendsPage() {
  usePageTitle('Amigos');
  const [params, setParams] = useSearchParams();
  const view = tabs.some(([key]) => key === params.get('ver')) ? params.get('ver') : '';
  const search = (params.get('q') || '').trim();
  const [text, setText] = useState(search);
  useEffect(() => { setText(search); }, [search]);
  const friendsLoader = useCallback(signal => friendService.list(search, signal), [search]);
  const requestsLoader = useCallback(signal => friendService.requests(signal), []);
  const friends = useFetch(friendsLoader);
  const requests = useFetch(requestsLoader);
  // Lo que se cambia acá se refleja sin recargar: quien se acepta pasa a «Amigos» y desaparece de «Solicitudes».
  const [changes, setChanges] = useState({});
  const changed = (person, relation) => {
    if (relation) setChanges(previous => ({ ...previous, [person.id]: { ...person, relation } }));
    else { friends.retry(); requests.retry(); }
    notifyFriends();
  };
  const current = person => (changes[person.id] ? { ...person, relation: changes[person.id].relation } : person);
  const received = (requests.result?.data.received || []).map(current).filter(person => person.relation === 'received');
  const sent = (requests.result?.data.sent || []).map(current).filter(person => person.relation === 'sent');
  const loaded = friends.result?.data || [];
  const isLoaded = person => loaded.some(friend => friend.id === person.id);
  const accepted = Object.values(changes).filter(person => person.relation === 'friends' && !isLoaded(person));
  const removed = Object.values(changes).filter(person => person.relation !== 'friends' && isLoaded(person));
  const friendList = [...loaded, ...(search ? [] : accepted)].map(current).filter(person => person.relation === 'friends');
  const total = (friends.result?.meta.total ?? 0) + accepted.length - removed.length;

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    setParams(value.length >= 2 ? { q: value.slice(0, 80) } : {});
  }
  const counts = { '': friends.result ? total : undefined, solicitudes: requests.result ? received.length : undefined, enviadas: requests.result ? sent.length : undefined };

  let body;
  if (view === '') {
    body = friends.loading ? <Loading text="Cargando tus amigos…"/>
      : friends.error ? <ErrorMessage message={friends.error.message} retry={friends.retry}/>
      : <>
        <form className="search-form" role="search" onSubmit={submit} noValidate>
          <label className="sr-only" htmlFor="friends-search">Buscar entre tus amigos</label>
          <div className="search-box"><SearchIcon/>
            <input id="friends-search" type="search" value={text} maxLength={80} placeholder="Buscar entre tus amigos…" onChange={event => { setText(event.target.value); if (!event.target.value && search) setParams({}); }}/>
            <button className="btn btn-primary btn-small" type="submit">Buscar</button>
          </div>
        </form>
        {friendList.length ? <ul className="person-list">{friendList.map(person => <PersonCard key={person.id} person={person} onRelationChange={changed}/>)}</ul>
          : <div className="empty">
            <h2>{search ? `No tenés amigos con «${search}»` : 'Todavía no tenés amigos en Forbook'}</h2>
            <p>{search ? 'Probá con otro nombre.' : 'Buscá a tus compañeros o mirá las sugerencias: cuando acepten tu solicitud, aparecen acá.'}</p>
            {!search && <Link className="btn btn-primary" to="/personas">Buscar personas</Link>}
          </div>}
      </>;
  } else {
    const list = view === 'solicitudes' ? received : sent;
    body = requests.loading ? <Loading text="Cargando solicitudes…"/>
      : requests.error ? <ErrorMessage message={requests.error.message} retry={requests.retry}/>
      : list.length ? <ul className="person-list">{list.map(person => <PersonCard key={person.id} person={person} onRelationChange={changed}
        note={person.since ? `${view === 'solicitudes' ? 'Te la mandó' : 'La mandaste'} el ${formatDate(person.since)}` : null}/>)}</ul>
      : <div className="empty">
        <h2>{view === 'solicitudes' ? 'No tenés solicitudes nuevas' : 'No tenés solicitudes enviadas sin responder'}</h2>
        <p>{view === 'solicitudes' ? 'Cuando alguien te mande una solicitud de amistad, la vas a ver acá y en el menú de tu cuenta.' : 'Las solicitudes que mandes aparecen acá hasta que la otra persona las acepte o las rechace.'}</p>
        <Link className="btn btn-outline" to="/personas">Buscar personas</Link>
      </div>;
  }

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Comunidades</p>
      <h1>Tus amigos.</h1>
      <p className="lead">{friends.result ? `Tenés ${friendsLabel(total)}.` : 'Tus amigos y tus solicitudes de amistad.'} Mandá solicitudes desde el perfil de cada persona o desde <Link to="/personas">Personas</Link>.</p>
    </header>
    <CommunitiesNav requests={counts.solicitudes ?? 0}/>
    <nav className="mod-nav search-tabs" aria-label="Amigos y solicitudes">
      {tabs.map(([key, label]) => <Link key={key || 'amigos'} to={key ? `/amigos?ver=${key}` : '/amigos'} aria-current={view === key ? 'page' : undefined}>
        {label}{counts[key] !== undefined && <span className="tab-count">{counts[key]}</span>}
      </Link>)}
    </nav>
    {body}
  </div>;
}
