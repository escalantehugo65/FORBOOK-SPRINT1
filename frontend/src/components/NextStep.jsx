import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { catalogService } from '../services/catalog';
import { ArrowIcon } from './Icons';

const steps = {
  not_arrived: {
    slug: 'vida-estudiantil',
    name: 'Vida estudiantil',
    title: 'Prepará tu llegada.',
    text: 'Antes de viajar, conocé las herramientas y referencias de tu vida académica para no llegar a ciegas.',
    action: 'Ver Vida estudiantil',
  },
  arrived: {
    slug: 'lugares-utiles',
    name: 'Lugares útiles',
    title: 'Hacé de la ciudad tu lugar.',
    text: 'Ya estás en Formosa: empezá por los puntos de consulta y servicios para tus primeros días.',
    action: 'Ver Lugares útiles',
  },
};

const general = {
  title: 'Empezá a conocer tu nueva ciudad.',
  text: 'Explorá Conozcamos Formosa: información organizada por categorías, con la fuente y la fecha a la vista.',
  action: 'Ir a Conozcamos Formosa',
};

export default function NextStep({ arrivalStatus }) {
  const loader = useCallback(signal => catalogService.categories(signal), []);
  const { result } = useFetch(loader);
  const step = steps[arrivalStatus];
  const category = step && result?.data.find(item => item.slug === step.slug || item.name === step.name);
  const shown = category ? step : general;
  const to = category ? `/conozcamos?categoryId=${category.id}` : '/conozcamos';

  return <section className="next-card" aria-labelledby="next-title">
    <p className="eyebrow">Tu siguiente paso</p>
    <h2 id="next-title">{shown.title}</h2>
    <p>{shown.text}</p>
    <Link className="btn btn-light" to={to}>{shown.action} <ArrowIcon/></Link>
  </section>;
}