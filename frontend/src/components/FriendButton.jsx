import { useState } from 'react';
import { friendService } from '../services/friends';
import { nextRelation } from '../utils/friends';
import { firstName } from '../utils/content';
import { CheckIcon, PlusIcon } from './Icons';

// Botones de amistad con otra persona, según la relación:
// agregar → solicitud enviada (se puede cancelar) · aceptar o rechazar una recibida · amigos (se puede quitar).
// onChange(relación nueva) avisa a la página para que actualice contadores o listas.
export default function FriendButton({ person, relation = 'none', onChange, compact = false }) {
  const [current, setCurrent] = useState(relation);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (!person?.id || current === 'self') return null;
  const name = firstName(person.name);

  async function run(action) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await friendService[action](person.id);
      const relationNow = nextRelation(action, result.data);
      setCurrent(relationNow); setConfirming(false); setNotice(result.message || '');
      onChange?.(relationNow);
    } catch (failure) {
      setError(failure.message);
      // 409: la relación cambió en otro lado (por ejemplo, la otra persona aceptó). Se pide a la página que actualice.
      if (failure.status === 409 || failure.status === 404) onChange?.(undefined);
    } finally { setBusy(false); }
  }

  let buttons;
  if (current === 'none') {
    buttons = <button className="btn btn-primary btn-small" type="button" disabled={busy} onClick={() => run('send')}><PlusIcon/>{busy ? 'Enviando…' : 'Agregar amigo'}<span className="sr-only">: {person.name}</span></button>;
  } else if (current === 'sent') {
    buttons = <>
      <span className="friend-state">Solicitud enviada</span>
      <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => run('remove')}>{busy ? 'Cancelando…' : 'Cancelar'}<span className="sr-only"> la solicitud a {person.name}</span></button>
    </>;
  } else if (current === 'received') {
    buttons = <>
      <button className="btn btn-primary btn-small" type="button" disabled={busy} onClick={() => run('accept')}><CheckIcon/>Aceptar<span className="sr-only"> la solicitud de {person.name}</span></button>
      <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => run('remove')}>Rechazar<span className="sr-only"> la solicitud de {person.name}</span></button>
    </>;
  } else if (confirming) {
    buttons = <>
      <span className="friend-state">¿Dejar de ser amigos?</span>
      <button className="btn btn-outline btn-danger btn-small" type="button" disabled={busy} onClick={() => run('remove')}>{busy ? 'Quitando…' : 'Sí, quitar'}</button>
      <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={() => setConfirming(false)}>No</button>
    </>;
  } else {
    buttons = <>
      <span className="friend-state is-friends"><CheckIcon/>Amigos</span>
      <button className="btn btn-outline btn-small" type="button" onClick={() => { setConfirming(true); setNotice(''); }}>Quitar<span className="sr-only"> a {person.name} de tus amigos</span></button>
    </>;
  }
  return <div className={`friend-actions${compact ? ' is-compact' : ''}`}>
    <div className="friend-buttons">{buttons}</div>
    {error && <p className="report-error" role="alert">{error}</p>}
    {notice && !compact && <p className="friend-notice" role="status">{notice}</p>}
    {notice && compact && <p className="sr-only" role="status">{notice}</p>}
    {current === 'received' && !compact && !notice && <p className="friend-notice">{name} te mandó una solicitud de amistad.</p>}
  </div>;
}
