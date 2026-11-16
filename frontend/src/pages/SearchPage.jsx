import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { profileService } from '../services/profile';
import { catalogService } from '../services/catalog';
import { questionService } from '../services/questions';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Avatar from '../components/Avatar';
import ContentCard from '../components/ContentCard';
import QuestionCard from '../components/QuestionCard';
import LevelBadge from '../components/LevelBadge';
import { SearchIcon } from '../components/Icons';
import { splitMatches } from '../utils/search';

const tabs = [['personas', 'Personas'], ['fichas', 'Fichas'], ['preguntas', 'Preguntas']];
const nothing = () => Promise.resolve(null);

// Texto con lo buscado resaltado (sin importar mayúsculas ni tildes, igual que la búsqueda).
function Highlight({ text, query, className }) {
  return <span className={className}>{splitMatches(text, query).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : part.text)}</span>;
}

function PersonCard({ person, query }) {
  const nameColor = person.decorations?.nameColor;
  return <li className="person-card">
    <Avatar person={person} size="large"/>
    <div className="person-info">
      <Link className="person-name" to={`/usuarios/${person.id}`}>
        <Highlight text={person.name} query={query} className={nameColor ? `name-color name-${nameColor}` : undefined}/>
      </Link>
      <p>{[person.institution?.name, person.career].filter(Boolean).join(' · ')}</p>
    </div>
    <LevelBadge level={person.level}/>
  </li>;
}

function Pagination({ meta, page, onChange, label }) {
  if (!meta || meta.pages <= 1) return null;
  return <nav className="pagination" aria-label={label}>
    {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => onChange(page - 1)}>Anterior</button>}
    <span>Página {meta.page} de {meta.pages}</span>
    {page < meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => onChange(page + 1)}>Siguiente</button>}
  </nav>;
}

// Buscar personas, fichas de Conozcamos Formosa y preguntas: /buscar?q=sube&tab=fichas&page=2
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const tabParam = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : '';
  const page = Number(params.get('page') || '1');
  const ready = query.length >= 2 && query.length <= 80;
  usePageTitle(ready ? `Buscar «${query}»` : 'Buscar');
  const [text, setText] = useState(query);
  const [hint, setHint] = useState('');
  useEffect(() => { setText(query); }, [query]);

  // Las tres búsquedas van juntas, así cada pestaña muestra cuántos resultados tiene.
  // La página solo cambia la de la pestaña abierta.
  const peoplePage = tabParam === 'personas' ? page : 1;
  const contentPage = tabParam === 'fichas' ? page : 1;
  const questionPage = tabParam === 'preguntas' ? page : 1;
  const peopleLoader = useCallback(signal => ready ? profileService.search({ search: query, page: peoplePage }, signal) : nothing(), [query, ready, peoplePage]);
  const contentLoader = useCallback(signal => ready ? catalogService.contents({ search: query, page: contentPage }, signal) : nothing(), [query, ready, contentPage]);
  const questionLoader = useCallback(signal => ready ? questionService.list({ search: query, page: questionPage }, signal) : nothing(), [query, ready, questionPage]);
  const results = { personas: useFetch(peopleLoader), fichas: useFetch(contentLoader), preguntas: useFetch(questionLoader) };

  // Sin pestaña elegida, se abre la primera que tenga resultados.
  const totals = Object.fromEntries(tabs.map(([key]) => [key, results[key].result?.meta.total]));
  const allLoaded = tabs.every(([key]) => !results[key].loading);
  const firstWithResults = tabs.find(([key]) => totals[key] > 0)?.[0];
  const active = tabParam || (allLoaded && firstWithResults) || 'personas';
  const current = results[active];

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (value.length < 2) { setHint('Escribí al menos 2 letras para buscar.'); return; }
    setHint('');
    setParams({ q: value.slice(0, 80) });
  }
  const goTo = (tab, nextPage = 1) => setParams({ q: query, tab, ...(nextPage > 1 ? { page: String(nextPage) } : {}) });

  return <div className="container page search-page">
    <header className="page-header">
      <p className="eyebrow">Buscar</p>
      <h1>¿Qué estás buscando?</h1>
      <p className="lead">Encontrá personas por su nombre, fichas de Conozcamos Formosa y preguntas de la comunidad.</p>
    </header>
    <form className="search-form" role="search" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor="search-input">Buscar en Forbook</label>
      <div className="search-box">
        <SearchIcon/>
        <input id="search-input" type="search" name="q" value={text} maxLength={80} autoComplete="off" enterKeyHint="search" placeholder="Por ejemplo: SUBE, beca, Ana…"
          onChange={event => { setText(event.target.value); setHint(''); }} aria-invalid={!!hint} aria-describedby={hint ? 'search-hint' : undefined}/>
        <button className="btn btn-primary" type="submit">Buscar</button>
      </div>
      {hint && <small id="search-hint" className="field-error">{hint}</small>}
    </form>

    {!ready ? <div className="empty search-empty">
      <h2>Escribí lo que necesitás</h2>
      <p>Por ejemplo, el nombre de un compañero, «colectivo», «alquiler» o «inscripción». No importa si usás tildes o mayúsculas.</p>
    </div> : <>
      <nav className="mod-nav search-tabs" aria-label="Tipo de resultado">
        {tabs.map(([key, label]) => <Link key={key} to={`/buscar?${new URLSearchParams({ q: query, tab: key })}`} aria-current={active === key ? 'page' : undefined}>
          {label}{totals[key] !== undefined && <span className="tab-count">{totals[key]}</span>}
        </Link>)}
      </nav>
      <p className="sr-only" role="status">{allLoaded ? tabs.map(([key, label]) => `${label}: ${totals[key] ?? 0}`).join(', ') : 'Buscando…'}</p>

      {current.loading ? <Loading text="Buscando…"/>
        : current.error ? <ErrorMessage message={current.error.message} retry={current.retry}/>
        : !current.result?.data.length ? <div className="empty">
          <h2>No encontramos {active === 'personas' ? 'personas' : active === 'fichas' ? 'fichas' : 'preguntas'} con «{query}»</h2>
          <p>{active === 'preguntas' ? 'Probá con otras palabras o hacé tu propia pregunta: alguien de la comunidad te puede ayudar.' : 'Probá con otras palabras o revisá cómo lo escribiste.'}</p>
          {active === 'preguntas' && <Link className="btn btn-primary" to="/preguntas/nueva">Hacer una pregunta</Link>}
          {active === 'fichas' && <Link className="btn btn-outline" to="/conozcamos">Ver todas las fichas</Link>}
        </div>
        : active === 'personas' ? <ul className="person-list">{current.result.data.map(person => <PersonCard key={person.id} person={person} query={query}/>)}</ul>
        : active === 'fichas' ? <div className="content-grid">{current.result.data.map(content => <ContentCard key={content.id} content={content}/>)}</div>
        : <div className="question-list">{current.result.data.map(question => <QuestionCard key={question.id} question={question}/>)}</div>}
      {!current.loading && !current.error && <Pagination meta={current.result?.meta} page={tabParam === active ? page : 1} onChange={next => goTo(active, next)} label={`Páginas de ${active}`}/>}
    </>}
  </div>;
}
