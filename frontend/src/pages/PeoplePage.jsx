import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { profileService } from '../services/profile';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import CommunitiesNav from '../components/CommunitiesNav';
import PersonCard from '../components/PersonCard';
import { SearchIcon } from '../components/Icons';

const nothing = () => Promise.resolve(null);
const notifyFriends = () => window.dispatchEvent(new Event('forbook:friends'));

// /personas?q=ana&page=2: buscar perfiles por nombre y sumar amigos. Sin búsqueda, muestra sugerencias
// (primero de tu institución y tu carrera). La ve cualquier persona con sesión.
export default function PeoplePage() {
  usePageTitle('Personas');
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const page = Number(params.get('page') || '1');
  const ready = query.length >= 2 && query.length <= 80;
  const [text, setText] = useState(query);
  const [hint, setHint] = useState('');
  useEffect(() => { setText(query); }, [query]);

  const searchLoader = useCallback(signal => (ready ? profileService.search({ search: query, page }, signal) : nothing()), [query, ready, page]);
  const suggestedLoader = useCallback(signal => (ready ? nothing() : profileService.suggested(signal)), [ready]);
  const search = useFetch(searchLoader);
  const suggested = useFetch(suggestedLoader);
  // Cambios de amistad hechos en esta página (así una sugerencia aceptada no vuelve a decir «Agregar»).
  const [changes, setChanges] = useState({});
  const withChanges = list => (list || []).map(person => (changes[person.id] ? { ...person, relation: changes[person.id] } : person));
  const changed = (person, relation) => { if (relation) setChanges(previous => ({ ...previous, [person.id]: relation })); notifyFriends(); };

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (value && value.length < 2) { setHint('Escribí al menos 2 letras.'); return; }
    setHint('');
    setParams(value ? { q: value.slice(0, 80) } : {});
  }
  const current = ready ? search : suggested;
  const people = withChanges(current.result?.data);
  const meta = search.result?.meta;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Comunidades</p>
      <h1>Conocé gente en Forbook.</h1>
      <p className="lead">Buscá a otras personas por su nombre, mirá su perfil y mandales una solicitud de amistad. Cuando la aceptan, quedan como amigos.</p>
    </header>
    <CommunitiesNav/>
    <form className="search-form" role="search" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor="people-search">Buscar personas por nombre</label>
      <div className="search-box">
        <SearchIcon/>
        <input id="people-search" type="search" value={text} maxLength={80} autoComplete="off" enterKeyHint="search" placeholder="Nombre de la persona…"
          onChange={event => { setText(event.target.value); setHint(''); if (!event.target.value && query) setParams({}); }} aria-invalid={!!hint} aria-describedby={hint ? 'people-search-hint' : undefined}/>
        <button className="btn btn-primary" type="submit">Buscar</button>
      </div>
      {hint && <small id="people-search-hint" className="field-error">{hint}</small>}
    </form>

    <section className="people-section" aria-labelledby="people-title">
      <div className="results-head">
        <h2 id="people-title">{ready ? `Personas con «${query}»` : 'Personas que quizás conozcas'}</h2>
        {ready && meta && <span className="results-count" role="status">{meta.total} {meta.total === 1 ? 'persona' : 'personas'}</span>}
      </div>
      {current.loading ? <Loading text={ready ? 'Buscando…' : 'Buscando sugerencias…'}/>
        : current.error ? <ErrorMessage message={current.error.message} retry={current.retry}/>
        : people.length ? <ul className="person-list">{people.map(person => <PersonCard key={person.id} person={person} query={ready ? query : ''}
          note={!ready && person.sameInstitution ? 'Estudia en tu institución' : null} onRelationChange={changed}/>)}</ul>
        : <div className="empty">
          <h2>{ready ? `No encontramos a nadie con «${query}»` : 'Todavía no hay sugerencias'}</h2>
          <p>{ready ? 'Revisá cómo lo escribiste: buscamos por nombre, sin importar tildes ni mayúsculas.' : 'Ya mandaste solicitud a todas las personas que te podríamos sugerir. Buscá por nombre para encontrar a alguien más.'}</p>
        </div>}
      {ready && meta?.pages > 1 && <nav className="pagination" aria-label="Páginas de personas">
        {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ q: query, ...(page > 2 ? { page: String(page - 1) } : {}) })}>Anterior</button>}
        <span>Página {meta.page} de {meta.pages}</span>
        {page < meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ q: query, page: String(page + 1) })}>Siguiente</button>}
      </nav>}
    </section>
    <p className="note">Tu correo nunca se muestra. Si alguien te molesta, podés ocultarlo o bloquearlo desde su perfil: al bloquear, también deja de ser tu amigo.</p>
  </div>;
}
