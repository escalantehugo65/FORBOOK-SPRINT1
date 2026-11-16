import { useCallback, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profile';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ProfileView from '../components/ProfileView';
import ReportAction from '../components/ReportAction';
import { warningReasons } from '../utils/profile';

// Herramientas de moderación sobre un perfil: advertir, revocar advertencias, ocultar la descripción y quitar la foto.
function ModerationTools({ profile, onChanged }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [internal, setInternal] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action) {
    setBusy(true); setError(''); setMessage('');
    try { const { data } = await action(); setMessage(data.message); setReason(''); setNote(''); setInternal(''); onChanged(); }
    catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); }
    finally { setBusy(false); }
  }
  function warn(event) {
    event.preventDefault();
    if (!reason) { setError('Elegí un motivo.'); return; }
    if (note.trim().length < 10) { setError('Explicá el motivo en al menos 10 caracteres: lo va a leer la persona advertida.'); return; }
    run(() => profileService.warn(profile.id, { reason, note: note.trim() }));
  }
  // Ocultar o mostrar la descripción y revocar advertencias piden un motivo interno.
  function withInternal(action) {
    if (internal.trim().length < 5) { setError('Escribí el motivo interno (al menos 5 caracteres) antes de hacer este cambio.'); return; }
    run(() => action({ note: internal.trim() }));
  }
  return <section className="profile-card moderation-tools" aria-labelledby="tools-title">
    <h2 id="tools-title">Moderación</h2>
    <form onSubmit={warn} noValidate>
      <h3 className="profile-subtitle">Dar una advertencia</h3>
      <div className="field">
        <label htmlFor="warning-reason">Motivo</label>
        <select id="warning-reason" value={reason} disabled={busy} onChange={event => { setReason(event.target.value); setError(''); }}>
          <option value="">Elegí un motivo</option>
          {Object.entries(warningReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="warning-note">Explicación para la persona</label>
        <textarea id="warning-note" rows="2" maxLength={450} value={note} disabled={busy} onChange={event => { setNote(event.target.value); setError(''); }} aria-describedby="warning-note-hint"/>
        <small id="warning-note-hint">La ven la persona advertida y moderación. El resto ve solo el motivo y la fecha.</small>
      </div>
      <div className="admin-buttons"><button className="btn btn-danger btn-small" type="submit" disabled={busy}>Dar advertencia</button></div>
    </form>
    {(profile.bio || profile.avatarVersion || profile.warnings.length > 0) && <div className="tool-group">
      <h3 className="profile-subtitle">Otras acciones</h3>
      <div className="field">
        <label htmlFor="internal-note">Motivo interno</label>
        <input id="internal-note" maxLength={500} value={internal} disabled={busy} onChange={event => { setInternal(event.target.value); setError(''); }} aria-describedby="internal-note-hint"/>
        <small id="internal-note-hint">Queda en el historial de moderación.</small>
      </div>
      <div className="admin-buttons">
        {profile.bio && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => withInternal(body => profileService.setBio(profile.id, !profile.bioHidden, body))}>{profile.bioHidden ? 'Mostrar la descripción' : 'Ocultar la descripción'}</button>}
        {profile.avatarVersion && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => withInternal(body => profileService.removeAvatarByModeration(profile.id, body))}>Quitar la foto de perfil</button>}
        {profile.warnings.map(warning => <button key={warning.id} className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => withInternal(body => profileService.revokeWarning(warning.id, body))}>Revocar: {warningReasons[warning.reason].toLowerCase()}</button>)}
      </div>
    </div>}
    {error && <p className="report-error" role="alert">{error}</p>}
    {message && <p className="report-done" role="status">{message}</p>}
  </section>;
}

// Perfil de otra persona (/usuarios/:id). El propio redirige a /perfil.
export default function UserProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const loader = useCallback(signal => profileService.user(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const profile = result?.data;
  usePageTitle(profile?.name || 'Perfil');
  if (String(user.id) === id) return <Navigate to="/perfil" replace/>;
  if (loading) return <div className="container page"><Loading text="Cargando el perfil…"/></div>;
  if (error) return <div className="container page"><ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/></div>;
  return <div className="container page">
    <ProfileView profile={profile}/>
    <div className="profile-settings">
      {profile.canModerate && <ModerationTools profile={profile} onChanged={retry}/>}
      <ReportAction targetType="profile" targetId={profile.id} label="Reportar este perfil" reasons={['offensive', 'personal_data', 'spam', 'false', 'other']} className="profile-report"/>
    </div>
  </div>;
}
