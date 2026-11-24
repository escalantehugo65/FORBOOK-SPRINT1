import { Link } from 'react-router-dom';
import SanctionList from './SanctionList';
import { formatUntil, sanctionReasonNames } from '../utils/sanctions';

// Aviso arriba de todas las páginas cuando la cuenta está restringida: puede leer, pero no publicar.
export function RestrictedBanner({ sanction }) {
  return <div className="account-banner" role="status">
    <div className="container">
      <span>Tu cuenta está restringida{sanction?.endsAt ? ` hasta el ${formatUntil(sanction.endsAt)}` : ''}: podés leer, pero no publicar ni escribir en el chat.</span>
      <Link to="/sanciones">Ver el motivo o apelar</Link>
    </div>
  </div>;
}

// Pantalla que reemplaza a toda la página cuando la cuenta está suspendida o dada de baja.
// Muestra el motivo, hasta cuándo dura y permite apelar o cerrar la sesión.
export function BlockedAccount({ account, onLogout, busy }) {
  const sanction = account.sanction;
  const banned = account.state === 'banned';
  return <div className="container page narrow-page account-blocked">
    <header className="account-blocked-head" role="alert">
      <p className="eyebrow">Tu cuenta</p>
      <h1>{banned ? 'Tu cuenta fue dada de baja.' : 'Tu cuenta está suspendida.'}</h1>
      <p>{banned
        ? 'La administración de Forbook dio de baja esta cuenta. Si creés que es un error, podés apelar una vez.'
        : 'Mientras dure la suspensión no podés usar Forbook. Cuando termine, la cuenta vuelve a funcionar sola.'}</p>
      {sanction && <dl>
        <div><dt>Motivo</dt><dd>{sanctionReasonNames[sanction.reason]}</dd></div>
        <div><dt>{banned ? 'Desde' : 'Hasta'}</dt><dd>{banned ? formatUntil(sanction.createdAt) : formatUntil(sanction.endsAt)}</dd></div>
        {sanction.note && <div><dt>Explicación</dt><dd>{sanction.note}</dd></div>}
      </dl>}
      <button className="btn btn-outline btn-small" type="button" disabled={busy} onClick={onLogout}>{busy ? 'Cerrando…' : 'Cerrar sesión'}</button>
    </header>
    <SanctionList/>
  </div>;
}
