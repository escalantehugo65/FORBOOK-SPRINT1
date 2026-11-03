import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import { Loading, ErrorMessage } from './Feedback';
import './InstitutionResources.css';

export default function InstitutionResources() {
  const { user } = useAuth();
  const institutionId = user.institutionId;
  const loader = useCallback(signal => catalogService.institutionResources(signal), [institutionId]);
  const { result, loading, error, retry } = useFetch(loader);
  if (loading) return <Loading text="Cargando los accesos de tu institución…"/>;
  if (error) return <ErrorMessage message={error.message} retry={retry}/>;
  const resources = result?.data.resources || [];
  if (!resources.length) return null;
  return <section className="institution-section" aria-labelledby="institution-access-title">
    <div className="institution-section-heading"><span className="eyebrow">TU VIDA ESTUDIANTIL</span><h2 id="institution-access-title">Accesos de tu institución</h2><p>{result.data.institution?.name}</p></div>
    <div className="institution-resource-grid">{resources.map(resource => <article className="institution-resource" key={resource.id}>
      <h3>{resource.title}</h3><p>{resource.description}</p>
      {resource.availabilityNote && <p className="institution-availability">{resource.availabilityNote}</p>}
      {/^https:\/\//i.test(resource.url) && <a className="quiet-link" href={resource.url} target="_blank" rel="noopener noreferrer">Abrir plataforma <span aria-hidden="true">↗</span><span className="sr-only">: {resource.title} (abre una pestaña nueva)</span></a>}
    </article>)}</div>
    <p className="institution-external-note">Son sitios externos. Usá tus credenciales institucionales allí; Forbook no te las solicita.</p>
  </section>;
}
