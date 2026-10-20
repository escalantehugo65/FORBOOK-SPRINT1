import { Link } from 'react-router-dom';
export default function NotFoundPage() { return <section className="container section"><span className="eyebrow">404 / UN DESVÍO EN EL CAMINO</span><h1>Esta página no está acá.</h1><p>Podés volver al inicio y seguir explorando.</p><Link className="button" to="/">Volver al inicio →</Link></section>; }
