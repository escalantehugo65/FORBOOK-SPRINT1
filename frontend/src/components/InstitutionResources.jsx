import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import { Loading, ErrorMessage } from './Feedback';
import { ExternalIcon } from './Icons';

// Accesos de la institución del estudiante. El backend decide cuáles devuelve según la sesión.
export default function InstitutionResources() {
  const { user } = useAuth();
  const institutionId = user.institutionId;
  const loader = useCallback(signal => catalogService.institutionResources(signal), [institutionId]);
  const { result, loading, error, retry } = useFetch(loader);
  if (loading) return <Loading text="Cargando los accesos de tu institución…"/>;
  if (error) return <ErrorMessage message={error.message} retry={retry}/>;
  const resources = result?.data.resources || [];
  if (!resources.length) return null;
  return <section className="home-section" aria-labelledby="institution-access-title">
    <div className="section-row"><div><p className="eyebrow">Tu vida estudiantil</p><h2 id="institution-access-title">Accesos de tu institución</h2></div><p>{result.data.institution?.name}</p></div>
    <div className="resource-grid">{resources.map(resource => <article className="resource-card" key={resource.id}>
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>
      {resource.availabilityNote && <p className="resource-note">{resource.availabilityNote}</p>}
      {/^https:\/\//i.test(resource.url) && <a className="text-link" href={resource.url} target="_blank" rel="noopener noreferrer">Abrir plataforma <ExternalIcon/><span className="sr-only">: {resource.title} (se abre en una pestaña nueva)</span></a>}
    </article>)}</div>
    <p className="fine-print">Son sitios externos. Usá tus credenciales institucionales allí: Forbook no te las pide.</p>
  </section>;
}
