import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePublicAccess } from '../context/PublicAccessContext';

export default function WelcomePage() {
  const { user } = useAuth();
  const { openAccess } = usePublicAccess();
  return <section className="welcome-hero" aria-labelledby="welcome-title">
    <div className="welcome-copy">
      <p className="welcome-eyebrow">Formosa, Argentina <span aria-hidden="true">/</span> Guía de llegada</p>
      <h1 id="welcome-title"><span>Un lugar nuevo.</span><em>Un comienzo tuyo.</em></h1>
      <p className="welcome-description">Lo que necesitás para empezar tu vida de estudiante en Formosa.</p>
      {user ? <Link className="welcome-cta" to="/inicio"><span>Ir a mi inicio</span><span aria-hidden="true">→</span></Link>
        : <button className="welcome-cta" type="button" onClick={() => openAccess('register')}><span>Empezar</span><span aria-hidden="true">→</span></button>}
    </div>
  </section>;
}
