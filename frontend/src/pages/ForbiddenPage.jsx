import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { ArrowIcon } from '../components/Icons';

// Se muestra cuando alguien sin el rol necesario entra a una sección de moderación (FF-36 y FF-38).
export default function ForbiddenPage() {
  usePageTitle('Sin permiso');
  return <section className="container notfound" aria-labelledby="forbidden-title">
    <p className="notfound-code" aria-hidden="true">403</p>
    <h1 id="forbidden-title">Esta sección es del equipo de moderación.</h1>
    <p>Tu cuenta no tiene permiso para entrar acá. Si creés que es un error, hablá con un administrador.</p>
    <Link className="btn btn-primary btn-large" to="/inicio">Volver a mi inicio <ArrowIcon/></Link>
  </section>;
}
