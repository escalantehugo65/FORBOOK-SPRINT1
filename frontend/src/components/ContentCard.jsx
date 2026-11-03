import { Link } from 'react-router-dom';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';

// Tarjeta de una ficha: toda la tarjeta lleva al detalle a través del enlace del título.
export default function ContentCard({ content, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  const reviewed = formatDate(content.reviewedAt);
  return <article className="content-card">
    <p className="card-category">{content.category?.name}{content.institution ? ' · Tu institución' : ''}</p>
    <Heading><Link to={`/conozcamos/${content.id}`}>{content.title}</Link></Heading>
    <p className="summary">{content.summary}</p>
    <div className="card-meta"><span className={sourceBadge[content.sourceType]}>{sourceNames[content.sourceType]}</span><span>{reviewed ? `Revisada el ${reviewed}` : 'Sin fecha de revisión'}</span></div>
  </article>;
}
