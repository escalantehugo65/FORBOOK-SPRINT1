import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { groupService } from '../services/places';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import { ArrowIcon } from '../components/Icons';
import { groupKinds, groupReasons } from '../utils/places';

// Normas de la participación pública de Forbook (preguntas y respuestas).
const rules = [
  'Tratá a todos con respeto: sin insultos, burlas ni discriminación.',
  'No publiques datos personales tuyos ni de otras personas (teléfono, dirección, documentos).',
  'Si compartís un dato, decí de dónde lo sacaste. Una experiencia propia también vale, pero aclaralo.',
  'Nada de publicidad, cadenas ni enlaces engañosos.',
  'Si ves algo falso u ofensivo, reportalo: moderación lo revisa.',
];

// Detalle de un espacio (FF-31). No hay membresía: no se muestra ningún botón de "unirse".
export default function GroupDetailPage() {
  const { id } = useParams();
  const loader = useCallback(signal => groupService.detail(id, signal), [id]);
  const { result, loading, error, retry } = useFetch(loader);
  const group = result?.data;
  usePageTitle(group?.name || 'Espacio');
  const back = <Link className="back-link" to="/espacios"><ArrowIcon/>Volver a los espacios</Link>;
  if (loading) return <div className="container page">{back}<Loading/></div>;
  if (error) return <div className="container page">{back}<ErrorMessage message={error.message} retry={error.status === 404 ? null : retry}/></div>;

  return <div className="container page">
    {back}
    <header className="detail-head">
      <p className="card-category">{groupKinds[group.kind]}{group.institution ? ` · ${group.institution.name}` : ''}</p>
      <h1>{group.name}</h1>
      <p className="detail-summary">{group.summary}</p>
    </header>
    <div className="detail-grid">
      <div className="article-body">
        <section aria-labelledby="audience-title"><h2 id="audience-title" className="steps-title">Para quién es</h2><p>{group.audience}</p></section>
        <section aria-labelledby="purpose-title"><h2 id="purpose-title" className="steps-title">Para qué sirve</h2>{group.purpose.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>
        {group.linkPath && <p><Link className="btn btn-primary" to={group.linkPath}>{group.linkLabel || 'Ir al espacio'} <ArrowIcon/></Link></p>}
      </div>
      <aside className="source-panel" aria-labelledby="rules-title">
        <h2 id="rules-title">Normas de participación</h2>
        <p>La participación es pública: lo que escribas lo pueden leer otros estudiantes.</p>
        <ul className="rules-list">{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
        <p className="source-note">Por ahora Forbook no tiene membresía ni chat privado: no hace falta unirse a nada para usar este espacio.{group.reasons.length > 0 && ` Te lo sugerimos por ${group.reasons.map(reason => groupReasons[reason]).join(' y ')}.`}</p>
      </aside>
    </div>
  </div>;
}
