import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { communityService } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Field from '../components/Field';
import { ArrowIcon } from '../components/Icons';
import { communityInitials } from '../components/CommunityCard';
import { colorNames, topicNames, topicOrder } from '../utils/communities';

const empty = { name: '', description: '', rules: '', topic: 'barrio', color: 'azul' };

function CommunityForm({ community }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => community ? { name: community.name, description: community.description, rules: community.rules || '', topic: community.topic, color: community.color } : empty);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const clean = { ...values, name: values.name.trim(), description: values.description.trim(), rules: values.rules.trim() };
    const invalid = {};
    if (clean.name.length < 3 || clean.name.length > 60) invalid.name = 'Escribí entre 3 y 60 caracteres.';
    if (clean.description.length < 10 || clean.description.length > 300) invalid.description = 'Contá de qué se trata en 10 a 300 caracteres.';
    if (clean.rules.length > 1000) invalid.rules = 'Usá hasta 1000 caracteres.';
    setErrors(invalid);
    if (Object.keys(invalid).length) { setError('Revisá los campos marcados.'); return; }
    setBusy(true);
    try {
      const { data } = community ? await communityService.update(community.id, clean) : await communityService.create(clean);
      navigate(`/comunidades/${data.id}`, { replace: true });
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); setBusy(false); }
  }

  return <form className="admin-form community-form" onSubmit={submit} noValidate>
    <div className="community-form-preview" aria-hidden="true">
      <div className={`community-cover tone-${values.color}`}><span>{communityInitials(values.name.trim() || 'Tu comunidad')}</span></div>
      <div><strong>{values.name.trim() || 'Tu comunidad'}</strong><span>{topicNames[values.topic]}</span></div>
    </div>
    <Field label="Nombre" name="community-name" value={values.name} onChange={event => set('name', event.target.value)} error={errors.name} required maxLength={60} disabled={busy} hint="Por ejemplo: Personas de San Francisco, Mecatrónica 2026, Fútbol los sábados."/>
    <div className="field">
      <label htmlFor="community-description">De qué se trata <span aria-hidden="true">*</span></label>
      <textarea id="community-description" rows="3" maxLength={300} value={values.description} disabled={busy} onChange={event => set('description', event.target.value)} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'community-description-error' : 'community-description-hint'}/>
      <small id="community-description-hint">Se ve en la lista de comunidades. {values.description.trim().length} de 300.</small>
      {errors.description && <small id="community-description-error" className="field-error">{errors.description}</small>}
    </div>
    <div className="form-pair">
      <Field label="Tema" name="community-topic" value={values.topic} onChange={event => set('topic', event.target.value)} error={errors.topic} disabled={busy}>
        {topicOrder.map(key => <option key={key} value={key}>{topicNames[key]}</option>)}
      </Field>
      <fieldset className="choice-group" disabled={busy}>
        <legend>Color de la portada</legend>
        <div className="tone-picker">
          {Object.entries(colorNames).map(([key, label]) => <label key={key} className={`tone-option tone-${key}${values.color === key ? ' is-selected' : ''}`}>
            <input type="radio" name="community-color" value={key} checked={values.color === key} onChange={() => set('color', key)}/><span className="sr-only">{label}</span>
          </label>)}
        </div>
      </fieldset>
    </div>
    <div className="field">
      <label htmlFor="community-rules">Reglas de la comunidad</label>
      <textarea id="community-rules" rows="4" maxLength={1000} value={values.rules} disabled={busy} onChange={event => set('rules', event.target.value)} aria-invalid={!!errors.rules} aria-describedby="community-rules-hint"/>
      <small id="community-rules-hint">Opcional. Se suman a las reglas de Forbook, no las reemplazan.</small>
      {errors.rules && <small className="field-error">{errors.rules}</small>}
    </div>
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <div className="admin-buttons">
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : community ? 'Guardar cambios' : 'Crear comunidad'}</button>
      <Link className="btn btn-outline" to={community ? `/comunidades/${community.id}?ver=ajustes` : '/comunidades'}>Cancelar</Link>
    </div>
  </form>;
}

// Crear una comunidad (/comunidades/nueva) o editar una propia (/comunidades/:id/editar).
export default function CommunityFormPage() {
  const { id } = useParams();
  usePageTitle(id ? 'Editar comunidad' : 'Crear comunidad');
  const loader = useCallback(signal => (id ? communityService.detail(id, signal) : communityService.list({ scope: 'mine' }, signal)), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const back = <Link className="back-link" to={id ? `/comunidades/${id}` : '/comunidades'}><ArrowIcon/>{id ? 'Volver a la comunidad' : 'Volver a las comunidades'}</Link>;
  const blocked = result && (id ? !result.data.abilities.canEdit : !result.meta.canCreate);

  return <div className="container page">
    {back}
    <header className="page-header">
      <p className="eyebrow">Comunidades</p>
      <h1>{id ? 'Editar la comunidad.' : 'Creá tu comunidad.'}</h1>
      {!id && <p className="lead">Vas a ser quien la administra: podés nombrar administradores, crear roles y cuidar el chat. Cada estudiante puede tener hasta 2.</p>}
    </header>
    {loading ? <Loading/>
      : error ? <ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/>
      : blocked ? <ErrorMessage message={id ? 'Solo quien creó la comunidad puede editarla.' : `Ya tenés ${result.meta.owned} comunidades propias, el máximo. Cerrá una para crear otra.`}/>
      : <CommunityForm community={id ? result.data : null}/>}
  </div>;
}
