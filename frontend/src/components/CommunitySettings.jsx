import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { communityService } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage } from './Feedback';
import Avatar from './Avatar';
import Field from './Field';
import { colorNames } from '../utils/communities';

const emptyRole = { name: '', color: 'azul', canModerate: false };

// Formulario de un rol propio de la comunidad. El permiso de moderar solo lo da quien la creó.
function RoleForm({ community, role, onSaved, onCancel }) {
  const [values, setValues] = useState(role ? { name: role.name, color: role.color, canModerate: role.canModerate } : emptyRole);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prefix = role ? `role-${role.id}` : 'role-new';
  const canEdit = community.abilities.canEdit;
  async function submit(event) {
    event.preventDefault();
    const name = values.name.trim();
    if (name.length < 2 || name.length > 30) { setError('El nombre del rol debe tener entre 2 y 30 caracteres.'); return; }
    setBusy(true); setError('');
    try {
      const body = { ...values, name };
      const result = role ? await communityService.updateRole(community.id, role.id, body) : await communityService.createRole(community.id, body);
      if (!role) setValues(emptyRole);
      onSaved(result.message);
    } catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); }
    finally { setBusy(false); }
  }
  return <form className="role-form" onSubmit={submit} noValidate>
    <div className="form-pair">
      <Field label="Nombre del rol" name={`${prefix}-name`} value={values.name} maxLength={30} required disabled={busy} onChange={event => { setValues(previous => ({ ...previous, name: event.target.value })); setError(''); }} hint={role ? undefined : 'Por ejemplo: Veterano, Ayudante, Recién llegado.'}/>
      <Field label="Color" name={`${prefix}-color`} value={values.color} disabled={busy} onChange={event => setValues(previous => ({ ...previous, color: event.target.value }))}>
        {Object.entries(colorNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </Field>
    </div>
    <label className="check-line">
      <input type="checkbox" checked={values.canModerate} disabled={busy || !canEdit} onChange={event => setValues(previous => ({ ...previous, canModerate: event.target.checked }))}/>
      <span>Puede borrar mensajes de otras personas{!canEdit && <small> (solo lo decide quien creó la comunidad)</small>}</span>
    </label>
    <p className="role-preview">Así se ve: <span className={`role-chip tone-${values.color}`}>{values.name.trim() || 'Rol'}</span></p>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="admin-buttons">
      <button className="btn btn-primary btn-small" type="submit" disabled={busy}>{busy ? 'Guardando…' : role ? 'Guardar rol' : 'Crear rol'}</button>
      {onCancel && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
    </div>
  </form>;
}

function Banned({ community, onChanged }) {
  const loader = useCallback(signal => communityService.members(community.id, { status: 'banned' }, signal), [community.id]);
  const { result, loading, error, retry } = useFetch(loader);
  const [busy, setBusy] = useState(null);
  const [failure, setFailure] = useState('');
  async function unban(member) {
    setBusy(member.userId); setFailure('');
    try { const data = await communityService.unban(community.id, member.userId); onChanged(data.message); retry(); } catch (problem) { setFailure(problem.message); } finally { setBusy(null); }
  }
  if (loading) return <Loading text="Cargando…"/>;
  if (error) return <ErrorMessage message={error.message} retry={retry}/>;
  if (!result.data.length) return <p className="panel-note">No hay personas expulsadas.</p>;
  return <>
    {failure && <p className="field-error" role="alert">{failure}</p>}
    <ul className="member-list">{result.data.map(member => <li className="member-row" key={member.userId}>
      <Link className="member-person" to={`/usuarios/${member.userId}`}><Avatar person={{ id: member.userId, ...member }}/><span>{member.name}<small>Expulsada de la comunidad</small></span></Link>
      <div className="member-actions"><button className="btn btn-outline btn-small" type="button" disabled={busy === member.userId} onClick={() => unban(member)}>Permitir que vuelva<span className="sr-only">: {member.name}</span></button></div>
    </li>)}</ul>
  </>;
}

// Administrar la comunidad: roles, personas expulsadas, datos y cierre.
// Los roles los manejan quien la creó, sus administradores y la administración de Forbook.
export default function CommunitySettings({ community, onChanged }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const { canEdit } = community.abilities;
  const full = community.roles.length >= 10;
  function changed(message) { setNotice(message); setError(''); setEditing(null); onChanged(); }
  async function removeRole(role) {
    setBusy(true); setError('');
    try { changed((await communityService.deleteRole(community.id, role.id)).message); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function close() {
    setBusy(true); setError('');
    try { await communityService.close(community.id); navigate('/comunidades', { replace: true }); } catch (failure) { setError(failure.message); setBusy(false); }
  }

  return <div className="community-settings">
    {notice && <p className="report-done" role="status">{notice}</p>}
    {error && <div className="alert" role="alert"><p>{error}</p></div>}
    <section className="community-panel" aria-labelledby="roles-title">
      <h2 id="roles-title">Roles</h2>
      <p className="panel-note">La jerarquía es fija: quien creó la comunidad, sus administradores y los miembros. Los roles son títulos propios de esta comunidad que se ven en el chat; algunos pueden tener permiso para borrar mensajes. Se asignan desde Miembros.</p>
      {community.roles.length > 0 && <ul className="role-list">{community.roles.map(role => <li key={role.id} className="role-row">
        {editing === role.id
          ? <RoleForm community={community} role={role} onSaved={changed} onCancel={() => setEditing(null)}/>
          : <>
            <div><span className={`role-chip tone-${role.color}`}>{role.name}</span>{role.canModerate && <span className="badge badge-official">Puede moderar</span>}</div>
            {(canEdit || !role.canModerate) && <div className="admin-buttons">
              <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => { setEditing(role.id); setNotice(''); }}>Editar<span className="sr-only"> el rol {role.name}</span></button>
              <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => removeRole(role)}>Borrar<span className="sr-only"> el rol {role.name}</span></button>
            </div>}
          </>}
      </li>)}</ul>}
      {full ? <p className="panel-note">Llegaste al máximo de 10 roles.</p> : <>
        <h3 className="panel-subtitle">Crear un rol</h3>
        <RoleForm key={community.roles.length} community={community} onSaved={changed}/>
      </>}
    </section>

    <section className="community-panel" aria-labelledby="banned-title">
      <h2 id="banned-title">Personas expulsadas</h2>
      <Banned key={community.bannedCount} community={community} onChanged={changed}/>
    </section>

    {canEdit && <section className="community-panel" aria-labelledby="data-title">
      <h2 id="data-title">Datos de la comunidad</h2>
      <p className="panel-note">Nombre, descripción, tema, color y reglas.</p>
      <div className="admin-buttons"><Link className="btn btn-outline btn-small" to={`/comunidades/${community.id}/editar`}>Editar los datos</Link></div>
      <h3 className="panel-subtitle">Cerrar la comunidad</h3>
      <p className="panel-note">Deja de verse para todos y el chat ya no se puede abrir. {community.kind === 'default' ? 'Es una comunidad de Forbook: solo la cierra la administración.' : 'No se puede deshacer desde la página.'}</p>
      <div className="admin-buttons">{closing
        ? <><button className="btn btn-outline btn-small btn-danger" type="button" disabled={busy} onClick={close}>{busy ? 'Cerrando…' : `Sí, cerrar «${community.name}»`}</button><button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setClosing(false)}>Cancelar</button></>
        : <button className="btn btn-outline btn-small" type="button" onClick={() => setClosing(true)}>Cerrar la comunidad</button>}</div>
    </section>}
  </div>;
}
