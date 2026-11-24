import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../services/admin';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import Avatar from '../components/Avatar';
import Field from '../components/Field';
import NoteAction from '../components/NoteAction';
import { ArrowIcon } from '../components/Icons';
import { formatDateTime } from '../utils/moderation';
import { formatDate } from '../utils/content';
import { formatPoints, reasonNames as pointReasons } from '../utils/shop';
import { accountStateNames, appealStatusNames, sanctionLine, sanctionReasonNames, sanctionTypeNames } from '../utils/sanctions';
import { pointsError, roleNames, sanctionDays, sanctionErrors } from '../utils/admin';

const sanctionReasonsForAdmin = ['harassment', 'offensive', 'spam', 'false', 'personal_data', 'other'];

function RoleForm({ person, onDone }) {
  const [role, setRole] = useState(person.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (role === person.role) return;
    setBusy(true); setError('');
    try { const result = await adminService.setRole(person.id, role); onDone(result.message); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <form className="admin-form" onSubmit={submit} noValidate>
    <h3 className="profile-subtitle">Rol</h3>
    <div className="admin-inline">
      <Field label="Rol de la cuenta" name="admin-role" value={role} disabled={busy || person.own} onChange={event => { setRole(event.target.value); setError(''); }}>
        {Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Field>
      <button className="btn btn-primary btn-small" type="submit" disabled={busy || person.own || role === person.role}>{busy ? 'Guardando…' : 'Cambiar rol'}</button>
    </div>
    {person.own && <small>No podés cambiar tu propio rol.</small>}
    {error && <p className="report-error" role="alert">{error}</p>}
  </form>;
}

function SanctionForm({ person, onDone }) {
  const [values, setValues] = useState({ type: 'suspension', reason: '', note: '', days: '7' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = event => { const { name, value } = event.target; setValues(previous => ({ ...previous, [name]: value })); setErrors(previous => ({ ...previous, [name]: undefined })); setError(''); };
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const invalid = sanctionErrors(values);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true); setError('');
    try {
      const body = { type: values.type, reason: values.reason, note: values.note.trim(), ...(values.type === 'ban' ? {} : { days: Number(values.days) }) };
      const result = await adminService.sanction(person.id, body);
      setValues({ type: 'suspension', reason: '', note: '', days: '7' });
      onDone(result.message);
    } catch (failure) { setError(failure.message); setErrors(failure.fields || {}); }
    finally { setBusy(false); }
  }
  if (person.role === 'admin') return <p className="panel-note">Las cuentas de administración no se pueden sancionar. Si hace falta, primero cambiale el rol.</p>;
  return <form className="admin-form" onSubmit={submit} noValidate>
    <h3 className="profile-subtitle">Sancionar</h3>
    <fieldset className="choice-group" disabled={busy}>
      <legend>Tipo</legend>
      <div className="admin-inline">{['restriction', 'suspension', 'ban'].map(type => <label className="choice" key={type}>
        <input type="radio" name="type" value={type} checked={values.type === type} onChange={change}/>{sanctionTypeNames[type]}
      </label>)}</div>
      {errors.type && <small className="field-error">{errors.type}</small>}
    </fieldset>
    <Field label="Motivo" name="reason" value={values.reason} onChange={change} error={errors.reason} disabled={busy} required>
      <option value="">Elegí un motivo</option>
      {sanctionReasonsForAdmin.map(value => <option key={value} value={value}>{sanctionReasonNames[value]}</option>)}
    </Field>
    {values.type !== 'ban' && <Field label="Duración" name="days" value={values.days} onChange={change} error={errors.days} disabled={busy} required>
      {sanctionDays.map(days => <option key={days} value={days}>{days === 1 ? '1 día' : `${days} días`}</option>)}
    </Field>}
    <div className="field">
      <label htmlFor="sanction-note">Explicación para la persona <span aria-hidden="true">*</span></label>
      <textarea id="sanction-note" name="note" rows="3" maxLength={450} value={values.note} disabled={busy} onChange={change} aria-invalid={!!errors.note} aria-describedby="sanction-note-hint"/>
      <small id="sanction-note-hint">{values.note.trim().length}/450 · La ve la persona sancionada.</small>
      {errors.note && <small className="field-error">{errors.note}</small>}
    </div>
    {error && <p className="report-error" role="alert">{error}</p>}
    <div className="admin-buttons"><button className="btn btn-danger btn-small" type="submit" disabled={busy}>{busy ? 'Aplicando…' : values.type === 'ban' ? 'Dar de baja la cuenta' : `Aplicar ${sanctionTypeNames[values.type].toLowerCase()}`}</button></div>
  </form>;
}

function PointsForm({ person, onDone }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const invalid = pointsError(amount) || (note.trim().length < 5 ? 'Escribí el motivo en 5 a 500 caracteres.' : '');
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError('');
    try { const result = await adminService.points(person.id, { amount: Number(amount), note: note.trim() }); setAmount(''); setNote(''); onDone(result.message); }
    catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); }
    finally { setBusy(false); }
  }
  return <form className="admin-form" onSubmit={submit} noValidate>
    <h3 className="profile-subtitle">Puntos</h3>
    <p className="panel-note">Saldo actual: {formatPoints(person.points)} puntos. Ajustar puntos no cambia la reputación ni el nivel.</p>
    <div className="admin-inline">
      <Field label="Cantidad (negativa para restar)" name="points-amount" type="number" inputMode="numeric" min={-1000} max={1000} step={1} value={amount} disabled={busy} onChange={event => { setAmount(event.target.value); setError(''); }}/>
      <Field label="Motivo" name="points-note" value={note} maxLength={500} disabled={busy} onChange={event => { setNote(event.target.value); setError(''); }}/>
      <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Ajustar'}</button>
    </div>
    {error && <p className="report-error" role="alert">{error}</p>}
  </form>;
}

function HistoryItem({ item, onRevoke }) {
  const active = item.kind === 'warning' ? !item.revoked : item.active;
  return <li className={`sanction-item${active ? '' : ' is-past'}`}>
    <div className="sanction-top">
      <strong>{item.kind === 'warning' ? 'Advertencia' : sanctionLine(item)}</strong>
      <span className="badge badge-warn">{sanctionReasonNames[item.reason]}</span>
      {item.revoked ? <span className="badge badge-official">Revocada</span> : !active && <span className="badge badge-soon">Terminó</span>}
      {item.appeal && <span className="badge badge-community">{appealStatusNames[item.appeal.status]}</span>}
    </div>
    <p className="card-meta">{formatDateTime(item.createdAt)} · {item.moderator}</p>
    {item.note && <p className="sanction-note">{item.note}</p>}
    {active && <NoteAction label="Revocar" confirmLabel="Revocar" action={onRevoke} onDone={null}/>}
  </li>;
}

// /admin/usuarios/:id: todo sobre una cuenta y las acciones de administración.
export default function AdminUserPage() {
  const { id } = useParams();
  const loader = useCallback(signal => adminService.user(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const person = result?.data;
  usePageTitle(person?.name || 'Cuenta');
  const back = <Link className="back-link" to="/admin/usuarios"><ArrowIcon/>Volver a Usuarios</Link>;
  if (loading && !person) return <div className="container page">{back}<Loading text="Cargando la cuenta…"/></div>;
  if (error) return <div className="container page">{back}<ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/></div>;
  const done = message => { setNotice(message); retry(); };
  const revoke = (kind, itemId) => async note => {
    const response = kind === 'warning' ? await adminService.revokeWarning(itemId, note) : await adminService.revokeSanction(itemId, note);
    done(response.message || response.data?.message);
    return response;
  };
  const counts = [['Preguntas', person.counts.questions], ['Respuestas', person.counts.answers], ['Fichas', person.counts.contents], ['Comunidades que creó', person.counts.communities], ['Mensajes', person.counts.messages], ['Reportes a su perfil', person.counts.reports]];
  return <div className="container page">
    {back}
    <header className="page-header admin-person">
      <Avatar person={person} size="large"/>
      <div>
        <p className="eyebrow">{roleNames[person.role]} · <span className={`badge state-badge state-${person.state}`}>{accountStateNames[person.state]}</span></p>
        <h1>{person.name}</h1>
        <small>{person.email} · {[person.institution, person.career].filter(Boolean).join(' · ')} · En Forbook desde el {formatDate(person.createdAt)}</small>
        <div className="admin-buttons"><Link className="btn btn-outline btn-small" to={`/usuarios/${person.id}`}>Ver el perfil público</Link></div>
      </div>
    </header>
    <ModerationNav/>
    {notice && <p className="report-done" role="status">{notice}</p>}
    <div className="admin-detail-grid">
      <div>
        <section className="profile-card" aria-labelledby="history-title">
          <h2 id="history-title">Sanciones y advertencias</h2>
          {person.sanctions.length || person.warnings.length ? <div className="sanction-list">
            {person.sanctions.length > 0 && <ul>{person.sanctions.map(item => <HistoryItem key={`s${item.id}`} item={item} onRevoke={revoke('sanction', item.id)}/>)}</ul>}
            {person.warnings.length > 0 && <ul>{person.warnings.map(item => <HistoryItem key={`w${item.id}`} item={item} onRevoke={revoke('warning', item.id)}/>)}</ul>}
          </div> : <p className="profile-empty">Nunca recibió advertencias ni sanciones.</p>}
          <p className="panel-note">Revocar una advertencia devuelve sus puntos y levanta la sanción automática que ya no corresponda.</p>
        </section>
        <section className="profile-card" aria-labelledby="movements-title">
          <h2 id="movements-title">Últimos movimientos de puntos</h2>
          {person.movements.length ? <ul className="activity-list admin-movements">{person.movements.map(movement => <li key={movement.id}>
            <span>{pointReasons[movement.reason] || movement.reason} · {formatDateTime(movement.createdAt)}</span>
            <span className={movement.amount >= 0 ? 'plus' : 'minus'}>{movement.amount >= 0 ? '+' : ''}{movement.amount}</span>
          </li>)}</ul> : <p className="profile-empty">Sin movimientos.</p>}
        </section>
      </div>
      <div>
        <section className="profile-card" aria-labelledby="counts-title">
          <h2 id="counts-title">Actividad</h2>
          <dl className="profile-stats">{counts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
        <section className="profile-card" aria-labelledby="actions-title">
          <h2 id="actions-title">Acciones</h2>
          <RoleForm key={person.role} person={person} onDone={done}/>
          {!person.own && <SanctionForm person={person} onDone={done}/>}
          <PointsForm person={person} onDone={done}/>
        </section>
        {!person.own && <section className="profile-card danger-card" aria-labelledby="delete-user-title">
          <h2 id="delete-user-title">Borrar la cuenta</h2>
          {person.role === 'admin'
            ? <p className="panel-note">Las cuentas de administración no se pueden borrar. Si hace falta, primero cambiale el rol.</p>
            : <>
              <p className="panel-note">Se borran su nombre, su correo, su foto, su descripción y sus amistades, y se cierran sus sesiones. Lo que publicó queda como «Cuenta eliminada». No se puede deshacer.</p>
              <NoteAction label="Borrar la cuenta" confirmLabel="Sí, borrar la cuenta" danger placeholder="Motivo (queda en el historial)"
                action={note => adminService.deleteUser(person.id, note)}
                onDone={message => navigate('/admin/usuarios', { state: { notice: message } })}/>
            </>}
        </section>}
      </div>
    </div>
  </div>;
}
