import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePublicAccess } from '../context/PublicAccessContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { ArrowIcon, BookIcon, ChatIcon, CheckIcon, HomeIcon, PinIcon, ShieldIcon, UsersIcon } from '../components/Icons';

// Funciones de la plataforma: las dos primeras ya funcionan (FF Sprint 1); el resto llega más adelante.
const features = [
  { id: 'conozcamos', title: 'Conozcamos Formosa', text: 'Fichas organizadas por categoría, con la fuente y la fecha de revisión a la vista.', icon: BookIcon, tile: 'tile-mint', available: true },
  { id: 'inicio', title: 'Tu inicio personalizado', text: 'Armado con tu procedencia, tu institución, tu carrera y si ya llegaste a la ciudad.', icon: HomeIcon, tile: 'tile-yellow', available: true },
  { id: 'mapa', title: 'Mapa de lugares', text: 'Los puntos importantes de la ciudad y rutas orientativas hacia tu institución.', icon: PinIcon, tile: 'tile-tint' },
  { id: 'comunidades', title: 'Comunidades', text: 'Grupos de gente con tus mismos intereses: vas a poder crear uno o sumarte.', icon: UsersIcon, tile: 'tile-tint' },
  { id: 'preguntas', title: 'Preguntas y respuestas', text: 'Preguntá lo que no sabés: la comunidad responde y marca lo más útil.', icon: ChatIcon, tile: 'tile-tint' },
  { id: 'guia', title: 'Cómo vivir en Formosa', text: 'Una guía por temas, con consejos de seguridad y de cuidado con los alimentos.', icon: ShieldIcon, tile: 'tile-tint' },
];
const categories = ['Lugares útiles', 'Movilidad', 'Vida estudiantil', 'Cultura y costumbres', 'Recomendaciones'];

function Soon({ onBand = false }) { return <span className={onBand ? 'badge badge-on-band' : 'badge badge-soon'}>Próximamente</span>; }

function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <div className="hero-panel"/>
    <div className="art-card art-card-a">
      <p className="art-eyebrow">Conozcamos Formosa · Vida estudiantil</p>
      <p className="art-title">Conocé el acceso a SIU Guaraní</p>
      <div className="art-meta"><span className="badge badge-official"><CheckIcon/>Fuente oficial</span><span>Revisada el 20 de octubre de 2026</span></div>
    </div>
    <div className="art-card art-card-b">
      <p className="art-eyebrow">Tu inicio</p>
      <p className="art-title">Tu nueva etapa empieza acá.</p>
      <dl className="art-rows">
        <div><dt>Venís de</dt><dd>Clorinda</dd></div>
        <div><dt>Estudiás en</dt><dd>IPF</dd></div>
        <div><dt>Tu llegada</dt><dd>Todavía no llegué</dd></div>
      </dl>
    </div>
    <div className="art-card art-card-c">
      <div className="art-head"><p className="art-title">Tu confianza</p><p className="art-eyebrow">Próximamente</p></div>
      <div className="art-bar"><span/></div>
    </div>
  </div>;
}

export default function WelcomePage() {
  const { user } = useAuth();
  const { openAccess } = usePublicAccess();
  usePageTitle();
  const start = () => openAccess('register');

  return <>
    <section className="container hero" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <p className="pill"><PinIcon/>Para estudiantes que llegan a Formosa</p>
        <h1 id="welcome-title">Llegaste a Formosa. <span>No llegás solo.</span></h1>
        <p className="hero-lead">Lo que necesitás para empezar tu vida de estudiante en la ciudad: información organizada, con la fuente y la fecha a la vista, y un inicio pensado para tu llegada.</p>
        <div className="hero-actions">
          {user
            ? <><Link className="btn btn-primary btn-large" to="/inicio">Ir a mi inicio <ArrowIcon/></Link><Link className="btn btn-outline btn-large" to="/conozcamos">Conozcamos Formosa</Link></>
            : <><button className="btn btn-primary btn-large" type="button" onClick={start}>Empezar ahora <ArrowIcon/></button><Link className="btn btn-outline btn-large" to={{ hash: '#funciones' }}>Ver qué hay</Link></>}
        </div>
      </div>
      <HeroArt/>
    </section>

    <section id="funciones" className="section band-soft" aria-labelledby="features-title">
      <div className="container">
        <div className="section-head"><div><p className="eyebrow">Funciones</p><h2 id="features-title" className="section-title">Todo lo que necesitás para arrancar en Formosa</h2></div>
          <p>Lo que ya podés usar hoy y lo que estamos preparando.</p></div>
        <div className="feature-grid">
          {features.map(({ id, title, text, icon: FeatureIcon, tile, available }) => <article className="feature-card" key={id}>
            <div className="feature-top"><span className={`icon-tile ${tile}`}><FeatureIcon/></span>{available ? <span className="badge"><CheckIcon/>Disponible</span> : <Soon/>}</div>
            <h3>{title}</h3>
            <p>{text}</p>
            {available && (user
              ? <Link className="btn btn-outline btn-small" to={id === 'inicio' ? '/inicio' : '/conozcamos'}>{id === 'inicio' ? 'Ir a mi inicio' : 'Explorar'} <ArrowIcon/></Link>
              : <button className="btn btn-outline btn-small" type="button" onClick={start}>Crear cuenta para {id === 'inicio' ? 'verlo' : 'explorar'}</button>)}
          </article>)}
        </div>
      </div>
    </section>

    <section id="conozcamos" className="section" aria-labelledby="know-title">
      <div className="container">
        <div className="section-head"><div><p className="eyebrow">Conozcamos Formosa</p><h2 id="know-title" className="section-title">Información con fuente. Sin inventar nada.</h2></div>
          <p>Cada ficha muestra de dónde viene y cuándo se revisó, y distingue lo oficial de las experiencias de otros estudiantes.</p></div>
        <div className="know-grid">
          <article className="know-card">
            <h3>Cinco categorías para empezar</h3>
            <ul className="chip-row">{categories.map(name => <li className="chip" key={name}>{name}</li>)}</ul>
            <p>Si una categoría todavía no tiene fichas, te lo decimos: preferimos esperar a tener información verificada antes que publicar algo dudoso.</p>
            {user ? <Link className="btn btn-primary" to="/conozcamos">Explorar las fichas <ArrowIcon/></Link> : <button className="btn btn-primary" type="button" onClick={start}>Crear cuenta para explorar</button>}
          </article>
          <article className="know-card">
            <h3>Así se lee cada ficha</h3>
            <dl className="source-legend">
              <div><dt><span className="badge badge-official">Fuente oficial</span></dt><dd>Publicada por una institución o un organismo público.</dd></div>
              <div><dt><span className="badge badge-community">Comunitaria verificable</span></dt><dd>Un aporte que se puede comprobar con la referencia que trae.</dd></div>
              <div><dt><span className="badge badge-experience">Opinión o experiencia</span></dt><dd>Lo que vivió otra persona: orienta, pero no es un dato oficial.</dd></div>
            </dl>
          </article>
        </div>
      </div>
    </section>

    <section id="mapa" className="section band-soft" aria-labelledby="map-title">
      <div className="container split">
        <div className="split-copy">
          <div className="eyebrow-row"><p className="eyebrow">Mapa</p><Soon/></div>
          <h2 id="map-title" className="section-title">Saber dónde queda cada cosa, desde el primer día</h2>
          <p>Vas a poder ver instituciones, servicios y lugares útiles en un mapa, con rutas orientativas para llegar.</p>
          <ul className="legend">
            <li><span className="dot dot-blue"/>Instituciones</li>
            <li><span className="dot dot-yellow"/>Lugares útiles</li>
            <li><span className="dot dot-mint"/>Movilidad</li>
          </ul>
        </div>
        <div className="map-art" aria-hidden="true">
          <div className="map-grid"/>
          <div className="map-river"/>
          <div className="map-route"/>
          <div className="map-place" style={{ left: '18%', top: '24%' }}><span className="pin"/><span className="label">UNaF</span></div>
          <div className="map-place" style={{ left: '60%', top: '50%' }}><span className="pin"/><span className="label">IPF</span></div>
          <span className="map-dot dot-yellow" style={{ left: '12%', top: '72%' }}/>
          <span className="map-dot dot-yellow" style={{ left: '80%', top: '18%' }}/>
          <span className="map-dot dot-mint" style={{ left: '42%', top: '82%' }}/>
        </div>
      </div>
    </section>

    <section id="puntos" className="section band" aria-labelledby="points-title">
      <div className="container split">
        <div className="split-copy">
          <div className="eyebrow-row"><p className="eyebrow">Puntos y confianza</p><Soon onBand/></div>
          <h2 id="points-title" className="section-title">Tu cuenta vale. Cuidala.</h2>
          <p>Vas a ganar puntos cuando compartas información útil y verificada. Los puntos van a mostrar qué tan confiable sos y se van a poder canjear en la tienda. Si alguien manda información falsa para perjudicar a otros, la sanción se va a ver en su perfil: por eso conviene cuidar lo que construiste.</p>
          <ol className="steps-list">
            <li><span className="step-number">1</span>Compartís información útil</li>
            <li><span className="step-number">2</span>La comunidad la valida</li>
            <li><span className="step-number">3</span>Sumás puntos y los canjeás</li>
          </ol>
        </div>
        <div className="points-stack" aria-hidden="true">
          <div className="points-card">
            <div className="points-head"><span className="avatar avatar-large">F</span><div><strong>Perfil de ejemplo</strong><p>Sin sanciones</p></div><span className="badge">Confiable</span></div>
            <div className="level-labels"><span>Nuevo</span><span>Aportante</span><span>Confiable</span></div>
            <div className="level-bar"><span/></div>
          </div>
          <div className="points-card">
            <h3>Tienda de puntos</h3>
            <div className="reward-grid"><span className="reward-slot">Muy pronto</span><span className="reward-slot">Muy pronto</span><span className="reward-slot">Muy pronto</span></div>
          </div>
        </div>
      </div>
    </section>

    <section className="section" aria-labelledby="cta-title">
      <div className="container">
        <div className="cta-box">
          <h2 id="cta-title">Tu llegada a Formosa empieza acá.</h2>
          {user ? <Link className="btn btn-navy btn-large" to="/inicio">Ir a mi inicio <ArrowIcon/></Link> : <button className="btn btn-navy btn-large" type="button" onClick={start}>Crear mi cuenta <ArrowIcon/></button>}
        </div>
      </div>
    </section>
  </>;
}
