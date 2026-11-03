import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import ContentCard from '../components/ContentCard';

// Conozcamos Formosa por categorías (FF-17). El filtro queda en la dirección: ?categoryId=3&page=2
export default function ExplorePage() {
  usePageTitle('Conozcamos Formosa');
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || '';
  const page = params.get('page') || '1';
  const categoryLoader = useCallback(signal => catalogService.categories(signal), []);
  const contentLoader = useCallback(signal => catalogService.contents({ categoryId, page }, signal), [categoryId, page]);
  const categories = useFetch(categoryLoader);
  const contents = useFetch(contentLoader);
  const choose = id => setParams(id ? { categoryId: String(id) } : {});
  const paginate = next => setParams({ ...(categoryId ? { categoryId } : {}), page: String(next) });
  const selected = categories.result?.data.find(item => String(item.id) === categoryId);
  const total = contents.result?.meta.total;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Conozcamos Formosa</p>
      <h1>Una ciudad por descubrir.</h1>
      <p className="lead">Información para estudiar, orientarte y dar tus primeros pasos, con la fuente y la fecha de revisión a la vista.</p>
    </header>
    {categories.loading ? <Loading text="Cargando categorías…"/>
      : categories.error ? <ErrorMessage message={categories.error.message} retry={categories.retry}/>
      : <div className="chip-row" role="group" aria-label="Filtrar por categoría">
        <button className="chip" type="button" aria-pressed={!categoryId} onClick={() => choose('')}>Todas</button>
        {categories.result.data.map(category => <button key={category.id} className="chip" type="button" aria-pressed={categoryId === String(category.id)} onClick={() => choose(category.id)}>{category.name}</button>)}
      </div>}
    <div className="results-head"><h2>{selected?.name || 'Todas las fichas'}</h2>{total !== undefined && <span className="results-count" role="status">{total} {total === 1 ? 'ficha' : 'fichas'}</span>}</div>
    {selected && <p className="results-desc">{selected.description}</p>}
    {contents.loading ? <Loading/>
      : contents.error ? <ErrorMessage message={contents.error.message} retry={contents.retry}/>
      : contents.result.data.length ? <>
        <div className="content-grid">{contents.result.data.map(content => <ContentCard key={content.id} content={content}/>)}</div>
        {contents.result.meta.pages > 1 && <nav className="pagination" aria-label="Páginas">
          {Number(page) > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => paginate(Number(page) - 1)}>Anterior</button>}
          <span>Página {contents.result.meta.page} de {contents.result.meta.pages}</span>
          {Number(page) < contents.result.meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => paginate(Number(page) + 1)}>Siguiente</button>}
        </nav>}
      </>
      : <EmptyState title={selected ? `Todavía no hay fichas en ${selected.name}` : 'Todavía no hay fichas publicadas'} action={categoryId ? <button className="btn btn-primary" type="button" onClick={() => choose('')}>Ver todas las fichas</button> : null}/>}
    <p className="note">Ves la información general de Formosa y la de tu institución.</p>
  </div>;
}
