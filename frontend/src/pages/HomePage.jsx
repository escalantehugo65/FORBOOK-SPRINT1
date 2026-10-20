import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const arrived = user.arrivalStatus === 'arrived';
  return <div className="container section"><div className="page-heading"><span className="eyebrow">MI INICIO / TU LLEGADA</span><h1>Hola, {user.name.split(' ')[0]}.<br/><em>{arrived ? 'Formosa te espera afuera.' : 'Tu comienzo ya está en marcha.'}</em></h1><p>{arrived ? 'Ya estás acá. Empezá a conocer las referencias para desenvolverte en la ciudad.' : 'Todavía estás preparando tu viaje. Conocé tu destino antes de llegar.'}</p></div>
    <div className="home-grid"><section className="profile-panel"><span className="eyebrow">TU PUNTO DE PARTIDA</span><h2>Un poco de tu historia</h2><dl><div><dt>Venís de</dt><dd>{user.origin}</dd></div><div><dt>Vas a estudiar en</dt><dd>{user.institution?.name || 'Institución no disponible'}</dd></div><div><dt>Tu carrera</dt><dd>{user.career}</dd></div><div><dt>Tu llegada</dt><dd><span className="status-pill">{arrived ? 'Ya estoy en Formosa' : 'Todavía no llegué'}</span></dd></div></dl></section>
      <section className="explore-promo"><span className="eyebrow">TU SIGUIENTE PASO</span><h2>{arrived ? 'Hacé de la ciudad\ntu lugar.' : 'Empezá a conocer\ntu nueva ciudad.'}</h2><p>Explorá Conozcamos Formosa: información organizada, fuentes identificadas y referencias para tu vida estudiantil.</p><Link className="button light" to="/conozcamos">Conozcamos Formosa <span aria-hidden="true">↗</span></Link></section></div>
    <p className="editorial-note">El inicio usa los datos de tu perfil. La guía también incluye información general y señala cuándo una ficha está vinculada con una institución.</p></div>;
}
