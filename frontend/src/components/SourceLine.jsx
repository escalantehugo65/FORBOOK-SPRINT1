import { sourceNames, sourceBadge, formatDate } from '../utils/content';

// Tipo de fuente, fecha de revisión y enlace a la fuente, igual en lugares y rutas.
export default function SourceLine({ item }) {
  return <>
    <div className="card-meta">
      <span className={sourceBadge[item.sourceType]}>{sourceNames[item.sourceType]}</span>
      <span>{item.reviewedAt ? `Revisado el ${formatDate(item.reviewedAt)}` : 'Sin fecha de revisión'}</span>
    </div>
    {item.sourceUrl
      ? <a className="place-source" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceLabel || 'Ver la fuente'}<span className="sr-only"> (se abre en otra pestaña)</span></a>
      : item.sourceLabel && <p className="place-source">{item.sourceLabel}</p>}
  </>;
}
