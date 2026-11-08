import { useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { catalogService } from '../services/catalog';
import { questionService } from '../services/questions';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage, EmptyState } from '../components/Feedback';
import QuestionCard from '../components/QuestionCard';
import Field from '../components/Field';

// Preguntas públicas (FF-24). Los filtros quedan en la dirección: ?categoryId=2&institutionId=1&status=open
export default function QuestionsPage() {
  usePageTitle('Preguntas');
  const location = useLocation();
  const publishedId = location.state?.publishedId;
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || '';
  const institutionId = params.get('institutionId') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page') || '1');

  const categoryLoader = useCallback(signal => catalogService.categories(signal), []);
  const institutionLoader = useCallback(signal => catalogService.institutions(signal), []);
  const questionLoader = useCallback(signal => questionService.list({ categoryId, institutionId, status, page }, signal), [categoryId, institutionId, status, page]);
  const categories = useFetch(categoryLoader);
  const institutions = useFetch(institutionLoader);
  const questions = useFetch(questionLoader);

  // Cambiar un filtro vuelve a la página 1; los filtros vacíos no se escriben en la dirección.
  function update(changes) {
    const next = { categoryId, institutionId, status, page: '', ...changes };
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  }
  const filtered = Boolean(categoryId || institutionId || status);
  const total = questions.result?.meta.total;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Preguntas y respuestas</p>
      <h1>Lo que otros ya preguntaron.</h1>
      <p className="lead">Dudas sobre Formosa que otros estudiantes ya plantearon. Si no encontrás la tuya, publicala.</p>
      <Link className="btn btn-primary" to="/preguntas/nueva">Hacer una pregunta</Link>
    </header>

    {publishedId && <p className="access-notice page-notice" role="status">Tu pregunta se publicó. Ya la pueden ver otros estudiantes.</p>}

    <form className="filter-bar" aria-label="Filtrar preguntas" onSubmit={event => event.preventDefault()}>
      <Field label="Categoría" name="categoryId" value={categoryId} onChange={event => update({ categoryId: event.target.value })} disabled={categories.loading || !!categories.error}>
        <option value="">Todas</option>
        {categories.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Field>
      <Field label="Institución" name="institutionId" value={institutionId} onChange={event => update({ institutionId: event.target.value })} disabled={institutions.loading || !!institutions.error}>
        <option value="">Todas</option>
        {institutions.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Field>
      <Field label="Estado" name="status" value={status} onChange={event => update({ status: event.target.value })}>
        <option value="">Todas</option>
        <option value="open">Abiertas</option>
        <option value="answered">Respondidas</option>
        <option value="closed">Cerradas</option>
      </Field>
    </form>

    <div className="results-head"><h2>{filtered ? 'Resultados' : 'Todas las preguntas'}</h2>{total !== undefined && <span className="results-count" role="status">{total} {total === 1 ? 'pregunta' : 'preguntas'}</span>}</div>
    {questions.loading ? <Loading text="Cargando preguntas…"/>
      : questions.error ? <ErrorMessage message={questions.error.message} retry={questions.retry}/>
      : questions.result.data.length ? <>
        <div className="question-list">{questions.result.data.map(question => <QuestionCard key={question.id} question={question} highlighted={question.id === publishedId}/>)}</div>
        {questions.result.meta.pages > 1 && <nav className="pagination" aria-label="Páginas">
          {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(page - 1) })}>Anterior</button>}
          <span>Página {questions.result.meta.page} de {questions.result.meta.pages}</span>
          {page < questions.result.meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(page + 1) })}>Siguiente</button>}
        </nav>}
      </>
      : <EmptyState title={filtered ? 'No hay preguntas con esos filtros' : 'Todavía no hay preguntas'}
          action={filtered ? <button className="btn btn-primary" type="button" onClick={() => setParams({})}>Ver todas las preguntas</button> : <Link className="btn btn-primary" to="/preguntas/nueva">Hacer la primera pregunta</Link>}>
          {filtered ? 'Probá con otra categoría, institución o estado.' : 'Sé la primera persona en preguntar algo sobre Formosa.'}
        </EmptyState>}
  </div>;
}
