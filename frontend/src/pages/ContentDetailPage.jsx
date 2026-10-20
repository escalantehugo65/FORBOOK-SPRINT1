import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import { Loading, ErrorMessage } from '../components/Feedback';
import { sourceNames, formatDate } from '../components/ContentCard';

export default function ContentDetailPage() {
  const { id } = useParams();
  const loader = useCallback(signal => catalogService.detail(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  if (loading) return <div className="container section"><Loading/></div>;
  if (error) return <div className="container section"><Link className="back-link" to="/conozcamos">← Conozcamos Formosa</Link>{error.status === 404 ? <><h1>No encontramos este contenido.</h1><p>Puede que ya no esté publicado.</p></> : <ErrorMessage message={error.message} retry={retry}/>}</div>;
  const content = result.data;
  const url = /^https?:\/\//i.test(content.sourceUrl || '') ? content.sourceUrl : null;
  return <article className="container section detail"><Link className="back-link" to={`/conozcamos?categoryId=${content.categoryId}`}>← Conozcamos Formosa</Link><div className="detail-heading"><span className="eyebrow">{content.category.name}</span><h1>{content.title}</h1><p>{content.summary}</p></div>
    <div className="detail-grid"><div className="article-body">{content.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><aside className="source-panel"><span className="eyebrow">EL ORIGEN IMPORTA</span><h2>Sobre esta información</h2><dl><div><dt>Tipo de información</dt><dd><span className="source-tag">{sourceNames[content.sourceType]}</span></dd></div><div><dt>Fuente</dt><dd>{content.sourceLabel || 'Sin referencia disponible'}</dd></div>{content.authorLabel && <div><dt>Autoría</dt><dd>{content.authorLabel}</dd></div>}<div><dt>Revisión de la ficha</dt><dd>{formatDate(content.reviewedAt)}</dd></div><div><dt>Institución relacionada</dt><dd>{content.institution?.name || 'Información general'}</dd></div></dl>
      {url && <a className="quiet-link" href={url} target="_blank" rel="noopener noreferrer">Consultar fuente <span aria-hidden="true">↗</span><span className="sr-only"> (abre otra pestaña)</span></a>}
      <p className="source-note">{content.sourceType === 'experience' ? 'Esta ficha expresa una experiencia personal, no un hecho oficial.' : content.sourceType === 'community' ? 'Este aporte comunitario debe interpretarse según su fuente y revisión.' : 'Consultá la fuente original para confirmar información que pueda cambiar.'}</p></aside></div></article>;
}
