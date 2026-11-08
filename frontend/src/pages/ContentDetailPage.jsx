import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { catalogService } from '../services/catalog';
import { Loading, ErrorMessage } from '../components/Feedback';
import { ArrowIcon, ExternalIcon } from '../components/Icons';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';
import ReportAction from '../components/ReportAction';

const sourceNotes = {
  official: 'Consultá la fuente original para confirmar datos que pueden cambiar, como fechas o requisitos.',
  community: 'Es un aporte de la comunidad: comprobalo con la referencia indicada.',
  experience: 'Cuenta la experiencia de una persona. Sirve para orientarte, pero no es un dato oficial.',
};

// Detalle de una ficha con su fuente, tipo de información y fecha de revisión (FF-19).
export default function ContentDetailPage() {
  const { id } = useParams();
  const loader = useCallback(signal => catalogService.detail(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const content = result?.data;
  usePageTitle(content?.title || (error?.status === 404 ? 'Ficha no encontrada' : 'Conozcamos Formosa'));
  const back = <Link className="back-link" to={content ? `/conozcamos?categoryId=${content.categoryId}` : '/conozcamos'}><ArrowIcon/>Volver a Conozcamos Formosa</Link>;

  if (loading) return <div className="container page"><Loading/></div>;
  if (error) return <div className="container page">{back}{error.status === 404
    ? <div className="detail-head"><h1>No encontramos esta ficha.</h1><p className="detail-summary">Puede que ya no esté publicada o que no corresponda a tu institución.</p></div>
    : <ErrorMessage message={error.message} retry={retry}/>}</div>;

  const url = /^https?:\/\//i.test(content.sourceUrl || '') ? content.sourceUrl : null;
  const reviewed = formatDate(content.reviewedAt);
  return <article className="container page">
    {back}
    <header className="detail-head">
      <p className="eyebrow">{content.category.name}</p>
      <h1>{content.title}</h1>
      <p className="detail-summary">{content.summary}</p>
    </header>
    <div className="detail-grid">
      <div className="article-body">{content.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <aside className="source-panel" aria-labelledby="source-title">
        <h2 id="source-title">Sobre esta información</h2>
        <dl className="source-list">
          <div><dt>Tipo de información</dt><dd><span className={sourceBadge[content.sourceType]}>{sourceNames[content.sourceType]}</span></dd></div>
          <div><dt>Fuente</dt><dd>{content.sourceLabel || 'Sin referencia disponible'}</dd></div>
          {content.authorLabel && <div><dt>Autoría</dt><dd>{content.authorLabel}</dd></div>}
          <div><dt>Revisión de la ficha</dt><dd>{reviewed || 'Sin fecha de revisión'}</dd></div>
          <div><dt>Institución relacionada</dt><dd>{content.institution?.name || 'Información general'}</dd></div>
        </dl>
        {url && <a className="btn btn-primary btn-small" href={url} target="_blank" rel="noopener noreferrer">Consultar la fuente <ExternalIcon/><span className="sr-only"> (se abre en una pestaña nueva)</span></a>}
        <p className="source-note">{sourceNotes[content.sourceType]}</p>
        {/* FF-35 y FF-34: el aviso no cambia la ficha; la fecha de revisión sigue visible arriba. */}
        <div className="source-actions">
          <ReportAction targetType="content" targetId={content.id} label="Avisar que puede estar desactualizada" reasons={['outdated']} detailsLabel="¿Qué dato cambió? (opcional)"/>
          <ReportAction targetType="content" targetId={content.id} label="Reportar un problema" reasons={['false', 'offensive', 'other']}/>
        </div>
      </aside>
    </div>
  </article>;
}
