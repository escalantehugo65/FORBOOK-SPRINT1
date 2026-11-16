import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import Field from '../components/Field';
import ProfileView from '../components/ProfileView';
import { BlockedPeople } from '../components/BlockActions';
import AvatarUploader from '../components/AvatarUploader';
import { avatarColors, bannerStyles, interestNames, maxInterests, initials } from '../utils/profile';

const currentYear = new Date().getFullYear();

// Formulario para editar y decorar el perfil propio. Las opciones son listas cerradas.
function EditProfile({ profile, onSaved, onCancel }) {
  const { reloadUser } = useAuth();
  const [values, setValues] = useState({
    bio: profile.bio || '', avatarColor: profile.avatarColor, bannerStyle: profile.bannerStyle, interests: profile.interests,
    cohortYear: profile.cohortYear ? String(profile.cohortYear) : '', showOrigin: profile.settings.showOrigin, showArrival: profile.settings.showArrival,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setError(''); };
  const toggleInterest = item => set('interests', values.interests.includes(item) ? values.interests.filter(value => value !== item) : [...values.interests, item]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = {};
    if (values.bio.trim().length > 280) invalid.bio = 'Usá hasta 280 caracteres.';
    if (values.interests.length > maxInterests) invalid.interests = `Elegí hasta ${maxInterests} intereses.`;
    const year = values.cohortYear ? Number(values.cohortYear) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1990 || year > currentYear + 1)) invalid.cohortYear = `Escribí un año entre 1990 y ${currentYear + 1}.`;
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      const { data } = await profileService.update({ ...values, bio: values.bio.trim(), cohortYear: year });
      await reloadUser(); // el avatar del encabezado toma el color nuevo
      onSaved(data);
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); }
    finally { setBusy(false); }
  }

  return <form className="profile-card profile-form" onSubmit={submit} noValidate aria-labelledby="edit-title">
    <h2 id="edit-title">Editar y decorar tu perfil</h2>
    <div className="field">
      <label htmlFor="profile-bio">Descripción</label>
      <textarea id="profile-bio" rows="3" maxLength={280} value={values.bio} disabled={busy} onChange={event => set('bio', event.target.value)} aria-describedby="profile-bio-hint" aria-invalid={!!errors.bio}/>
      <small id="profile-bio-hint">{values.bio.length}/280 · Por ejemplo: de dónde venís y qué estudiás. No pongas teléfono, dirección ni otros datos personales.</small>
      {errors.bio && <small className="field-error">{errors.bio}</small>}
    </div>

    <fieldset className="choice-group" disabled={busy}>
      <legend>Color del avatar</legend>
      <div className="swatch-row">{Object.entries(avatarColors).map(([value, label]) => <label key={value} className="swatch-option">
        <input type="radio" name="avatarColor" value={value} checked={values.avatarColor === value} onChange={() => set('avatarColor', value)}/>
        <span className={`avatar avatar-${value}`} aria-hidden="true">{initials(profile.name)}</span><span>{label}</span>
      </label>)}</div>
      <small>Se ve cuando no tenés foto de perfil.</small>
    </fieldset>

    <fieldset className="choice-group" disabled={busy}>
      <legend>Fondo del perfil</legend>
      <div className="banner-options">{Object.entries(bannerStyles).map(([value, label]) => <label key={value} className="banner-option">
        <input type="radio" name="bannerStyle" value={value} checked={values.bannerStyle === value} onChange={() => set('bannerStyle', value)}/>
        <span className={`banner-preview banner-${value}`} aria-hidden="true"/><span>{label}</span>
      </label>)}</div>
      {profile.decorations?.banner && <small>Ahora tenés puesto un fondo de la tienda: se ve ese. Podés sacártelo en Tienda → Mis decoraciones.</small>}
    </fieldset>

    <fieldset className="choice-group" disabled={busy} aria-describedby="interests-hint">
      <legend>Intereses</legend>
      <div className="interest-options">{Object.entries(interestNames).map(([value, label]) => {
        const checked = values.interests.includes(value);
        return <label key={value} className="interest-option">
          <input type="checkbox" checked={checked} disabled={!checked && values.interests.length >= maxInterests} onChange={() => toggleInterest(value)}/>{label}
        </label>;
      })}</div>
      <small id="interests-hint">{values.interests.length}/{maxInterests} elegidos</small>
      {errors.interests && <small className="field-error">{errors.interests}</small>}
    </fieldset>

    <Field label="Año de ingreso" name="cohortYear" type="number" inputMode="numeric" min="1990" max={currentYear + 1} value={values.cohortYear} disabled={busy} onChange={event => set('cohortYear', event.target.value)} error={errors.cohortYear} hint="Opcional. Se muestra como “Cohorte 2026”."/>

    <fieldset className="choice-group" disabled={busy}>
      <legend>Privacidad</legend>
      <label className="choice"><input type="checkbox" checked={values.showOrigin} onChange={event => set('showOrigin', event.target.checked)}/>Mostrar de dónde vengo</label>
      <label className="choice"><input type="checkbox" checked={values.showArrival} onChange={event => set('showArrival', event.target.checked)}/>Mostrar si ya llegué a Formosa</label>
      <small>Tu correo nunca se muestra. Tu nombre, institución y carrera sí.</small>
    </fieldset>

    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <div className="admin-buttons">
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      <button className="btn btn-outline" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
    </div>
  </form>;
}

function ChangePassword() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', repeat: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: undefined })); setMessage(''); };
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = {};
    if (!values.currentPassword) invalid.currentPassword = 'Escribí tu contraseña actual.';
    if (values.newPassword.length < 10 || values.newPassword.length > 72) invalid.newPassword = 'Usá entre 10 y 72 caracteres.';
    if (values.repeat !== values.newPassword) invalid.repeat = 'Las contraseñas no coinciden.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      const { data } = await profileService.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setMessage(data.message); setValues({ currentPassword: '', newPassword: '', repeat: '' });
    } catch (failure) { setErrors(failure.fields || { currentPassword: failure.message }); }
    finally { setBusy(false); }
  }
  return <form className="profile-card profile-form" onSubmit={submit} noValidate aria-labelledby="password-title">
    <h2 id="password-title">Cambiar la contraseña</h2>
    <Field label="Contraseña actual" name="currentPassword" type="password" autoComplete="current-password" value={values.currentPassword} disabled={busy} onChange={event => set('currentPassword', event.target.value)} error={errors.currentPassword}/>
    <Field label="Contraseña nueva" name="newPassword" type="password" autoComplete="new-password" value={values.newPassword} disabled={busy} onChange={event => set('newPassword', event.target.value)} error={errors.newPassword} hint="Entre 10 y 72 caracteres."/>
    <Field label="Repetí la contraseña nueva" name="repeat" type="password" autoComplete="new-password" value={values.repeat} disabled={busy} onChange={event => set('repeat', event.target.value)} error={errors.repeat}/>
    {message && <p className="report-done" role="status">{message}</p>}
    <div className="admin-buttons"><button className="btn btn-outline" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button></div>
  </form>;
}

// Perfil propio (/perfil).
export default function ProfilePage() {
  usePageTitle('Mi perfil');
  const loader = useCallback(signal => profileService.mine(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const formRef = useRef(null);
  const photoInput = useRef(null);
  useEffect(() => { if (result) setProfile(result.data); }, [result]);
  useEffect(() => { if (editing) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [editing]);

  if (loading || (!profile && !error)) return <div className="container page"><Loading text="Cargando tu perfil…"/></div>;
  if (error) return <div className="container page"><ErrorMessage message={error.message} retry={retry}/></div>;
  return <div className="container page">
    <ProfileView profile={profile} onChangePhoto={() => photoInput.current?.click()}
      actions={!editing && <button className="btn btn-primary btn-small" type="button" onClick={() => { setEditing(true); setNotice(''); }}>Editar perfil</button>}/>
    {notice && <p className="report-done profile-notice" role="status">{notice}</p>}
    <div className="profile-settings" ref={formRef}>
      {editing && <EditProfile profile={profile} onCancel={() => setEditing(false)} onSaved={saved => { setProfile(saved); setEditing(false); setNotice('Listo, guardamos tu perfil.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>}
      <AvatarUploader profile={profile} inputRef={photoInput} onChanged={avatarVersion => setProfile(previous => ({ ...previous, avatarVersion }))}/>
      <ChangePassword/>
      <BlockedPeople/>
    </div>
  </div>;
}
