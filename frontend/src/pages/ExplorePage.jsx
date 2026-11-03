import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import ContentCard from '../components/ContentCard';

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || '';
  const page = params.get('page') || '1';
  const categoryLoader = useCallback(signal => catalogService.categories(signal), []);
  const contentLoader = useCallback(signal => catalogService.contents({ categoryId, page }, signal), [categoryId, page]);
  const categories = useFetch(categoryLoader);
  const contents = useFetch(contentLoader);
  const choose = id => setParams(id ? { categoryId: String(id) } : {});
  const paginate = next => setParams({ ...(categoryId ? { categoryId } : {}), page: String(next) });
  return <div className="container section"><div className="page-heading explore-heading"><span className="eyebrow">TU GUÍA PARA LA VIDA COTIDIANA</span><h1>Conozcamos<br/><em>Formosa.</em></h1><p>Una ciudad por descubrir. Encontrá información para estudiar, orientarte y dar tus primeros pasos.</p></div>
    {categories.loading ? <Loading text="Cargando categorías…"/> : categories.error ? <ErrorMessage message={categories.error.message} retry={categories.retry}/> : <nav className="category-filters" aria-label="Filtrar por categoría"><button className={!categoryId ? 'selected' : ''} aria-pressed={!categoryId} onClick={() => choose('')}>Todo</button>{categories.result.data.map(category => <button key={category.id} className={categoryId === String(category.id) ? 'selected' : ''} aria-pressed={categoryId === String(category.id)} onClick={() => choose(category.id)}>{category.name}</button>)}</nav>}
    <div className="results-heading"><h2>{categories.result?.data.find(item => String(item.id) === categoryId)?.name || 'Explorá a tu ritmo'}</h2><span>{contents.result ? `${contents.result.meta.total} ${contents.result.meta.total === 1 ? 'contenido' : 'contenidos'}` : ''}</span></div>
    {contents.loading ? <Loading/> : contents.error ? <ErrorMessage message={contents.error.message} retry={contents.retry}/> : contents.result.data.length ? <><div className="content-grid">{contents.result.data.map(content => <ContentCard key={content.id} content={content}/>)}</div><div className="pagination">{Number(page) > 1 && <button className="button secondary" onClick={() => paginate(Number(page) - 1)}>Anterior</button>}<span>Página {contents.result.meta.page} de {contents.result.meta.pages}</span>{Number(page) < contents.result.meta.pages && <button className="button secondary" onClick={() => paginate(Number(page) + 1)}>Siguiente</button>}</div></> : <EmptyState/>}
    <p className="editorial-note">Ves información general de Formosa y contenido de tu institución. Las categorías sin publicaciones se muestran vacías.</p></div>;
}
