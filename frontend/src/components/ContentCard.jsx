import { Link } from 'react-router-dom';
export const sourceNames = { official: 'Información oficial', community: 'Aporte comunitario', experience: 'Experiencia personal' };
export function formatDate(date) { return date ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`)) : 'Sin fecha de revisión'; }
export default function ContentCard({ content }) {
  return <article className="content-card"><div className="card-top"><span className="eyebrow">{content.category?.name}</span><span className="card-arrow" aria-hidden="true">↗</span></div>
    <h2><Link to={`/conozcamos/${content.id}`}>{content.title}</Link></h2><p>{content.summary}</p>
    <div className="card-meta"><span className="source-tag">{sourceNames[content.sourceType]}</span><small>{formatDate(content.reviewedAt)}</small></div></article>;
}
