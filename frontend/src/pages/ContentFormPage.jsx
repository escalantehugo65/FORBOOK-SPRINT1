import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import Field from '../components/Field';
import { Loading, ErrorMessage } from '../components/Feedback';
import { ArrowIcon } from '../components/Icons';
import { sourceNames } from '../utils/content';
import { emptyUserContent, userContentBody, userContentLimits, userSourceHints, validateUserContent } from '../utils/userContent';

function TextArea({ name, label, value, onChange, error, max, rows, hint }) {
  return <div className="field">
    <label htmlFor={name}>{label} <span aria-hidden="true">*</span></label>
    <textarea id={name} name={name} rows={rows} maxLength={max} value={value} onChange={onChange} aria-invalid={!!error} aria-describedby={`${name}-hint${error ? ` ${name}-error` : ''}`}/>
    <small id={`${name}-hint`}>{hint ? `${hint} · ` : ''}{value.trim().length}/{max}</small>
    {error && <small id={`${name}-error`} className="field-error">{error}</small>}
  </div>;
}

// Crear (/conozcamos/nueva) o editar (/conozcamos/:id/editar) una ficha propia.
// Se publica al momento con el nombre de quien la hizo; la comunidad la puede reportar.
export default function ContentFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  usePageTitle(editing ? 'Editar mi ficha' : 'Crear una ficha');
  const { user } = useAuth();
  const navigate = useNavigate();
  const categoriesLoader = useCallback(signal => catalogService.categories(signal), []);
  const ownLoader = useCallback(signal => (editing ? catalogService.ownContent(id, signal) : Promise.resolve(null)), [editing, id]);
  const categories = useFetch(categoriesLoader);
  const own = useFetch(ownLoader);
  const [values, setValues] = useState(emptyUserContent);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (own.result?.data) setValues({ ...emptyUserContent, ...own.result.data, categoryId: String(own.result.data.categoryId) }); }, [own.result]);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
    setError('');
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = validateUserContent(values);
    setErrors(invalid);
    if (Object.keys(invalid).length) { setError('Revisá los campos marcados.'); return; }
    setBusy(true); setError('');
    try {
      const body = userContentBody(values);
      const result = editing ? await catalogService.updateContent(id, body) : await catalogService.createContent(body);
      navigate(`/conozcamos/${result.data.id}`, { replace: editing });
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); setBusy(false); }
  }

  const back = <Link className="back-link" to={editing ? `/conozcamos/${id}` : '/conozcamos'}><ArrowIcon/>{editing ? 'Volver a la ficha' : 'Volver a Conozcamos Formosa'}</Link>;
  if (categories.loading || own.loading) return <div className="container page">{back}<Loading text="Preparando el formulario…"/></div>;
  if (own.error) return <div className="container page">{back}<ErrorMessage message={own.error.message} retry={own.error.status >= 500 || !own.error.status ? own.retry : null}/></div>;

  return <div className="container page">
    {back}
    <header className="page-header">
      <p className="eyebrow">Conozcamos Formosa</p>
      <h1>{editing ? 'Editá tu ficha.' : 'Compartí lo que sabés.'}</h1>
      <p className="lead">La ficha se publica al momento con tu nombre, {user.name.split(' ')[0]}. Contá datos que le sirvan a quien recién llega y decí de dónde salen. Si algo no está bien, la comunidad la puede reportar.</p>
    </header>
    <form className="content-form" onSubmit={submit} noValidate>
      {error && <div className="alert" role="alert"><p>{error}</p></div>}
      <fieldset disabled={busy}>
        <legend className="sr-only">Datos de la ficha</legend>
        <Field label="Título" name="title" value={values.title} onChange={change} error={errors.title} required maxLength={userContentLimits.title[1]}
          placeholder="Por ejemplo: Dónde comprar fruta y verdura barata" hint={`${values.title.trim().length}/${userContentLimits.title[1]}`}/>
        <TextArea name="summary" label="Resumen" rows={2} value={values.summary} onChange={change} error={errors.summary} max={userContentLimits.summary[1]} hint="Se ve en la tarjeta de la ficha"/>
        <TextArea name="body" label="Texto" rows={10} value={values.body} onChange={change} error={errors.body} max={userContentLimits.body[1]} hint="Separá los párrafos con una línea en blanco"/>
        <Field label="Categoría" name="categoryId" value={values.categoryId} onChange={change} error={errors.categoryId} required disabled={busy || !!categories.error}>
          <option value="">Elegí una categoría</option>
          {categories.result?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Field>
        {categories.error && <ErrorMessage message={categories.error.message} retry={categories.retry}/>}
        <label className="choice">
          <input type="checkbox" name="forMyInstitution" checked={values.forMyInstitution} onChange={change}/>
          Solo para quienes estudian en {user.institution?.name || 'mi institución'}
        </label>
        <fieldset className="choice-group">
          <legend>¿De dónde sale la información? <span aria-hidden="true">*</span></legend>
          {Object.keys(userSourceHints).map(type => <label className="choice" key={type}>
            <input type="radio" name="sourceType" value={type} checked={values.sourceType === type} onChange={change}/>
            <span><strong>{sourceNames[type]}</strong><br/><small>{userSourceHints[type]}</small></span>
          </label>)}
        </fieldset>
        {values.sourceType !== 'experience' && <>
          <Field label={values.sourceType === 'official' ? 'Organismo o institución' : 'Referencia para comprobarlo'} name="sourceLabel" value={values.sourceLabel} onChange={change} error={errors.sourceLabel} required maxLength={userContentLimits.sourceLabel}
            placeholder={values.sourceType === 'official' ? 'Por ejemplo: Municipalidad de Formosa' : 'Por ejemplo: cartel en la entrada del mercado'}/>
          <Field label={values.sourceType === 'official' ? 'Enlace a la publicación' : 'Enlace (opcional)'} name="sourceUrl" type="url" inputMode="url" value={values.sourceUrl} onChange={change} error={errors.sourceUrl} required={values.sourceType === 'official'} maxLength={userContentLimits.sourceUrl}
            placeholder="https://…"/>
        </>}
        <p className="note">Podés publicar hasta 3 fichas por día. No pongas datos personales de otras personas (teléfonos, direcciones, fotos).</p>
        <div className="form-actions">
          <Link className="btn btn-outline" to={editing ? `/conozcamos/${id}` : '/conozcamos'}>Cancelar</Link>
          <button className="btn btn-primary btn-large" type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Publicar ficha'}</button>
        </div>
      </fieldset>
    </form>
  </div>;
}
