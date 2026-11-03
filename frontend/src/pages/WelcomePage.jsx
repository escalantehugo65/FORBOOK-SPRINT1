import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePublicAccess } from '../context/PublicAccessContext';
import riverside from '../assets/ribera-bienvenida.webp';

export default function WelcomePage() {
  const { user } = useAuth();
  const { openAccess } = usePublicAccess();
  return <section className="welcome-hero" aria-labelledby="welcome-title">
    <div className="welcome-copy">
      <p className="welcome-eyebrow">Tu llegada a Formosa</p>
      <h1 id="welcome-title">Un lugar nuevo.<br/>Un comienzo tuyo.</h1>
      <p className="welcome-description">Lo que necesitás para empezar tu vida de estudiante en Formosa.</p>
      {user ? <Link className="welcome-cta" to="/inicio"><span>Ir a mi inicio</span><span aria-hidden="true">→</span></Link>
        : <button className="welcome-cta" type="button" onClick={() => openAccess('register')}><span>Empezar</span><span aria-hidden="true">→</span></button>}
    </div>
    <figure className="welcome-landscape">
      <img src={riverside} width="1600" height="533" alt="Paisaje ribereño generado: río tranquilo, horizonte verde y ramas a la sombra." decoding="async"/>
      <figcaption>Formosa, a tu ritmo.</figcaption>
    </figure>
  </section>;
}
