import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { catalogService } from '../services/catalog';
import { questionService } from '../services/questions';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import Field from '../components/Field';
import { ErrorMessage } from '../components/Feedback';
import { ArrowIcon } from '../components/Icons';

const empty = { title: '', body: '', categoryId: '', forMyInstitution: false };

// Publicar una pregunta (FF-25). Solo se llega con sesión, porque la ruta está dentro de PrivateRoute.
export default function AskQuestionPage() {
  usePageTitle('Hacer una pregunta');
  const { user } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(signal => catalogService.categories(signal), []);
  const categories = useFetch(loader);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
    setError('');
  }
  // Mismos límites que el backend: título de 10 a 150 caracteres y detalle de hasta 2000.
  function validate() {
    const invalid = {};
    const title = values.title.trim();
    if (title.length < 10 || title.length > 150) invalid.title = 'Escribí entre 10 y 150 caracteres.';
    if (values.body.trim().length > 2000) invalid.body = 'Usá como máximo 2000 caracteres.';
    if (!values.categoryId) invalid.categoryId = 'Elegí una categoría.';
    setErrors(invalid);
    return !Object.keys(invalid).length;
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || !validate()) return;
    setBusy(true); setError('');
    try {
      const { data } = await questionService.create({ title: values.title.trim(), body: values.body.trim(), categoryId: Number(values.categoryId), forMyInstitution: values.forMyInstitution });
      // La lista muestra el aviso de confirmación y resalta la pregunta nueva.
      navigate('/preguntas', { state: { publishedId: data.id } });
    } catch (failure) {
      setError(failure.message); setErrors(failure.fields || {}); setBusy(false);
    }
  }

  return <div className="container page">
    <Link className="back-link" to="/preguntas"><ArrowIcon/>Volver a Preguntas</Link>
    <header className="page-header">
      <p className="eyebrow">Preguntas y respuestas</p>
      <h1>Hacé tu pregunta.</h1>
      <p className="lead">Contá qué necesitás saber sobre Formosa. Se publica con tu primer nombre y la fecha.</p>
    </header>
    <form className="ask-form" onSubmit={submit} noValidate>
      {error && <div className="alert" role="alert"><p>{error}</p></div>}
      <fieldset className="ask-fields" disabled={busy}>
        <legend className="sr-only">Datos de la pregunta</legend>
        <Field label="Tu pregunta" name="title" value={values.title} onChange={change} error={errors.title} required maxLength={150}
          placeholder="Por ejemplo: ¿Dónde saco la SUBE?" hint={`${values.title.trim().length}/150 · Al menos 10 caracteres.`}/>
        <div className="field">
          <label htmlFor="body">Más detalles (opcional)</label>
          <textarea id="body" name="body" rows="6" maxLength={2000} value={values.body} onChange={change}
            aria-invalid={!!errors.body} aria-describedby={errors.body ? 'body-error' : 'body-hint'}/>
          <small id="body-hint">{values.body.length}/2000</small>
          {errors.body && <small id="body-error" className="field-error">{errors.body}</small>}
        </div>
        <Field label="Categoría" name="categoryId" value={values.categoryId} onChange={change} error={errors.categoryId} required disabled={busy || categories.loading || !!categories.error}>
          <option value="">{categories.loading ? 'Cargando categorías…' : 'Elegí una categoría'}</option>
          {categories.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Field>
        {categories.error && <ErrorMessage message={categories.error.message} retry={categories.retry}/>}
        <label className="choice">
          <input type="checkbox" name="forMyInstitution" checked={values.forMyInstitution} onChange={change}/>
          Es sobre {user.institution?.name || 'mi institución'}
        </label>
        <div className="form-actions">
          <Link className="btn btn-outline" to="/preguntas">Cancelar</Link>
          <button className="btn btn-primary btn-large" type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar pregunta'}</button>
        </div>
      </fieldset>
    </form>
  </div>;
}
