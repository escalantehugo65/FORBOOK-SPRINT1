import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { communityService } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage } from './Feedback';
import Avatar from './Avatar';

const relationNames = { hidden: 'Oculta', blocked: 'Bloqueada' };

// En el perfil de otra persona: ocultarla (dejo de ver sus mensajes) o bloquearla
// (ninguna ve los mensajes de la otra y ella no puede ver mi perfil).
export default function BlockActions({ profile, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const relation = profile.relation;
  async function run(action) {
    setBusy(true); setError(''); setNotice('');
    try { const data = await action(); setNotice(data.message); onChanged(data.data.relation); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <section className="profile-card block-actions" aria-labelledby="block-title">
    <h2 id="block-title">Tu relación con {profile.name.split(' ')[0]}</h2>
    <p className="panel-note">{relation === 'blocked' ? 'La tenés bloqueada: no ven los mensajes de la otra persona en las comunidades y no puede ver tu perfil.'
      : relation === 'hidden' ? 'La tenés oculta: no ves sus mensajes en las comunidades. Ella no se entera y sigue viendo los tuyos.'
      : 'Si no querés leer a esta persona en las comunidades, podés ocultarla o bloquearla. No se le avisa.'}</p>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="admin-buttons">
      {relation !== 'hidden' && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => run(() => communityService.block(profile.id, 'hidden'))}>{relation === 'blocked' ? 'Solo ocultar' : 'Ocultar sus mensajes'}</button>}
      {relation !== 'blocked' && <button className="btn btn-outline btn-small btn-danger" type="button" disabled={busy} onClick={() => run(() => communityService.block(profile.id, 'blocked'))}>Bloquear</button>}
      {relation && <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => run(() => communityService.unblock(profile.id))}>{relation === 'blocked' ? 'Desbloquear' : 'Volver a mostrar'}</button>}
    </div>
  </section>;
}

// En el perfil propio: a quiénes oculté o bloqueé, para deshacerlo.
export function BlockedPeople() {
  const loader = useCallback(signal => communityService.blocks(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const [busy, setBusy] = useState(null);
  const [failure, setFailure] = useState('');
  async function undo(item) {
    setBusy(item.user.id); setFailure('');
    try { await communityService.unblock(item.user.id); retry(); } catch (problem) { setFailure(problem.message); } finally { setBusy(null); }
  }
  return <section className="profile-card" aria-labelledby="blocked-title">
    <h2 id="blocked-title">Personas ocultas y bloqueadas</h2>
    {loading ? <Loading text="Cargando…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : result.data.length ? <>
        {failure && <p className="field-error" role="alert">{failure}</p>}
        <ul className="member-list">{result.data.map(item => <li className="member-row" key={item.user.id}>
          <Link className="member-person" to={`/usuarios/${item.user.id}`}><Avatar person={item.user}/><span>{item.user.name}<small>{relationNames[item.kind]}</small></span></Link>
          <div className="member-actions"><button className="btn btn-outline btn-small" type="button" disabled={busy === item.user.id} onClick={() => undo(item)}>{item.kind === 'blocked' ? 'Desbloquear' : 'Volver a mostrar'}<span className="sr-only">: {item.user.name}</span></button></div>
        </li>)}</ul>
      </>
      : <p className="panel-note">No ocultaste ni bloqueaste a nadie. Podés hacerlo desde el perfil de cada persona.</p>}
  </section>;
}
