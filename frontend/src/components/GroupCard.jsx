import { Link } from 'react-router-dom';
import { groupKinds, groupReasons } from '../utils/places';

export default function GroupCard({ group }) {
  return <article className="content-card">
    <p className="card-category">{groupKinds[group.kind]}{group.institution ? ` · ${group.institution.name}` : ''}</p>
    <h3><Link to={`/espacios/${group.id}`}>{group.name}</Link></h3>
    <p className="summary">{group.summary}</p>
    {group.reasons.length > 0 && <p className="card-meta">Sugerido por {group.reasons.map(reason => groupReasons[reason]).join(' y ')}</p>}
  </article>;
}
