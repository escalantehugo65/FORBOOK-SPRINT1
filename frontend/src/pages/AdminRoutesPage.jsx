import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { moderationService } from '../services/moderation';
import { catalogService } from '../services/catalog';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Field from '../components/Field';
import ModerationNav from '../components/ModerationNav';
import RouteStopsEditor from '../components/RouteStopsEditor';
import { checkStops, stopFromRoute } from '../utils/stops';
import { formatDate, sourceBadge, sourceNames } from '../utils/content';
import { routeModes } from '../utils/places';

const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({ title: '', institutionId: '', destinationPlaceId: '', originLabel: '', mode: 'bus', steps: '', durationLabel: '', status: 'published', sourceType: 'community', sourceLabel: '', sourceUrl: '', reviewedAt: today(), stops: [] });
const fromRoute = route => ({
  title: route.title, institutionId: String(route.institutionId), destinationPlaceId: route.destinationPlaceId ? String(route.destinationPlaceId) : '', originLabel: route.originLabel,
  mode: route.mode, steps: route.steps, durationLabel: route.durationLabel || '', status: route.status, sourceType: route.sourceType, sourceLabel: route.sourceLabel || '', sourceUrl: route.sourceUrl || '', reviewedAt: route.reviewedAt || today(),
  stops: (route.stops || []).map(stopFromRoute),
});
// Los pasos van uno por línea; las líneas vacías no cuentan (igual que en el backend).
const stepsOf = text => text.split('\n').map(step => step.trim()).filter(Boolean);
const sourceHints = {
  official: 'Pide el nombre del organismo y el enlace https (por ejemplo, el recorrido publicado por la empresa o el municipio).',
  community: 'Pide quién lo comprobó y cómo (por ejemplo: «Recorrido hecho por el equipo de Forbook el 10/11»).',
};

// Formulario de una ruta orientativa (FF-22). Como el tránsito cambia, la fuente y la fecha de revisión son obligatorias.
function RouteForm({ route, institutions, places, onSaved, onCancel }) {
  const [values, setValues] = useState(() => route ? fromRoute(route) : empty());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prefix = route ? `route-${route.id}` : 'route-new';
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined, ...(key === 'stops' ? { stopRows: undefined } : {}) })); setError(''); };
  const steps = stepsOf(values.steps);
  const ownPlaces = places.filter(place => String(place.institutionId) === values.institutionId);
  const otherPlaces = places.filter(place => String(place.institutionId) !== values.institutionId);
  const placeLabel = place => `${place.name}${place.status !== 'published' ? ' (borrador)' : ''}${place.hiddenAt ? ' (oculto)' : ''}`;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const { stops: stopRows, ...texts } = values;
    const clean = Object.fromEntries(Object.entries(texts).map(([key, value]) => [key, value.trim()]));
    const stops = checkStops(stopRows);
    const invalid = {};
    if (clean.title.length < 5 || clean.title.length > 180) invalid.title = 'Escribí entre 5 y 180 caracteres.';
    if (!clean.institutionId) invalid.institutionId = 'Elegí la institución a la que llega la ruta.';
    if (clean.originLabel.length < 3 || clean.originLabel.length > 180) invalid.originLabel = 'Escribí entre 3 y 180 caracteres.';
    if (!steps.length) invalid.steps = 'Escribí al menos un paso.';
    else if (steps.length > 20) invalid.steps = 'Usá hasta 20 pasos.';
    else if (steps.some(step => step.length > 300)) invalid.steps = 'Cada paso puede tener hasta 300 caracteres.';
    if (clean.durationLabel.length > 120) invalid.durationLabel = 'Usá hasta 120 caracteres.';
    if (!clean.sourceLabel) invalid.sourceLabel = clean.sourceType === 'official' ? 'Escribí el nombre del organismo.' : 'Escribí quién lo comprobó y cómo.';
    if (clean.sourceUrl && !/^https:\/\/\S+$/i.test(clean.sourceUrl)) invalid.sourceUrl = 'Usá un enlace completo que empiece con https://';
    if (clean.sourceType === 'official' && !clean.sourceUrl) invalid.sourceUrl = 'Pegá el enlace a la publicación oficial.';
    if (!clean.reviewedAt) invalid.reviewedAt = 'Indicá cuándo comprobaste el recorrido.';
    else if (clean.reviewedAt > today()) invalid.reviewedAt = 'La fecha no puede ser futura.';
    if (!stops.valid) invalid.stopRows = stops.errors;
    setErrors(invalid);
    if (Object.keys(invalid).length) { setError('Revisá los campos marcados.'); return; }
    const body = { ...clean, steps: steps.join('\n'), institutionId: Number(clean.institutionId), destinationPlaceId: clean.destinationPlaceId ? Number(clean.destinationPlaceId) : null, stops: stops.stops };
    setBusy(true);
    try {
      const response = route ? await moderationService.updateRoute(route.id, body) : await moderationService.createRoute(body);
      onSaved(response.data, route ? `Se guardaron los cambios de "${response.data.title}".` : `Se agregó la ruta "${response.data.title}".`);
      if (!route) setValues(empty());
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); }
    finally { setBusy(false); }
  }

  return <form className="admin-form route-form" onSubmit={submit} noValidate>
    <Field label="Título" name={`${prefix}-title`} value={values.title} onChange={event => set('title', event.target.value)} error={errors.title} required maxLength={180} disabled={busy} hint="Por ejemplo: Desde la terminal de ómnibus hasta el IPF"/>
    <div className="form-pair">
      <Field label="Institución" name={`${prefix}-institution`} value={values.institutionId} onChange={event => set('institutionId', event.target.value)} error={errors.institutionId} required disabled={busy}>
        <option value="">Elegí una institución</option>
        {institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Field>
      <Field label="Destino en el mapa" name={`${prefix}-destination`} value={values.destinationPlaceId} onChange={event => set('destinationPlaceId', event.target.value)} error={errors.destinationPlaceId} disabled={busy} hint="Opcional. Permite abrir el lugar en el mapa desde la ruta.">
        <option value="">Sin lugar del mapa</option>
        {ownPlaces.length > 0 && <optgroup label="De esta institución">{ownPlaces.map(place => <option key={place.id} value={place.id}>{placeLabel(place)}</option>)}</optgroup>}
        {otherPlaces.length > 0 && <optgroup label={values.institutionId ? 'Otros lugares' : 'Lugares del mapa'}>{otherPlaces.map(place => <option key={place.id} value={place.id}>{placeLabel(place)}</option>)}</optgroup>}
      </Field>
    </div>
    <div className="form-pair">
      <Field label="Punto de partida" name={`${prefix}-origin`} value={values.originLabel} onChange={event => set('originLabel', event.target.value)} error={errors.originLabel} required maxLength={180} disabled={busy} hint="Un lugar que se reconozca: la terminal, una plaza, una esquina."/>
      <Field label="Cómo se hace" name={`${prefix}-mode`} value={values.mode} onChange={event => set('mode', event.target.value)} error={errors.mode} disabled={busy}>
        {Object.entries(routeModes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Field>
    </div>
    <div className="field">
      <label htmlFor={`${prefix}-steps`}>Pasos <span aria-hidden="true">*</span></label>
      <textarea id={`${prefix}-steps`} rows="7" value={values.steps} disabled={busy} onChange={event => set('steps', event.target.value)}
        aria-invalid={!!errors.steps} aria-describedby={`${prefix}-steps-hint${errors.steps ? ` ${prefix}-steps-error` : ''}`}/>
      <small id={`${prefix}-steps-hint`}>Un paso o dato por línea (por ejemplo, un horario), con referencias de la calle. {steps.length} {steps.length === 1 ? 'paso' : 'pasos'} de 20.</small>
      {errors.steps && <small id={`${prefix}-steps-error`} className="field-error">{errors.steps}</small>}
    </div>
    {steps.length > 0 && <div className="steps-preview" aria-label="Así se van a ver los pasos">
      <ol className="route-steps">{steps.slice(0, 20).map((step, index) => <li key={index}>{step}</li>)}</ol>
    </div>}
    <RouteStopsEditor prefix={prefix} stops={values.stops} onChange={value => set('stops', value)} errors={errors.stopRows} error={errors.stops} disabled={busy}/>
    <Field label="Tiempo aproximado" name={`${prefix}-duration`} value={values.durationLabel} onChange={event => set('durationLabel', event.target.value)} error={errors.durationLabel} maxLength={120} disabled={busy}
      hint="Opcional. Si la fuente no es oficial, se muestra como aproximado y no como un dato exacto."/>
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
    <div className="form-pair">
      <Field label="Fuente" name={`${prefix}-label`} value={values.sourceLabel} onChange={event => set('sourceLabel', event.target.value)} error={errors.sourceLabel} required maxLength={250} disabled={busy}/>
      <Field label="Enlace" type="url" name={`${prefix}-url`} value={values.sourceUrl} onChange={event => set('sourceUrl', event.target.value)} error={errors.sourceUrl} required={values.sourceType === 'official'} maxLength={1000} disabled={busy} placeholder="https://"/>
    </div>
    <div className="form-pair">
      <Field label="Fecha de revisión" type="date" name={`${prefix}-reviewed`} value={values.reviewedAt} max={today()} onChange={event => set('reviewedAt', event.target.value)} error={errors.reviewedAt} required disabled={busy}/>
      <Field label="Estado" name={`${prefix}-status`} value={values.status} onChange={event => set('status', event.target.value)} error={errors.status} disabled={busy}>
        <option value="published">Publicada: la ven los estudiantes</option>
        <option value="draft">Borrador: solo la ve administración</option>
      </Field>
    </div>
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <div className="admin-buttons">
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : route ? 'Guardar cambios' : 'Agregar ruta'}</button>
      {onCancel && <button className="btn btn-outline" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
    </div>
  </form>;
}

// Rutas orientativas hacia las instituciones (FF-22), solo para administración. Cada alta o cambio queda en el historial.
export default function AdminRoutesPage() {
  usePageTitle('Rutas orientativas');
  const formRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const routeLoader = useCallback(signal => moderationService.routes(signal), []);
  const institutionLoader = useCallback(signal => catalogService.institutions(signal), []);
  const placeLoader = useCallback(signal => moderationService.places(signal), []);
  const routes = useFetch(routeLoader);
  const institutions = useFetch(institutionLoader);
  const places = useFetch(placeLoader);
  const scrollToForm = () => requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  function edit(route) { setNotice(null); setEditing(route); scrollToForm(); }
  function saved(route, message) { setNotice({ message, route }); setEditing(null); routes.retry(); scrollToForm(); }
  const ready = !institutions.loading && !places.loading;
  const failed = institutions.error || places.error;

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Moderación</p>
      <h1>Rutas orientativas.</h1>
      <p className="lead">Explicá cómo llegar a cada institución con referencias que se reconozcan en la calle. Cargá solo recorridos que alguien comprobó, con la fecha de revisión.</p>
    </header>
    <ModerationNav/>
    <section className="admin-card" ref={formRef} aria-labelledby="route-form-title">
      <h2 id="route-form-title">{editing ? `Editar «${editing.title}»` : 'Agregar una ruta'}</h2>
      {notice && <p className="report-done" role="status">{notice.message} {notice.route.status === 'published' && !notice.route.hiddenAt && <Link to={`/rutas/${notice.route.id}`}>Ver la ruta</Link>}</p>}
      {!ready ? <Loading text="Preparando el formulario…"/>
        : failed ? <ErrorMessage message={failed.message} retry={() => { institutions.retry(); places.retry(); }}/>
        : <RouteForm key={editing?.id ?? 'new'} route={editing} institutions={institutions.result.data} places={places.result.data} onSaved={saved} onCancel={editing ? () => setEditing(null) : null}/>}
    </section>

    <section className="admin-section" aria-labelledby="route-list-title">
      <h2 id="route-list-title">Rutas cargadas</h2>
      {routes.loading ? <Loading text="Cargando rutas…"/>
        : routes.error ? <ErrorMessage message={routes.error.message} retry={routes.retry}/>
        : routes.result.data.length ? <ul className="admin-list">{routes.result.data.map(route => <li className="admin-row" key={route.id}>
          <div className="admin-row-main">
            <p className="card-category">{routeModes[route.mode]} · {route.institution?.name}</p>
            <h3>{route.title}</h3>
            <p>Desde {route.originLabel}{route.destination ? ` hasta ${route.destination.name}` : ''} · {stepsOf(route.steps).length} pasos{route.stops?.length ? ` · ${route.stops.length} ${route.stops.length === 1 ? 'parada' : 'paradas'}` : ''}</p>
            <div className="admin-badges">
              <span className={sourceBadge[route.sourceType]}>{sourceNames[route.sourceType]}</span>
              {route.status !== 'published' && <span className="badge badge-soon">Borrador</span>}
              {route.hiddenAt && <span className="badge badge-hidden">Oculta por moderación</span>}
              <span className="card-meta">{route.reviewedAt ? `Revisada el ${formatDate(route.reviewedAt)}` : 'Sin fecha de revisión'}</span>
            </div>
          </div>
          <div className="admin-buttons">
            {route.status === 'published' && !route.hiddenAt && <Link className="btn btn-outline btn-small" to={`/rutas/${route.id}`}>Ver<span className="sr-only"> {route.title}</span></Link>}
            <button className="btn btn-outline btn-small" type="button" onClick={() => edit(route)}>Editar<span className="sr-only"> {route.title}</span></button>
          </div>
        </li>)}</ul>
        : <div className="empty"><h3>Todavía no hay rutas</h3><p>Cuando alguien del equipo compruebe un recorrido hasta una institución, cargalo con el formulario de arriba.</p></div>}
    </section>
  </div>;
}
