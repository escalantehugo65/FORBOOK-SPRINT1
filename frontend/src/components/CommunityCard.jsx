import { Link } from 'react-router-dom';
import { UsersIcon, BellOffIcon } from './Icons';
import { membersLabel, rankBadges, topicNames } from '../utils/communities';

// Letras de la portada: las iniciales de las dos primeras palabras ("Personas del Centro" → "PC").
export const communityInitials = name => name.split(/\s+/).filter(word => word.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(word)).slice(0, 2).map(word => word[0]).join('').toUpperCase() || name[0].toUpperCase();

// Tarjeta de una comunidad en la lista: portada de color, de qué se trata, cuánta gente hay y los mensajes sin leer.
export default function CommunityCard({ community }) {
  return <article className={`community-card${community.joined ? ' is-joined' : ''}`}>
    <div className={`community-cover tone-${community.color}`} aria-hidden="true"><span>{communityInitials(community.name)}</span></div>
    <div className="community-card-body">
      <p className="card-category">{topicNames[community.topic]}{community.kind === 'default' ? ' · De Forbook' : ''}</p>
      <h3><Link to={`/comunidades/${community.id}`}>{community.name}</Link></h3>
      <p className="summary">{community.description}</p>
      <div className="card-meta community-meta">
        <span className="meta-item"><UsersIcon/>{membersLabel(community.membersCount)}</span>
        {community.joined && <span className="badge badge-official">{rankBadges[community.rank] || 'Estás adentro'}</span>}
        {community.muted && <span className="meta-item" title="Silenciada"><BellOffIcon/><span className="sr-only">Silenciada</span></span>}
        {community.unread > 0 && <span className="unread-pill">{community.unread > 99 ? '99+' : community.unread}<span className="sr-only"> mensajes sin leer</span></span>}
      </div>
    </div>
  </article>;
}
