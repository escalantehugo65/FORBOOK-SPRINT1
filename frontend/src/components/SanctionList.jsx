import { useCallback, useState } from 'react';
import { sanctionService } from '../services/sanctions';
import { useFetch } from '../hooks/useFetch';
import { Loading, ErrorMessage } from './Feedback';
import AppealForm from './AppealForm';
import { formatDateTime } from '../utils/moderation';
import { appealStatusBadge, appealStatusNames, canAppeal, sanctionLine, sanctionReasonNames, sanctionTypeHints } from '../utils/sanctions';

function Item({ item, onAppealed }) {
  const active = item.kind === 'warning' ? !item.revoked : item.active;
  return <li className={`sanction-item${active ? '' : ' is-past'}`}>
    <div className="sanction-top">
      <strong>{item.kind === 'warning' ? 'Advertencia' : sanctionLine(item)}</strong>
      <span className="badge badge-warn">{sanctionReasonNames[item.reason]}</span>
      {item.automatic && <span className="badge badge-soon">Automática</span>}
      {item.revoked ? <span className="badge badge-official">Revocada</span> : !active && <span className="badge badge-soon">Terminó</span>}
    </div>
    <p className="card-meta">{formatDateTime(item.createdAt)}</p>
    {item.note && <p className="sanction-note">{item.note}</p>}
    {item.kind === 'sanction' && active && sanctionTypeHints[item.type] && <p className="sanction-hint">{sanctionTypeHints[item.type]}</p>}
    {item.appeal && <div className="appeal-status">
      <span className={appealStatusBadge[item.appeal.status]}>{appealStatusNames[item.appeal.status]}</span>
      {item.appeal.response && <p>Respuesta de la administración: {item.appeal.response}</p>}
    </div>}
    {canAppeal(item) && <AppealForm item={item} onSent={onAppealed}/>}
  </li>;
}

// Advertencias y sanciones de la propia cuenta, con sus apelaciones. La usan /sanciones y la pantalla de cuenta suspendida.
export default function SanctionList() {
  const loader = useCallback(signal => sanctionService.mine(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const [notice, setNotice] = useState('');
  if (loading) return <Loading text="Cargando tus sanciones…"/>;
  if (error) return <ErrorMessage message={error.message} retry={retry}/>;
  const { warnings, sanctions } = result.data;
  const rules = result.meta.rules;
  const appealed = message => { setNotice(message); retry(); };
  return <div className="sanction-list">
    {notice && <p className="report-done" role="status">{notice}</p>}
    <section aria-labelledby="my-sanctions-title">
      <h2 id="my-sanctions-title">Sanciones</h2>
      {sanctions.length ? <ul>{sanctions.map(item => <Item key={`s${item.id}`} item={item} onAppealed={appealed}/>)}</ul>
        : <p className="profile-empty">No tenés sanciones.</p>}
    </section>
    <section aria-labelledby="my-warnings-title">
      <h2 id="my-warnings-title">Advertencias</h2>
      {warnings.length ? <ul>{warnings.map(item => <Item key={`w${item.id}`} item={item} onAppealed={appealed}/>)}</ul>
        : <p className="profile-empty">No tenés advertencias.</p>}
    </section>
    <section className="sanction-rules" aria-labelledby="rules-title">
      <h2 id="rules-title">Cómo funcionan</h2>
      <ul>
        <li>Con {rules.restrictionAt} advertencias vigentes, la cuenta queda restringida {rules.restrictionDays} días: podés leer, pero no publicar.</li>
        <li>Con {rules.suspensionAt}, se suspende {rules.suspensionDays} días.</li>
        <li>Con {rules.banAt}, la cuenta se da de baja.</li>
        <li>La administración también puede restringir, suspender o dar de baja una cuenta por faltas graves, como el acoso.</li>
        <li>Cada advertencia o sanción se puede apelar una vez. Si la aceptan, se revoca y se devuelven los puntos.</li>
      </ul>
    </section>
  </div>;
}
