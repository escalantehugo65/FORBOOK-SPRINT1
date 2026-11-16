import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moderationService } from '../services/moderation';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Field from '../components/Field';
import ModerationNav from '../components/ModerationNav';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';
import { findMatches } from '../utils/search';

const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({ title: '', summary: '', body: '', categoryId: '', institutionId: '', status: 'published', sourceType: 'official', sourceLabel: '', sourceUrl: '', authorLabel: '', reviewedAt: today() });
const fromContent = content => ({
  title: content.title, summary: content.summary, body: content.body, categoryId: String(content.categoryId), institutionId: content.institutionId ? String(content.institutionId) : '',
  status: content.status, sourceType: content.sourceType, sourceLabel: content.sourceLabel || '', sourceUrl: content.sourceUrl || '', authorLabel: content.authorLabel || '', reviewedAt: content.reviewedAt || '',
});
// Lo mismo que exige el backend (FF-19 y FF-20): cada tipo de fuente pide lo que la hace confiable.
const sourceHints = {
  official: 'Pide el nombre del organismo y el enlace https a la publicación oficial.',
  community: 'Pide una referencia para que cualquiera pueda comprobarla.',
  experience: 'Pide quién cuenta la experiencia. Se va a mostrar como opinión o experiencia, no como dato oficial.',
};
const limits = { title: [5, 180], summary: [10, 450], body: [30, 10000] };

// Formulario de una ficha completa. Valida lo mismo que el backend antes de enviar.
function ContentForm({ content, categories, institutions, onSaved, onCancel }) {
  const [values, setValues] = useState(() => content ? fromContent(content) : empty());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prefix = content ? `content-${content.id}` : 'content-new';
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    const invalid = {};
    for (const [key, [min, max]] of Object.entries(limits)) if (clean[key].length < min || clean[key].length > max) invalid[key] = `Escribí entre ${min} y ${max} caracteres.`;
    if (!clean.categoryId) invalid.categoryId = 'Elegí una categoría.';
    if (clean.sourceUrl && !/^https:\/\/\S+$/i.test(clean.sourceUrl)) invalid.sourceUrl = 'Usá un enlace completo que empiece con https://';
    if (clean.sourceType === 'official' && !clean.sourceLabel) invalid.sourceLabel = 'Escribí el nombre del organismo.';
    if (clean.sourceType === 'official' && !clean.sourceUrl) invalid.sourceUrl = 'Pegá el enlace a la publicación oficial.';
    if (clean.sourceType === 'community' && !clean.sourceLabel) invalid.sourceLabel = 'Escribí una referencia para comprobarla.';
    if (clean.sourceType === 'experience' && !clean.authorLabel) invalid.authorLabel = 'Escribí quién cuenta la experiencia.';
    if (clean.reviewedAt && clean.reviewedAt > today()) invalid.reviewedAt = 'La fecha no puede ser futura.';
    setErrors(invalid);
    if (Object.keys(invalid).length) { setError('Revisá los campos marcados.'); return; }
    const body = { ...clean, categoryId: Number(clean.categoryId), institutionId: clean.institutionId ? Number(clean.institutionId) : null };
    setBusy(true);
    try {
      const response = content ? await moderationService.updateContent(content.id, body) : await moderationService.createContent(body);
      onSaved(response.data, content ? `Se guardaron los cambios de "${response.data.title}".` : `Se creó la ficha "${response.data.title}".`);
      if (!content) setValues(empty());
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); }
    finally { setBusy(false); }
  }

  const counter = (key, hint) => `${values[key].length}/${limits[key][1]}${hint ? ` · ${hint}` : ''}`;
  return <form className="admin-form content-form" onSubmit={submit} noValidate>
    <Field label="Título" name={`${prefix}-title`} value={values.title} onChange={event => set('title', event.target.value)} error={errors.title} required maxLength={180} disabled={busy} hint="Corto y concreto. Por ejemplo: Cómo sacar la SUBE en Formosa"/>
    <div className="field">
      <label htmlFor={`${prefix}-summary`}>Resumen <span aria-hidden="true">*</span></label>
      <textarea id={`${prefix}-summary`} rows="2" maxLength={450} value={values.summary} disabled={busy} onChange={event => set('summary', event.target.value)}
        aria-invalid={!!errors.summary} aria-describedby={`${prefix}-summary-hint${errors.summary ? ` ${prefix}-summary-error` : ''}`}/>
      <small id={`${prefix}-summary-hint`}>{counter('summary', 'Se ve en la tarjeta de la ficha.')}</small>
      {errors.summary && <small id={`${prefix}-summary-error`} className="field-error">{errors.summary}</small>}
    </div>
    <div className="field">
      <label htmlFor={`${prefix}-body`}>Texto de la ficha <span aria-hidden="true">*</span></label>
      <textarea id={`${prefix}-body`} className="body-input" rows="12" maxLength={10000} value={values.body} disabled={busy} onChange={event => set('body', event.target.value)}
        aria-invalid={!!errors.body} aria-describedby={`${prefix}-body-hint${errors.body ? ` ${prefix}-body-error` : ''}`}/>
      <small id={`${prefix}-body-hint`}>{counter('body', 'Dejá una línea en blanco entre párrafos. Para listas, empezá cada línea con •.')}</small>
      {errors.body && <small id={`${prefix}-body-error`} className="field-error">{errors.body}</small>}
    </div>
    <div className="form-pair">
      <Field label="Categoría" name={`${prefix}-category`} value={values.categoryId} onChange={event => set('categoryId', event.target.value)} error={errors.categoryId} required disabled={busy}>
        <option value="">Elegí una categoría</option>
        {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Field>
      <Field label="¿Para quién es?" name={`${prefix}-institution`} value={values.institutionId} onChange={event => set('institutionId', event.target.value)} error={errors.institutionId} disabled={busy} hint="Una ficha de una institución solo la ven sus estudiantes.">
        <option value="">Información general: la ven todos</option>
        {institutions.map(item => <option key={item.id} value={item.id}>Solo {item.name}</option>)}
      </Field>
    </div>
    <fieldset className="choice-group" disabled={busy}>
      <legend>Tipo de fuente <span aria-hidden="true">*</span></legend>
      <div className="choice-row">
        {['official', 'community', 'experience'].map(type => <label className="choice" key={type}>
          <input type="radio" name={`${prefix}-type`} value={type} checked={values.sourceType === type} onChange={() => set('sourceType', type)} aria-describedby={`${prefix}-type-hint`}/>{sourceNames[type]}
        </label>)}
      </div>
      <small id={`${prefix}-type-hint`}>{sourceHints[values.sourceType]}</small>
      {errors.sourceType && <small className="field-error">{errors.sourceType}</small>}
    </fieldset>
    <div className="form-pair">
      <Field label="Fuente" name={`${prefix}-label`} value={values.sourceLabel} onChange={event => set('sourceLabel', event.target.value)} error={errors.sourceLabel}
        required={values.sourceType !== 'experience'} maxLength={250} disabled={busy} hint="Por ejemplo: Municipalidad de Formosa — portal web"/>
      <Field label="Enlace" type="url" name={`${prefix}-url`} value={values.sourceUrl} onChange={event => set('sourceUrl', event.target.value)} error={errors.sourceUrl}
        required={values.sourceType === 'official'} maxLength={1000} disabled={busy} placeholder="https://"/>
    </div>
    <div className="form-pair">
      <Field label="Autoría" name={`${prefix}-author`} value={values.authorLabel} onChange={event => set('authorLabel', event.target.value)} error={errors.authorLabel}
        required={values.sourceType === 'experience'} maxLength={180} disabled={busy} hint="Quién escribió o cuenta la información."/>
      <Field label="Fecha de revisión" type="date" name={`${prefix}-reviewed`} value={values.reviewedAt} max={today()} onChange={event => set('reviewedAt', event.target.value)} error={errors.reviewedAt} disabled={busy} hint="Cuándo comprobaste que el dato sigue vigente."/>
    </div>
    <Field label="Estado" name={`${prefix}-status`} value={values.status} onChange={event => set('status', event.target.value)} error={errors.status} disabled={busy}>
      <option value="published">Publicada: la ven los estudiantes</option>
      <option value="draft">Borrador: solo la ve administración</option>
    </Field>
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <div className="admin-buttons">
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : content ? 'Guardar cambios' : 'Crear ficha'}</button>
      {onCancel && <button className="btn btn-outline" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
    </div>
  </form>;
}

// Fichas completas de Conozcamos Formosa, solo para administración. Cada alta o cambio queda en el historial.
export default function AdminContentsPage() {
  usePageTitle('Fichas');
  const { user } = useAuth();
  // Una ficha de otra institución no se puede abrir desde Conozcamos Formosa (ni siquiera administración).
  const canOpen = content => content.status === 'published' && !content.hiddenAt && (!content.institutionId || content.institutionId === user.institutionId);
  const formRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState({ text: '', status: '' });
  const contentLoader = useCallback(signal => moderationService.contents(signal), []);
  const categoryLoader = useCallback(signal => moderationService.categories(signal), []);
  const institutionLoader = useCallback(signal => catalogService.institutions(signal), []);
  const contents = useFetch(contentLoader);
  const categories = useFetch(categoryLoader);
  const institutions = useFetch(institutionLoader);
  const scrollToForm = () => requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  // Para editar se pide la ficha completa (la lista no trae el texto).
  async function edit(content) {
    setLoadingId(content.id); setLoadError(''); setNotice(null);
    try { setEditing((await moderationService.content(content.id)).data); scrollToForm(); }
    catch (failure) { setLoadError(failure.message); }
    finally { setLoadingId(null); }
  }
  function saved(content, message) {
    setNotice({ message, content });
    setEditing(null);
    contents.retry();
    scrollToForm();
  }

  const list = useMemo(() => (contents.result?.data || []).filter(content => {
    if (filter.text.trim().length >= 2 && !findMatches(content.title, filter.text).length) return false;
    if (filter.status === 'published') return content.status === 'published' && !content.hiddenAt;
    if (filter.status === 'draft') return content.status === 'draft';
    if (filter.status === 'hidden') return Boolean(content.hiddenAt);
    return true;
  }), [contents.result, filter]);
  const visibleNow = notice?.content && canOpen(notice.content);

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Moderación</p>
      <h1>Fichas de Conozcamos Formosa.</h1>
      <p className="lead">Creá y editá fichas completas. Cargá solo información comprobada y dejá clara su fuente: oficial, comunitaria o experiencia.</p>
    </header>
    <ModerationNav/>
    <section className="admin-card" ref={formRef} aria-labelledby="content-form-title">
      <h2 id="content-form-title">{editing ? `Editar «${editing.title}»` : 'Nueva ficha'}</h2>
      {notice && <p className="report-done" role="status">{notice.message} {visibleNow && <Link to={`/conozcamos/${notice.content.id}`}>Ver la ficha</Link>}</p>}
      {categories.loading || institutions.loading ? <Loading text="Preparando el formulario…"/>
        : categories.error || institutions.error ? <ErrorMessage message={(categories.error || institutions.error).message} retry={() => { categories.retry(); institutions.retry(); }}/>
        : <ContentForm key={editing?.id ?? 'new'} content={editing} categories={categories.result.data} institutions={institutions.result.data} onSaved={saved} onCancel={editing ? () => setEditing(null) : null}/>}
    </section>

    <section className="admin-section" aria-labelledby="content-list-title">
      <h2 id="content-list-title">Fichas cargadas</h2>
      <div className="filter-bar admin-filters">
        <Field label="Buscar por título" name="content-filter" type="search" value={filter.text} onChange={event => setFilter(previous => ({ ...previous, text: event.target.value }))}/>
        <Field label="Estado" name="content-status" value={filter.status} onChange={event => setFilter(previous => ({ ...previous, status: event.target.value }))}>
          <option value="">Todas</option>
          <option value="published">Publicadas y visibles</option>
          <option value="draft">Borradores</option>
          <option value="hidden">Ocultas por moderación</option>
        </Field>
      </div>
      {loadError && <div className="alert" role="alert"><p>{loadError}</p></div>}
      {contents.loading ? <Loading text="Cargando fichas…"/>
        : contents.error ? <ErrorMessage message={contents.error.message} retry={contents.retry}/>
        : list.length ? <ul className="admin-list">{list.map(content => <li className="admin-row" key={content.id}>
          <div className="admin-row-main">
            <p className="card-category">{content.category?.name}{content.institution ? ` · Solo ${content.institution.name}` : ' · Información general'}</p>
            <h3>{content.title}</h3>
            <div className="admin-badges">
              <span className={sourceBadge[content.sourceType]}>{sourceNames[content.sourceType]}</span>
              {content.status !== 'published' && <span className="badge badge-soon">Borrador</span>}
              {content.hiddenAt && <span className="badge badge-hidden">Oculta por moderación</span>}
              <span className="card-meta">{content.sourceLabel || content.authorLabel || 'Sin referencia'} · {content.reviewedAt ? `Revisada el ${formatDate(content.reviewedAt)}` : 'Sin fecha de revisión'}</span>
            </div>
          </div>
          <div className="admin-buttons">
            {canOpen(content) && <Link className="btn btn-outline btn-small" to={`/conozcamos/${content.id}`}>Ver<span className="sr-only"> {content.title}</span></Link>}
            <button className="btn btn-outline btn-small" type="button" disabled={loadingId === content.id} onClick={() => edit(content)}>{loadingId === content.id ? 'Abriendo…' : 'Editar'}<span className="sr-only"> {content.title}</span></button>
          </div>
        </li>)}</ul>
        : <div className="empty"><h3>No hay fichas con ese filtro</h3><p>Probá con otro título o estado.</p></div>}
    </section>
  </div>;
}
