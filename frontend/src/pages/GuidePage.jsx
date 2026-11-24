import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ContentCard from '../components/ContentCard';

// /guia: «Cómo vivir en Formosa». Temas armados con fichas de Conozcamos Formosa; cada ficha mantiene su fuente.
export default function GuidePage() {
  usePageTitle('Cómo vivir en Formosa');
  const loader = useCallback(signal => catalogService.guide(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const sections = result?.data || [];
  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Guía</p>
      <h1>Cómo vivir en Formosa.</h1>
      <p className="lead">Lo que conviene saber desde el primer día, ordenado por tema: seguridad, salud y clima, comida, plata y trámites, y costumbres. Cada ficha dice de dónde sale la información.</p>
    </header>
    {loading ? <Loading text="Cargando la guía…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : !sections.length ? <div className="empty"><h2>La guía está vacía</h2><p>Cuando haya fichas de estos temas, van a aparecer acá. Mientras tanto, mirá <Link to="/conozcamos">Conozcamos Formosa</Link>.</p></div>
      : <>
        <nav aria-label="Temas de la guía"><ul className="guide-index">{sections.map(section => <li key={section.key}><a className="chip" href={`#guia-${section.key}`}>{section.title}</a></li>)}</ul></nav>
        {sections.map(section => <section key={section.key} id={`guia-${section.key}`} className="guide-section" aria-labelledby={`guia-${section.key}-title`}>
          <div className="results-head"><h2 id={`guia-${section.key}-title`}>{section.title}</h2><span className="results-count">{section.contents.length === 1 ? '1 ficha' : `${section.contents.length} fichas`}</span></div>
          {section.intro && <p>{section.intro}</p>}
          <div className="content-grid">{section.contents.map(content => <ContentCard key={content.id} content={content} headingLevel={3}/>)}</div>
        </section>)}
      </>}
    <p className="note">¿Falta algo? <Link to="/conozcamos/nueva">Creá una ficha</Link> con lo que sabés o preguntalo en <Link to="/preguntas">Preguntas</Link>.</p>
  </div>;
}
