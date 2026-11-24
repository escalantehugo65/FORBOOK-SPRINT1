import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import LevelBadge from './LevelBadge';
import FriendButton from './FriendButton';
import { splitMatches } from '../utils/search';

// Texto con lo buscado resaltado (sin importar mayúsculas ni tildes, igual que la búsqueda).
export function Highlight({ text, query = '', className }) {
  return <span className={className}>{splitMatches(text, query).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : part.text)}</span>;
}

// Tarjeta de una persona: foto, nombre, institución y carrera, nivel y el botón de amistad.
// relation: la relación de amistad que manda el backend (si no viene, no se muestra el botón).
export default function PersonCard({ person, query = '', note, onRelationChange, children }) {
  const nameColor = person.decorations?.nameColor;
  return <li className="person-card">
    <Avatar person={person} size="large"/>
    <div className="person-info">
      <Link className="person-name" to={`/usuarios/${person.id}`}>
        <Highlight text={person.name} query={query} className={nameColor ? `name-color name-${nameColor}` : undefined}/>
      </Link>
      <p>{[person.institution?.name, person.career].filter(Boolean).join(' · ') || 'Estudiante en Forbook'}</p>
      {note && <p className="person-note">{note}</p>}
    </div>
    <div className="person-side">
      <LevelBadge level={person.level}/>
      {person.relation && person.relation !== 'self' && <FriendButton key={person.relation} person={person} relation={person.relation} compact onChange={relation => onRelationChange?.(person, relation)}/>}
      {children}
    </div>
  </li>;
}
