import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { communityService } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import CommunitiesNav from '../components/CommunitiesNav';
import { CheckIcon, PointsIcon } from '../components/Icons';
import { periodNames, periodOrder, timeLeft } from '../utils/communities';
import { pointsLabel } from '../utils/shop';

// Misiones: metas chicas (chatear, mandar una imagen, responder preguntas) que dan puntos para la tienda.
export default function MissionsPage() {
  usePageTitle('Misiones');
  const { user, reloadUser } = useAuth();
  const loader = useCallback(signal => communityService.missions(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const [claimed, setClaimed] = useState({});
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const missions = (result?.data || []).map(mission => (claimed[mission.key] ? { ...mission, claimed: true, claimable: false } : mission));
  const pending = missions.filter(mission => mission.claimable).length;

  async function claim(mission) {
    setBusy(mission.key); setFailure(''); setNotice('');
    try {
      const data = await communityService.claim(mission.key);
      setClaimed(previous => ({ ...previous, [mission.key]: true }));
      setNotice(data.message);
      reloadUser();
    } catch (problem) { setFailure(problem.message); if (problem.status === 409) retry(); }
    finally { setBusy(null); }
  }

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Misiones</p>
      <h1>Participá y sumá puntos.</h1>
      <p className="lead">Cumplí metas chicas en las comunidades y en Preguntas, y cobrá puntos para la <Link to="/tienda">tienda</Link>. Tenés {pointsLabel(user.points ?? 0)}.</p>
    </header>
    <CommunitiesNav claimable={pending}/>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {failure && <div className="alert" role="alert"><p>{failure}</p></div>}
    {loading ? <Loading text="Cargando misiones…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : periodOrder.map(period => {
        const list = missions.filter(mission => mission.period === period);
        if (!list.length) return null;
        const endsAt = list[0].endsAt;
        return <section key={period} className="mission-group" aria-labelledby={`missions-${period}`}>
          <div className="results-head"><h2 id={`missions-${period}`}>{periodNames[period]}</h2>{endsAt && <span className="results-count">Se renuevan en {timeLeft(endsAt)}</span>}</div>
          <ul className="mission-list">{list.map(mission => <li key={mission.key} className={`mission-card${mission.claimed ? ' is-claimed' : mission.claimable ? ' is-ready' : ''}`}>
            <div className="mission-main">
              <h3>{mission.title}</h3>
              <p>{mission.detail}</p>
              <div className="mission-progress">
                <progress value={mission.progress} max={mission.goal} aria-label={`Avance de «${mission.title}»`}/>
                <span>{mission.progress} de {mission.goal}</span>
              </div>
            </div>
            <div className="mission-side">
              <span className="mission-reward"><PointsIcon/>+{mission.reward}<span className="sr-only"> puntos</span></span>
              {mission.claimed ? <span className="badge badge-official"><CheckIcon/>Cobrada</span>
                : mission.claimable ? <button className="btn btn-primary btn-small" type="button" disabled={busy === mission.key} onClick={() => claim(mission)}>{busy === mission.key ? 'Cobrando…' : 'Cobrar'}<span className="sr-only">: {mission.title}</span></button>
                : <span className="mission-pending">Te falta {mission.goal - mission.progress}</span>}
            </div>
          </li>)}</ul>
        </section>;
      })}
    <p className="note">Las misiones dan puntos para la tienda, pero no reputación: el nivel se gana ayudando en Preguntas. Los mensajes borrados no cuentan y responder tu propia pregunta tampoco.</p>
  </div>;
}
