import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { moderationService } from '../services/moderation';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Field from '../components/Field';
import ModerationNav from '../components/ModerationNav';
import LocationPicker from '../components/LocationPicker';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';
import { placeKinds, sensitiveKinds } from '../utils/places';

const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({ name: '', kind: '', institutionId: '', addressLabel: '', studentNote: '', location: null, sourceType: 'official', sourceLabel: '', sourceUrl: '', reviewedAt: today(), status: 'published' });
const fromPlace = place => ({
  name: place.name, kind: place.kind, institutionId: place.institutionId ? String(place.institutionId) : '', addressLabel: place.addressLabel || '', studentNote: place.studentNote || '',
  location: place.latitude === null ? null : { latitude: place.latitude, longitude: place.longitude },
  sourceType: place.sourceType, sourceLabel: place.sourceLabel || '', sourceUrl: place.sourceUrl || '', reviewedAt: place.reviewedAt || today(), status: place.status,
});
const sourceHints = {
  official: 'Pide el nombre del organismo y el enlace https a la publicación oficial.',
  community: 'Pide una referencia para que cualquiera pueda verificarla (quién lo comprobó y cómo).',
};

// Formulario para agregar o editar un lugar. Valida lo mismo que el backend antes de enviar.
function PlaceForm({ place, institutions, onSaved, onCancel }) {
  const [values, setValues] = useState(() => place ? fromPlace(place) : empty());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prefix = place ? `place-${place.id}` : 'place-new';
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined, ...(key === 'location' ? { latitude: undefined } : {}) })); setError(''); };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const clean = { ...values, name: values.name.trim(), addressLabel: values.addressLabel.trim(), studentNote: values.studentNote.trim(), sourceLabel: values.sourceLabel.trim(), sourceUrl: values.sourceUrl.trim() };
    const invalid = {};
    if (clean.name.length < 3 || clean.name.length > 150) invalid.name = 'Escribí entre 3 y 150 caracteres.';
    if (!clean.kind) invalid.kind = 'Elegí una categoría.';
    if (!clean.addressLabel && !clean.location) invalid.addressLabel = 'Escribí una dirección o referencia, o elegí la ubicación en el mapa.';
    if (!clean.sourceLabel) invalid.sourceLabel = clean.sourceType === 'official' ? 'Escribí el nombre del organismo.' : 'Escribí una referencia para verificarla.';
    if (clean.sourceUrl && !/^https:\/\/\S+$/i.test(clean.sourceUrl)) invalid.sourceUrl = 'Usá un enlace completo que empiece con https://';
    if (clean.sourceType === 'official' && !clean.sourceUrl) invalid.sourceUrl = 'Pegá el enlace a la publicación oficial.';
    if (!clean.reviewedAt) invalid.reviewedAt = 'Indicá cuándo revisaste el dato.';
    else if (clean.reviewedAt > today()) invalid.reviewedAt = 'La fecha no puede ser futura.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const { location, ...rest } = clean;
    const body = { ...rest, institutionId: rest.institutionId ? Number(rest.institutionId) : null, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null };
    setBusy(true);
    try {
      const response = place ? await moderationService.updatePlace(place.id, body) : await moderationService.createPlace(body);
      onSaved(response.data, place ? `Se guardaron los cambios de "${response.data.name}".` : `Se agregó "${response.data.name}".`);
      if (!place) setValues(empty());
    } catch (failure) {
      setError(failure.message);
      const fields = { ...(failure.fields || {}) };
      if (fields.latitude) fields.location = fields.latitude;
      setErrors(fields);
    } finally { setBusy(false); }
  }

  return <form className="admin-form place-form" onSubmit={submit} noValidate>
    <Field label="Nombre" name={`${prefix}-name`} value={values.name} onChange={event => set('name', event.target.value)} error={errors.name} required maxLength={150} disabled={busy} hint="Por ejemplo: Hospital Central de Formosa"/>
    <div className="form-pair">
      <Field label="Categoría" name={`${prefix}-kind`} value={values.kind} onChange={event => set('kind', event.target.value)} error={errors.kind} required disabled={busy}>
        <option value="">Elegí una categoría</option>
        {Object.entries(placeKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Field>
      <Field label="Institución relacionada" name={`${prefix}-institution`} value={values.institutionId} onChange={event => set('institutionId', event.target.value)} error={errors.institutionId} disabled={busy} hint="Solo si el lugar es de una institución (una sede, un edificio).">
        <option value="">Ninguna: es un lugar general</option>
        {institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Field>
    </div>
    <Field label="Dirección o referencia" name={`${prefix}-address`} value={values.addressLabel} onChange={event => set('addressLabel', event.target.value)} error={errors.addressLabel} maxLength={250} disabled={busy} hint="Por ejemplo: Av. 25 de Mayo 100, frente a la plaza"/>
    <div className="field">
      <label htmlFor={`${prefix}-note`}>Nota para estudiantes</label>
      <textarea id={`${prefix}-note`} rows="2" maxLength={450} value={values.studentNote} disabled={busy} onChange={event => set('studentNote', event.target.value)} aria-describedby={`${prefix}-note-hint`}/>
      <small id={`${prefix}-note-hint`}>Opcional. Algo útil y comprobado, sin horarios que puedan cambiar.</small>
    </div>
    <LocationPicker idPrefix={prefix} value={values.location} onChange={location => set('location', location)} disabled={busy} error={errors.location}/>
    <fieldset className="choice-group" disabled={busy}>
      <legend>Tipo de fuente <span aria-hidden="true">*</span></legend>
      <div className="choice-row">
        {['official', 'community'].map(type => <label className="choice" key={type}>
          <input type="radio" name={`${prefix}-type`} value={type} checked={values.sourceType === type} onChange={() => set('sourceType', type)} aria-describedby={`${prefix}-type-hint`}/>{sourceNames[type]}
        </label>)}
      </div>
      <small id={`${prefix}-type-hint`}>{sourceHints[values.sourceType]}</small>
      {errors.sourceType && <small className="field-error">{errors.sourceType}</small>}
    </fieldset>
    {sensitiveKinds.includes(values.kind) && values.sourceType !== 'official' && <p className="place-warning">Es un lugar de {placeKinds[values.kind].toLowerCase()}: si podés, usá una fuente oficial. Si no, en el mapa se avisa que no es oficial.</p>}
    <div className="form-pair">
      <Field label="Fuente" name={`${prefix}-label`} value={values.sourceLabel} onChange={event => set('sourceLabel', event.target.value)} error={errors.sourceLabel} required maxLength={250} disabled={busy} hint="Por ejemplo: Ministerio de Desarrollo Humano — portal web"/>
      <Field label="Enlace" type="url" name={`${prefix}-url`} value={values.sourceUrl} onChange={event => set('sourceUrl', event.target.value)} error={errors.sourceUrl} required={values.sourceType === 'official'} maxLength={1000} disabled={busy} placeholder="https://"/>
    </div>
    <div className="form-pair">
      <Field label="Fecha de revisión" type="date" name={`${prefix}-reviewed`} value={values.reviewedAt} max={today()} onChange={event => set('reviewedAt', event.target.value)} error={errors.reviewedAt} required disabled={busy}/>
      <Field label="Estado" name={`${prefix}-status`} value={values.status} onChange={event => set('status', event.target.value)} error={errors.status} disabled={busy}>
        <option value="published">Publicado: se ve en el mapa</option>
        <option value="draft">Borrador: solo lo ve administración</option>
      </Field>
    </div>
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <div className="admin-buttons">
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : place ? 'Guardar cambios' : 'Agregar lugar'}</button>
      {onCancel && <button className="btn btn-outline" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
    </div>
  </form>;
}

// Lugares del mapa (épica 4), solo para administración. Cada alta o cambio queda en el historial.
export default function AdminPlacesPage() {
  usePageTitle('Lugares del mapa');
  const formRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const placeLoader = useCallback(signal => moderationService.places(signal), []);
  const institutionLoader = useCallback(signal => catalogService.institutions(signal), []);
  const places = useFetch(placeLoader);
  const institutions = useFetch(institutionLoader);

  function edit(place) {
    setNotice('');
    setEditing(place);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function saved(place, message) {
    setNotice(message);
    setEditing(null);
    places.retry();
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Moderación</p>
      <h1>Lugares del mapa.</h1>
      <p className="lead">Agregá lugares, elegí su categoría y marcá dónde quedan. Cargá solo datos que hayas comprobado.</p>
    </header>
    <ModerationNav/>
    <section className="admin-card" ref={formRef} aria-labelledby="place-form-title">
      <h2 id="place-form-title">{editing ? `Editar «${editing.name}»` : 'Agregar un lugar'}</h2>
      {notice && <p className="report-done" role="status">{notice} <Link to="/mapa">Ver el mapa</Link></p>}
      {institutions.loading ? <Loading text="Preparando el formulario…"/>
        : institutions.error ? <ErrorMessage message={institutions.error.message} retry={institutions.retry}/>
        : <PlaceForm key={editing?.id ?? 'new'} place={editing} institutions={institutions.result.data} onSaved={saved} onCancel={editing ? () => setEditing(null) : null}/>}
    </section>
    <section className="admin-section" aria-labelledby="place-list-title">
      <h2 id="place-list-title">Lugares cargados</h2>
      {places.loading ? <Loading text="Cargando lugares…"/>
        : places.error ? <ErrorMessage message={places.error.message} retry={places.retry}/>
        : <ul className="admin-list">{places.result.data.map(place => <li className="admin-row" key={place.id}>
          <div className="admin-row-main">
            <p className="card-category">{placeKinds[place.kind]}{place.institution ? ` · ${place.institution.name}` : ''}</p>
            <h3>{place.name}</h3>
            <p>{place.addressLabel || 'Sin dirección'}</p>
            <div className="admin-badges">
              <span className={sourceBadge[place.sourceType]}>{sourceNames[place.sourceType]}</span>
              {place.latitude === null ? <span className="badge badge-soon">Sin ubicación</span> : <span className="badge badge-official">En el mapa</span>}
              {place.status !== 'published' && <span className="badge badge-soon">Borrador</span>}
              {place.hiddenAt && <span className="badge badge-hidden">Oculto por moderación</span>}
              <span className="card-meta">{place.reviewedAt ? `Revisado el ${formatDate(place.reviewedAt)}` : 'Sin fecha de revisión'}</span>
            </div>
          </div>
          <div className="admin-buttons"><button className="btn btn-outline btn-small" type="button" onClick={() => edit(place)}>Editar<span className="sr-only"> {place.name}</span></button></div>
        </li>)}</ul>}
    </section>
  </div>;
}
