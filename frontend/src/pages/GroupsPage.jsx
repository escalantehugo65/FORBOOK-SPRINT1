import { useCallback } from 'react';
import { groupService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import GroupCard from '../components/GroupCard';

// Espacios de integración sugeridos (FF-30). No hay chat privado entre desconocidos:
// cada espacio lleva a una sección pública de Forbook.
export default function GroupsPage() {
  usePageTitle('Espacios de integración');
  const loader = useCallback(signal => groupService.suggestions(signal), []);
  const { result, loading, error, retry } = useFetch(loader);

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Espacios</p>
      <h1>Una primera puerta para conocer gente.</h1>
      <p className="lead">Espacios pensados según tu institución, de dónde venís y si ya llegaste a Formosa.</p>
    </header>
    {loading ? <Loading text="Buscando espacios para vos…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : <>
        <section className="home-section first" aria-labelledby="specific-title">
          <div className="section-row"><div><h2 id="specific-title">Sugeridos para vos</h2></div></div>
          {result.data.specific.length
            ? <div className="content-grid">{result.data.specific.map(group => <GroupCard key={group.id} group={group}/>)}</div>
            : <EmptyState title="Todavía no hay espacios específicos para tu perfil" headingLevel={3}>{result.data.general.length ? 'Mientras tanto, abajo tenés los espacios generales, abiertos a todos.' : undefined}</EmptyState>}
        </section>
        {result.data.general.length > 0 && <section className="home-section" aria-labelledby="general-title">
          <div className="section-row"><div><h2 id="general-title">Para todos</h2></div></div>
          <div className="content-grid">{result.data.general.map(group => <GroupCard key={group.id} group={group}/>)}</div>
        </section>}
      </>}
    <p className="note">Forbook no tiene chat privado: todo lo que se comparte en estos espacios es público.</p>
  </div>;
}
