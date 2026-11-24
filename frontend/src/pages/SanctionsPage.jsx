import { usePageTitle } from '../hooks/usePageTitle';
import SanctionList from '../components/SanctionList';

// /sanciones: advertencias y sanciones propias, con la opción de apelar.
export default function SanctionsPage() {
  usePageTitle('Mis sanciones');
  return <div className="container page narrow-page">
    <header className="page-header">
      <p className="eyebrow">Tu cuenta</p>
      <h1>Sanciones y apelaciones.</h1>
      <p className="lead">Acá ves las advertencias y sanciones de tu cuenta, el motivo, cuánto duran y cómo apelarlas.</p>
    </header>
    <SanctionList/>
  </div>;
}
