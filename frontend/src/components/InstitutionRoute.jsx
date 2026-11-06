import { useAuth } from '../context/AuthContext';
import { PinIcon } from './Icons';

export default function InstitutionRoute() {
  const { user } = useAuth();
  const institution = user.institution?.name || 'Tu institución';

  return <section className="home-section" aria-labelledby="route-title">
    <div className="section-row">
      <div>
        <p className="eyebrow">Tu llegada</p>
        <h2 id="route-title">Cómo llegar a tu institución</h2>
      </div>
    </div>
    <article className="route-card">
      <span className="icon-tile tile-yellow"><PinIcon/></span>
      <div>
        <h3>{institution}</h3>
        <p>Todavía no hay una ruta cargada para tu institución. Cuando esté lista, la vas a poder abrir desde acá.</p>
      </div>
      <span className="badge badge-soon">Sin ruta cargada</span>
    </article>
  </section>;
}