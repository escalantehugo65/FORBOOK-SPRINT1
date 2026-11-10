import { useCallback, useEffect, useRef, useState } from 'react';
import { moderationService } from '../services/moderation';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Field from '../components/Field';
import ModerationNav from '../components/ModerationNav';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';

// Lo mismo que exige el backend para que la clasificación oficial/comunitaria/experiencia sea consistente.
const sourceHints = {
  official: 'Pide el nombre del organismo y el enlace https a la publicación.',
  community: 'Pide una referencia para que cualquiera pueda verificarla.',
  experience: 'Pide quién cuenta la experiencia. No es un dato oficial.',
};
const today = () => new Date().toISOString().slice(0, 10);

function CategoryForm({ initial, idPrefix, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); };
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = {};
    const name = values.name.trim();
    const description = values.description.trim();
    if (name.length < 3 || name.length > 100) invalid.name = 'Escribí entre 3 y 100 caracteres.';
    if (description.length < 10 || description.length > 350) invalid.description = 'Escribí entre 10 y 350 caracteres.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      await onSubmit({ name, description });
      if (!onCancel) setValues({ name: '', description: '' });
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); }
    finally { setBusy(false); }
  }
  return <form className="admin-form" onSubmit={submit} noValidate>
    <Field label="Nombre" name={`${idPrefix}-name`} value={values.name} onChange={event => set('name', event.target.value)} error={errors.name} required maxLength={100} disabled={busy}/>
    <div className="field">
      <label htmlFor={`${idPrefix}-description`}>Descripción <span aria-hidden="true">*</span></label>
      <textarea id={`${idPrefix}-description`} rows="2" maxLength={350} value={values.description} disabled={busy} onChange={event => set('description', event.target.value)}
        aria-invalid={!!errors.description} aria-describedby={errors.description ? `${idPrefix}-description-error` : undefined}/>
      {errors.description && <small id={`${idPrefix}-description-error`} className="field-error">{errors.description}</small>}
    </div>
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <div className="admin-buttons">
      <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
      {onCancel && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
    </div>
  </form>;
}

function CategoryRow({ category, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inUse = category.contentCount + category.questionCount > 0;
  const usage = `${category.contentCount} ${category.contentCount === 1 ? 'ficha' : 'fichas'} · ${category.questionCount} ${category.questionCount === 1 ? 'pregunta' : 'preguntas'}`;
  async function remove() {
    setBusy(true); setError('');
    try {
      await moderationService.deleteCategory(category.id);
      onChanged(`Se borró la categoría "${category.name}".`);
    } catch (failure) { setError(failure.message); setBusy(false); setConfirming(false); }
  }
  if (editing) return <li className="admin-row">
    <h3>Editar «{category.name}»</h3>
    <CategoryForm initial={{ name: category.name, description: category.description }} idPrefix={`category-${category.id}`} submitLabel="Guardar cambios"
      onCancel={() => setEditing(false)} onSubmit={async values => { await moderationService.updateCategory(category.id, values); onChanged(`Se guardó la categoría "${values.name}".`); }}/>
  </li>;
  return <li className="admin-row">
    <div className="admin-row-main">
      <h3>{category.name}</h3>
      <p>{category.description}</p>
      <p className="card-meta">{usage} · Dirección: {category.slug}</p>
    </div>
    <div className="admin-buttons">
      <button className="btn btn-outline btn-small" type="button" onClick={() => setEditing(true)}>Editar<span className="sr-only"> {category.name}</span></button>
      {inUse ? <p className="admin-hint">No se puede borrar mientras tenga fichas o preguntas.</p>
        : confirming ? <>
          <button className="btn btn-danger btn-small" type="button" disabled={busy} onClick={remove}>{busy ? 'Borrando…' : 'Sí, borrar'}<span className="sr-only"> {category.name}</span></button>
          <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setConfirming(false)}>No borrar</button>
        </>
        : <button className="btn btn-outline btn-small" type="button" onClick={() => setConfirming(true)}>Borrar<span className="sr-only"> {category.name}</span></button>}
    </div>
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
  </li>;
}

function SourceRow({ content, onChanged }) {
  const initial = { sourceType: content.sourceType, sourceLabel: content.sourceLabel || '', sourceUrl: content.sourceUrl || '', authorLabel: content.authorLabel || '', reviewedAt: content.reviewedAt || '' };
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); };
  const prefix = `source-${content.id}`;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const invalid = {};
    if (clean.sourceUrl && !/^https:\/\/\S+$/i.test(clean.sourceUrl)) invalid.sourceUrl = 'Usá un enlace completo que empiece con https://';
    if (clean.sourceType === 'official' && !clean.sourceLabel) invalid.sourceLabel = 'Escribí el nombre del organismo.';
    if (clean.sourceType === 'official' && !clean.sourceUrl) invalid.sourceUrl = 'Pegá el enlace a la publicación oficial.';
    if (clean.sourceType === 'community' && !clean.sourceLabel) invalid.sourceLabel = 'Escribí una referencia para verificarla.';
    if (clean.sourceType === 'experience' && !clean.authorLabel) invalid.authorLabel = 'Escribí quién cuenta la experiencia.';
    if (clean.reviewedAt && clean.reviewedAt > today()) invalid.reviewedAt = 'La fecha no puede ser futura.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      await moderationService.updateSource(content.id, clean);
      onChanged(`Se actualizó la fuente de "${content.title}".`);
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); setBusy(false); }
  }
  return <li className="admin-row">
    <div className="admin-row-main">
      <p className="card-category">{content.category?.name}{content.institution ? ` · ${content.institution.name}` : ' · Información general'}</p>
      <h3>{content.title}</h3>
      <div className="admin-badges">
        <span className={sourceBadge[content.sourceType]}>{sourceNames[content.sourceType]}</span>
        {content.status !== 'published' && <span className="badge badge-soon">Borrador</span>}
        {content.hiddenAt && <span className="badge badge-hidden">Oculta por moderación</span>}
        <span className="card-meta">{content.sourceLabel || content.authorLabel || 'Sin referencia'} · {content.reviewedAt ? `Revisada el ${formatDate(content.reviewedAt)}` : 'Sin fecha de revisión'}</span>
      </div>
    </div>
    {!editing && <div className="admin-buttons"><button className="btn btn-outline btn-small" type="button" onClick={() => setEditing(true)}>Editar fuente<span className="sr-only"> de {content.title}</span></button></div>}
    {editing && <form className="admin-form" onSubmit={submit} noValidate>
      <fieldset className="choice-group" disabled={busy}>
        <legend>Tipo de fuente <span aria-hidden="true">*</span></legend>
        <div className="choice-row">
          {['official', 'community', 'experience'].map(type => <label className="choice" key={type}>
            <input type="radio" name={`${prefix}-type`} value={type} checked={values.sourceType === type} onChange={() => set('sourceType', type)} aria-describedby={`${prefix}-type-hint`}/>{sourceNames[type]}
          </label>)}
        </div>
        <small id={`${prefix}-type-hint`}>{sourceHints[values.sourceType]}</small>
      </fieldset>
      <Field label="Fuente" name={`${prefix}-label`} value={values.sourceLabel} onChange={event => set('sourceLabel', event.target.value)} error={errors.sourceLabel}
        required={values.sourceType !== 'experience'} maxLength={250} disabled={busy} hint="Por ejemplo: Municipalidad de Formosa — portal web"/>
      <Field label="Enlace" type="url" name={`${prefix}-url`} value={values.sourceUrl} onChange={event => set('sourceUrl', event.target.value)} error={errors.sourceUrl}
        required={values.sourceType === 'official'} maxLength={1000} disabled={busy} placeholder="https://"/>
      <Field label="Autoría" name={`${prefix}-author`} value={values.authorLabel} onChange={event => set('authorLabel', event.target.value)} error={errors.authorLabel}
        required={values.sourceType === 'experience'} maxLength={180} disabled={busy} hint="Quién escribió o cuenta la información."/>
      <Field label="Fecha de revisión" type="date" name={`${prefix}-reviewed`} value={values.reviewedAt} max={today()} onChange={event => set('reviewedAt', event.target.value)} error={errors.reviewedAt} disabled={busy}/>
      {error && <div className="alert" role="alert"><p>{error}</p></div>}
      <div className="admin-buttons">
        <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar fuente'}</button>
        <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => { setEditing(false); setValues(initial); setErrors({}); setError(''); }}>Cancelar</button>
      </div>
    </form>}
  </li>;
}

// Categorías y metadatos de fuente (FF-39). Solo administración.
export default function AdminCatalogPage() {
  usePageTitle('Categorías y fuentes');
  const categoryLoader = useCallback(signal => moderationService.categories(signal), []);
  const contentLoader = useCallback(signal => moderationService.contents(signal), []);
  const categories = useFetch(categoryLoader);
  const contents = useFetch(contentLoader);
  const [notice, setNotice] = useState('');
  const noticeRef = useRef(null);
  useEffect(() => { if (notice) noticeRef.current?.focus(); }, [notice]);
  // Renombrar una categoría también cambia cómo se ven las fichas, por eso se recargan las dos listas.
  const categoryChanged = message => { setNotice(message); categories.retry(); contents.retry(); };
  const sourceChanged = message => { setNotice(message); contents.retry(); };

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Moderación</p>
      <h1>Categorías y fuentes.</h1>
      <p className="lead">Mantené ordenado Conozcamos Formosa y dejá clara la procedencia de cada ficha. Cada cambio queda en el historial.</p>
    </header>
    <ModerationNav/>
    {notice && <p ref={noticeRef} tabIndex="-1" className="access-notice page-notice" role="status">{notice}</p>}

    <section className="admin-section" aria-labelledby="categories-title">
      <h2 id="categories-title">Categorías</h2>
      <p className="admin-intro">Ordenan las fichas y las preguntas. Al renombrar una categoría su dirección no cambia, así los enlaces siguen funcionando. Solo se puede borrar una categoría vacía.</p>
      <div className="admin-card">
        <h3>Nueva categoría</h3>
        <CategoryForm initial={{ name: '', description: '' }} idPrefix="new-category" submitLabel="Crear categoría"
          onSubmit={async values => { await moderationService.createCategory(values); categoryChanged(`Se creó la categoría "${values.name}".`); }}/>
      </div>
      {categories.loading ? <Loading text="Cargando categorías…"/>
        : categories.error ? <ErrorMessage message={categories.error.message} retry={categories.retry}/>
        : <ul className="admin-list">{categories.result.data.map(category => <CategoryRow key={category.id} category={category} onChanged={categoryChanged}/>)}</ul>}
    </section>

    <section className="admin-section" aria-labelledby="sources-title">
      <h2 id="sources-title">Fuentes de las fichas</h2>
      <p className="admin-intro">El tipo de fuente le dice al estudiante cuánto confiar: oficial, comunitaria verificable u opinión o experiencia.</p>
      {contents.loading ? <Loading text="Cargando fichas…"/>
        : contents.error ? <ErrorMessage message={contents.error.message} retry={contents.retry}/>
        : contents.result.data.length ? <ul className="admin-list">{contents.result.data.map(content => <SourceRow key={content.id} content={content} onChanged={sourceChanged}/>)}</ul>
        : <div className="empty"><h3>Todavía no hay fichas</h3><p>Cuando se carguen fichas en Conozcamos Formosa, vas a poder editar su fuente acá.</p></div>}
    </section>
  </div>;
}
