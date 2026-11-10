import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { ArrowIcon } from '../components/Icons';

export default function NotFoundPage() {
  usePageTitle('Página no encontrada');
  return <section className="container notfound" aria-labelledby="notfound-title">
    <p className="notfound-code" aria-hidden="true">404</p>
    <h1 id="notfound-title">Esta página no está acá.</h1>
    <p>Puede que la dirección esté mal escrita o que la página ya no exista.</p>
    <Link className="btn btn-primary btn-large" to="/">Volver al inicio <ArrowIcon/></Link>
  </section>;
}
