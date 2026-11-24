import { useCallback, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendService } from '../services/friends';
import { profileService } from '../services/profile';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import PersonCard from '../components/PersonCard';
import { ArrowIcon } from '../components/Icons';
import { friendsLabel } from '../utils/friends';

// /usuarios/:id/amigos: los amigos de otra persona. Con cada uno, el botón según mi relación con esa persona.
export default function UserFriendsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const profileLoader = useCallback(signal => profileService.user(id, signal), [id]);
  const friendsLoader = useCallback(signal => friendService.ofUser(id, signal), [id]);
  const profile = useFetch(profileLoader);
  const friends = useFetch(friendsLoader);
  const [changes, setChanges] = useState({});
  const name = profile.result?.data.name;
  usePageTitle(name ? `Amigos de ${name}` : 'Amigos');
  if (String(user.id) === id) return <Navigate to="/amigos" replace/>;
  const back = <Link className="back-link" to={`/usuarios/${id}`}><ArrowIcon/>Volver al perfil</Link>;
  const failure = profile.error || friends.error;
  if (profile.loading || friends.loading) return <div className="container page">{back}<Loading text="Cargando amigos…"/></div>;
  if (failure) return <div className="container page">{back}<ErrorMessage message={failure.message} retry={failure.status === 404 || failure.status === 403 ? null : () => { profile.retry(); friends.retry(); }}/></div>;
  const list = friends.result.data.map(person => (changes[person.id] ? { ...person, relation: changes[person.id] } : person));
  return <div className="container page">
    {back}
    <header className="page-header">
      <p className="eyebrow">Amigos</p>
      <h1>Amigos de {name.split(' ')[0]}.</h1>
      <p className="lead">{name} tiene {friendsLabel(friends.result.meta.total)} en Forbook.</p>
    </header>
    {list.length ? <ul className="person-list">{list.map(person => <PersonCard key={person.id} person={person}
      onRelationChange={(changed, relation) => { if (relation) setChanges(previous => ({ ...previous, [changed.id]: relation })); window.dispatchEvent(new Event('forbook:friends')); }}/>)}</ul>
      : <div className="empty"><h2>Todavía no tiene amigos</h2><p>Podés ser la primera persona: mandale una solicitud desde su perfil.</p></div>}
  </div>;
}
