import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import ContentCard from '../components/ContentCard';
import { SearchIcon } from '../components/Icons';
import { sourceBadge, sourceNames } from '../utils/content';

// FF-18: "De mi institución" muestra solo las fichas propias; "Generales", las de toda la ciudad.
// Nunca aparecen fichas de otra institución: el backend las filtra siempre.
const scopes = [['', 'Todas'], ['institution', 'De mi institución'], ['general', 'Generales']];
// FF-20: qué significa cada etiqueta. Son las mismas en las fichas, el mapa, las rutas y las respuestas.
const legend = {
  official: 'Publicada por un organismo o la institución. Tiene enlace a la fuente.',
  community: 'Aporte de la comunidad con una referencia para comprobarlo.',
  experience: 'Lo que cuenta una persona. Sirve para orientarte, no es un dato oficial.',
};

// Conozcamos Formosa (FF-17 a FF-20). Los filtros quedan en la dirección: ?categoryId=3&scope=institution&search=sube&page=2
export default function ExplorePage() {
  usePageTitle('Conozcamos Formosa');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || '';
  const scope = ['institution', 'general'].includes(params.get('scope')) ? params.get('scope') : '';
  const search = params.get('search') || '';
  const page = params.get('page') || '1';
  const [text, setText] = useState(search);
  const [hint, setHint] = useState('');
  useEffect(() => { setText(search); }, [search]);
  const categoryLoader = useCallback(signal => catalogService.categories(signal), []);
  const contentLoader = useCallback(signal => catalogService.contents({ categoryId, scope, search, page }, signal), [categoryId, scope, search, page]);
  const categories = useFetch(categoryLoader);
  const contents = useFetch(contentLoader);

  // Cambiar un filtro vuelve a la página 1; los vacíos no se escriben en la dirección.
  function update(changes) {
    const next = { categoryId, scope, search, ...changes, page: changes.page || '' };
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  }
  function submitSearch(event) {
    event.preventDefault();
    const value = text.trim();
    if (value && value.length < 2) { setHint('Escribí al menos 2 letras.'); return; }
    setHint('');
    update({ search: value.slice(0, 80) });
  }
  const selected = categories.result?.data.find(item => String(item.id) === categoryId);
  const total = contents.result?.meta.total;
  const institution = user.institution?.name || 'tu institución';
  const heading = [selected?.name || 'Todas las fichas', scope === 'institution' ? `de ${institution}` : scope === 'general' ? 'generales' : ''].filter(Boolean).join(' ');

  let empty;
  if (search) empty = <EmptyState title={`No encontramos fichas con «${search}»`} action={<button className="btn btn-primary" type="button" onClick={() => update({ search: '' })}>Borrar la búsqueda</button>}>Probá con otras palabras. No importa si usás tildes o mayúsculas.</EmptyState>;
  else if (scope === 'institution') empty = <EmptyState title={`${institution} todavía no tiene fichas propias${selected ? ` en ${selected.name}` : ''}`} action={<button className="btn btn-primary" type="button" onClick={() => update({ scope: 'general' })}>Ver las fichas generales</button>}>Mientras tanto, la información general de Formosa te sirve igual.</EmptyState>;
  else empty = <EmptyState title={selected ? `Todavía no hay fichas en ${selected.name}` : 'Todavía no hay fichas publicadas'} action={categoryId ? <button className="btn btn-primary" type="button" onClick={() => update({ categoryId: '' })}>Ver todas las fichas</button> : null}/>;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Conozcamos Formosa</p>
      <h1>Una ciudad por descubrir.</h1>
      <p className="lead">Información para estudiar, orientarte y dar tus primeros pasos, con la fuente y la fecha de revisión a la vista.</p>
    </header>

    <div className="explore-tools">
      <form className="search-form explore-search" role="search" onSubmit={submitSearch} noValidate>
        <label className="sr-only" htmlFor="explore-search">Buscar fichas</label>
        <div className="search-box">
          <SearchIcon/>
          <input id="explore-search" type="search" value={text} maxLength={80} placeholder="Buscar fichas: colectivo, beca, alquiler…" enterKeyHint="search"
            onChange={event => { setText(event.target.value); setHint(''); if (!event.target.value && search) update({ search: '' }); }} aria-invalid={!!hint} aria-describedby={hint ? 'explore-search-hint' : undefined}/>
          <button className="btn btn-primary btn-small" type="submit">Buscar</button>
        </div>
        {hint && <small id="explore-search-hint" className="field-error">{hint}</small>}
      </form>
      <div className="chip-row" role="group" aria-label="Qué fichas ver">
        {scopes.map(([value, label]) => <button key={value || 'all'} className="chip" type="button" aria-pressed={scope === value} onClick={() => update({ scope: value })}>{label}</button>)}
      </div>
    </div>

    {categories.loading ? <Loading text="Cargando categorías…"/>
      : categories.error ? <ErrorMessage message={categories.error.message} retry={categories.retry}/>
      : <div className="chip-row category-chips" role="group" aria-label="Filtrar por categoría">
        <button className="chip" type="button" aria-pressed={!categoryId} onClick={() => update({ categoryId: '' })}>Todas las categorías</button>
        {categories.result.data.map(category => <button key={category.id} className="chip" type="button" aria-pressed={categoryId === String(category.id)} onClick={() => update({ categoryId: String(category.id) })}>{category.name}</button>)}
      </div>}
    <div className="results-head">
      <h2>{search ? `Resultados para «${search}»` : heading}</h2>
      {total !== undefined && <span className="results-count" role="status">{total} {total === 1 ? 'ficha' : 'fichas'}</span>}
    </div>
    {selected && !search && <p className="results-desc">{selected.description}</p>}
    {contents.loading ? <Loading/>
      : contents.error ? <ErrorMessage message={contents.error.message} retry={contents.retry}/>
      : contents.result.data.length ? <>
        <div className="content-grid">{contents.result.data.map(content => <ContentCard key={content.id} content={content}/>)}</div>
        {contents.result.meta.pages > 1 && <nav className="pagination" aria-label="Páginas">
          {Number(page) > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(Number(page) - 1) })}>Anterior</button>}
          <span>Página {contents.result.meta.page} de {contents.result.meta.pages}</span>
          {Number(page) < contents.result.meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(Number(page) + 1) })}>Siguiente</button>}
        </nav>}
      </>
      : empty}

    <section className="label-legend" aria-labelledby="legend-title">
      <h2 id="legend-title">Qué significa cada etiqueta</h2>
      <dl>{Object.entries(legend).map(([type, text]) => <div key={type}>
        <dt><span className={sourceBadge[type]}>{sourceNames[type]}</span></dt>
        <dd>{text}</dd>
      </div>)}</dl>
    </section>
    <p className="note">Ves la información general de Formosa y la de {institution}. Las fichas de otras instituciones no aparecen.</p>
  </div>;
}
