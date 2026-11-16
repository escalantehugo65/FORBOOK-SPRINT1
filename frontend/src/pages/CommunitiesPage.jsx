import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { communityService } from '../services/communities';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import CommunitiesNav from '../components/CommunitiesNav';
import CommunityCard from '../components/CommunityCard';
import { PlusIcon, SearchIcon } from '../components/Icons';
import { topicNames, topicOrder } from '../utils/communities';

// Comunidades: las mías primero (con los mensajes sin leer) y después todas para explorar, con buscador y temas.
// La búsqueda y el tema quedan en la dirección: /comunidades?q=centro&tema=barrio
export default function CommunitiesPage() {
  usePageTitle('Comunidades');
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const topic = topicOrder.includes(params.get('tema')) ? params.get('tema') : '';
  const [text, setText] = useState(search);
  const [hint, setHint] = useState('');
  useEffect(() => { setText(search); }, [search]);
  const filtering = Boolean(search || topic);
  const loader = useCallback(signal => communityService.list({ search, topic }, signal), [search, topic]);
  const { result, loading, error, retry } = useFetch(loader);
  const all = result?.data || [];
  const mine = all.filter(community => community.joined);
  const others = all.filter(community => !community.joined);
  const meta = result?.meta;

  function change(next) {
    const merged = { q: search, tema: topic, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, value]) => value)), { replace: true });
  }
  function submit(event) {
    event.preventDefault();
    const clean = text.trim();
    if (clean.length === 1) { setHint('Escribí al menos 2 letras.'); return; }
    setHint('');
    change({ q: clean });
  }

  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Comunidades</p>
      <h1>Encontrá tu gente en Formosa.</h1>
      <p className="lead">Grupos con chat por barrio, por institución o por lo que te gusta. Unite a los que quieras o creá el tuyo.</p>
    </header>
    <CommunitiesNav/>
    <div className="community-toolbar">
      <form className="community-search" role="search" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="community-search">Buscar una comunidad</label>
        <div className="search-box">
          <SearchIcon/>
          <input id="community-search" type="search" value={text} maxLength={80} placeholder="Buscar por nombre o tema: centro, apuntes, IPF…" onChange={event => { setText(event.target.value); setHint(''); }} aria-describedby={hint ? 'community-search-hint' : undefined}/>
          <button className="btn btn-primary btn-small" type="submit">Buscar</button>
        </div>
        {hint && <small id="community-search-hint" className="field-error" role="alert">{hint}</small>}
      </form>
      {meta && (meta.canCreate
        ? <Link className="btn btn-primary" to="/comunidades/nueva"><PlusIcon/>Crear comunidad</Link>
        : <p className="community-limit">Ya tenés {meta.owned} comunidades propias, el máximo. Cerrá una para crear otra.</p>)}
    </div>
    <ul className="chip-row community-topics" aria-label="Filtrar por tema">
      <li><button className={`chip${!topic ? ' is-active' : ''}`} type="button" aria-pressed={!topic} onClick={() => change({ tema: '' })}>Todas</button></li>
      {topicOrder.map(key => <li key={key}><button className={`chip${topic === key ? ' is-active' : ''}`} type="button" aria-pressed={topic === key} onClick={() => change({ tema: key })}>{topicNames[key]}</button></li>)}
    </ul>

    {loading ? <Loading text="Buscando comunidades…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : !all.length ? <div className="empty">
        <h2>No encontramos comunidades{search ? ` con «${search}»` : ''}</h2>
        <p>Probá con otra palabra o con otro tema. Si no existe, podés crearla vos.</p>
        {filtering && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({}, { replace: true })}>Ver todas</button>}
      </div>
      : <>
        {mine.length > 0 && <section aria-labelledby="mine-title">
          <div className="results-head"><h2 id="mine-title">Tus comunidades</h2><span className="results-count">{mine.length}</span></div>
          <div className="community-grid">{mine.map(community => <CommunityCard key={community.id} community={community}/>)}</div>
        </section>}
        {others.length > 0 && <section aria-labelledby="explore-title">
          <div className="results-head"><h2 id="explore-title">{mine.length ? 'Para descubrir' : filtering ? 'Resultados' : 'Todas las comunidades'}</h2><span className="results-count">{others.length}</span></div>
          <div className="community-grid">{others.map(community => <CommunityCard key={community.id} community={community}/>)}</div>
        </section>}
      </>}
    <p className="note">En las comunidades valen las mismas reglas que en todo Forbook: respeto, nada de datos personales de otras personas y nada de ventas engañosas. Moderación puede borrar mensajes.</p>
  </div>;
}
