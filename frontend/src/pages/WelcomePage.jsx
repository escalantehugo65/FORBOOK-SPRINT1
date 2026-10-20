import { Link } from 'react-router-dom';

export default function WelcomePage() {
  return <><section className="hero container"><div className="hero-copy"><span className="eyebrow"><span className="live-dot"/> TU LLEGADA A FORMOSA, ACOMPAÑADA</span>
    <h1>Una nueva ciudad.<br/>Un comienzo<br/><em>más simple.</em></h1><p>Venís a estudiar. También a descubrir una ciudad, encontrar tus lugares y empezar una nueva etapa. Forbook te ayuda a dar los primeros pasos en Formosa.</p>
    <div className="actions"><Link className="button" to="/registro">Empezar mi llegada <span aria-hidden="true">↗</span></Link><Link className="quiet-link" to="/ingresar">Ya tengo una cuenta <span aria-hidden="true">→</span></Link></div>
    <div className="hero-note"><span className="note-line"/>Pensado para estudiantes que llegan a Formosa.</div></div>
    <div className="arrival-art" role="img" aria-label="Ilustración de una guía de llegada a Formosa"><div className="art-grid"/><div className="art-coordinate">26°11′ S / 58°10′ O</div><div className="river"/><div className="art-route"/>
      <div className="art-pin"><span/></div><div className="art-city">FORMOSA<span>Tu próximo capítulo.</span></div><div className="art-card"><span className="eyebrow">GUÍA PARA TU LLEGADA</span><strong>Lo nuevo se vuelve<br/>más cercano.</strong><div className="art-card-foot"><span>Conozcamos Formosa</span><span>↗</span></div></div><span className="art-bottom">Un lugar para empezar.</span></div></section>
    <section className="intro-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">MENOS DUDAS. MÁS COMIENZOS.</span><h2>Hacé lugar a lo que viene.</h2></div><p>Información organizada para encontrar tu camino, a tu ritmo.</p></div><div className="feature-grid">
      <article><span className="feature-number">01 /</span><h3>Contanos de vos</h3><p>Tu procedencia, dónde vas a estudiar y en qué momento de tu llegada estás.</p></article>
      <article><span className="feature-number">02 /</span><h3>Conocé Formosa</h3><p>Explorá información por categorías y encontrá referencias útiles para tu nueva etapa.</p></article>
      <article><span className="feature-number">03 /</span><h3>Consultá el origen</h3><p>Cada ficha distingue el tipo de información y muestra su fuente y revisión disponible.</p></article></div></div></section></>;
}
