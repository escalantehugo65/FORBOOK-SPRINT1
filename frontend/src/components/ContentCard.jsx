import { Link } from 'react-router-dom';
import AuthorLink from './AuthorLink';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';

// Tarjeta de una ficha: toda la tarjeta lleva al detalle a través del enlace del título.
// FF-20: la etiqueta dice qué tipo de información es y, debajo, quién la publica o quién la cuenta.
// Si la creó un estudiante, se ve «Creada por» con el enlace a su perfil.
export default function ContentCard({ content, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  const reviewed = formatDate(content.reviewedAt);
  const origin = content.author ? null : content.sourceType === 'experience'
    ? content.authorLabel && `Contado por ${content.authorLabel}`
    : content.sourceLabel && `Fuente: ${content.sourceLabel}`;
  return <article className="content-card">
    <p className="card-category">{content.category?.name}{content.institution ? ' · Tu institución' : ''}</p>
    <Heading><Link to={`/conozcamos/${content.id}`}>{content.title}</Link></Heading>
    <p className="summary">{content.summary}</p>
    <div className="card-meta">
      <span className={sourceBadge[content.sourceType]}>{sourceNames[content.sourceType]}</span>
      {content.own && <span className="badge own-badge">Tu ficha</span>}
      <span>{reviewed ? `${content.author ? 'Actualizada' : 'Revisada'} el ${reviewed}` : 'Sin fecha de revisión'}</span>
      {content.author && <span className="card-origin card-author">Creada por <AuthorLink author={content.author}/></span>}
      {origin && <span className="card-origin">{origin}</span>}
    </div>
  </article>;
}
