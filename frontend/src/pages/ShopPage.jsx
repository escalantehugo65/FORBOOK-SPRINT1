import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shopService } from '../services/shop';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import LevelBadge from '../components/LevelBadge';
import ProfileCardPreview from '../components/ProfileCardPreview';
import ShopItemPreview from '../components/ShopItemPreview';
import { CheckIcon, CloseIcon, PointsIcon } from '../components/Icons';
import { categoryHints, categoryNames, categoryOrder, categoryPlural, decorationKeys, formatPoints, levelNames, pointsLabel, rarityNames, reasonNames, withItem } from '../utils/shop';
import { formatDateTime } from '../utils/moderation';

const views = [['', 'Tienda'], ['inventario', 'Mis decoraciones'], ['puntos', 'Mis puntos']];

// Cuánto le falta para el próximo nivel. Los niveles salen de la reputación, no del saldo.
function levelProgress(reputation, levels) {
  const index = levels.reduce((found, level, position) => (reputation >= level.min ? position : found), 0);
  const current = levels[index];
  const next = levels[index + 1];
  if (!next) return { current, next: null, percent: 100 };
  return { current, next, missing: next.min - reputation, percent: Math.round(((reputation - current.min) / (next.min - current.min)) * 100) };
}

// Ventana con la vista previa de una decoración, para comprarla o ponérsela (como en la tienda de Discord).
function ItemDialog({ item, person, balance, onClose, onPurchase, onToggle }) {
  const dialog = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bought, setBought] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const missing = item.price - balance;
  async function run(action) {
    setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const buy = () => run(async () => { await onPurchase(item); setBought(true); setConfirming(false); });
  const toggle = () => run(() => onToggle(item));
  const preview = withItem(person.decorations, item);

  return <dialog ref={dialog} className="shop-dialog" aria-labelledby="item-title" aria-describedby="item-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="shop-dialog-inner">
      <button type="button" className="icon-button shop-dialog-close" onClick={onClose} disabled={busy} aria-label="Cerrar"><CloseIcon/></button>
      <div className="shop-dialog-preview">
        <ProfileCardPreview person={person} decorations={preview} subtitle={person.institution?.name}/>
        <p className="preview-note">Así se vería tu perfil con «{item.name}».</p>
      </div>
      <div className="shop-dialog-info">
        <p className="shop-item-meta"><span className={`rarity-tag rarity-${item.rarity}`}>{rarityNames[item.rarity]}</span><span>{categoryNames[item.category]} · {item.collection}</span></p>
        <h2 id="item-title">{item.name}</h2>
        <p id="item-description">{item.description}</p>
        <p className="shop-dialog-hint">{categoryHints[item.category]}</p>

        {item.owned ? <div className="shop-dialog-actions">
          {bought && <p className="report-done" role="status">¡Listo! Compraste «{item.name}».</p>}
          <p className="owned-note"><CheckIcon/>{item.equipped ? 'La tenés puesta.' : bought ? 'Ya es tuya: ¿te la ponés ahora?' : 'Ya es tuya.'}</p>
          <button className={item.equipped ? 'btn btn-outline' : 'btn btn-primary'} type="button" onClick={toggle} disabled={busy}>
            {busy ? 'Guardando…' : item.equipped ? 'Sacármela' : 'Ponérmela'}
          </button>
        </div>
        : <div className="shop-dialog-actions">
          <p className="price-line"><PointsIcon/><strong>{pointsLabel(item.price)}</strong><span>· Tenés {formatPoints(balance)}</span></p>
          {missing > 0 ? <>
            <p className="missing-note">Te faltan {pointsLabel(missing)}. Sumalos ayudando: respondé preguntas y compartí datos útiles.</p>
            <Link className="btn btn-outline" to="/tienda?ver=puntos" onClick={onClose}>Cómo ganar puntos</Link>
          </> : confirming ? <div className="confirm-box" role="group" aria-label="Confirmar la compra">
            <p>¿Comprás «{item.name}» por {pointsLabel(item.price)}? Te van a quedar {pointsLabel(balance - item.price)}. Las compras no se devuelven.</p>
            <div className="admin-buttons">
              <button className="btn btn-primary" type="button" onClick={buy} disabled={busy}>{busy ? 'Comprando…' : 'Sí, comprar'}</button>
              <button className="btn btn-outline" type="button" onClick={() => setConfirming(false)} disabled={busy}>No, volver</button>
            </div>
          </div>
          : <button className="btn btn-primary" type="button" onClick={() => setConfirming(true)}>Comprar por {pointsLabel(item.price)}</button>}
        </div>}
        {error && <div className="alert" role="alert"><p>{error}</p></div>}
      </div>
    </div>
  </dialog>;
}

function ItemCard({ item, person, onOpen }) {
  return <li className={`shop-item rarity-${item.rarity}${item.equipped ? ' is-equipped' : ''}`}>
    <ShopItemPreview item={item} person={person}/>
    <div className="shop-item-body">
      <h3><button type="button" className="shop-item-open" onClick={() => onOpen(item)}>{item.name}<span className="sr-only">: {categoryNames[item.category].toLowerCase()}, {rarityNames[item.rarity].toLowerCase()}, {item.equipped ? 'la tenés puesta' : item.owned ? 'ya la tenés' : pointsLabel(item.price)}</span></button></h3>
      <div aria-hidden="true">
        <p className="shop-item-meta"><span className={`rarity-tag rarity-${item.rarity}`}>{rarityNames[item.rarity]}</span><span>{categoryNames[item.category]}</span></p>
        <p className={item.owned ? 'shop-item-price is-owned' : 'shop-item-price'}>{item.equipped ? <><CheckIcon/>Puesta</> : item.owned ? <><CheckIcon/>Ya la tenés</> : <><PointsIcon/>{formatPoints(item.price)}</>}</p>
      </div>
    </div>
  </li>;
}

// Catálogo por colecciones, con filtro por tipo de decoración.
function Catalog({ items, collections, person, onOpen }) {
  const [params, setParams] = useSearchParams();
  const category = categoryOrder.includes(params.get('tipo')) ? params.get('tipo') : '';
  const choose = value => setParams(value ? { tipo: value } : {}, { replace: true });
  const visible = items.filter(item => !category || item.category === category);
  return <>
    <div className="chip-row shop-filters" role="group" aria-label="Filtrar por tipo de decoración">
      <button className="chip" type="button" aria-pressed={!category} onClick={() => choose('')}>Todo</button>
      {categoryOrder.map(value => <button key={value} className="chip" type="button" aria-pressed={category === value} onClick={() => choose(value)}>{categoryPlural[value]}</button>)}
    </div>
    {category && <p className="results-desc shop-filter-hint">{categoryHints[category]}</p>}
    {collections.map((collection, index) => {
      const list = visible.filter(item => item.collection === collection.name);
      if (!list.length) return null;
      const id = `collection-${index}`;
      return <section key={collection.name} className={`shop-collection collection-${index + 1}`} aria-labelledby={id}>
        <header className="collection-head">
          <div>
            <p className="eyebrow">Colección</p>
            <h2 id={id}>{collection.name}</h2>
            <p>{collection.description}</p>
          </div>
          <span className="collection-count">{list.length} {list.length === 1 ? 'decoración' : 'decoraciones'}</span>
        </header>
        <ul className="shop-grid">{list.map(item => <ItemCard key={item.id} item={item} person={person} onOpen={onOpen}/>)}</ul>
      </section>;
    })}
  </>;
}

// Lo que ya compraste, para ponértelo o sacártelo, con la vista previa de tu perfil.
function Inventory({ items, person, onToggle }) {
  const owned = items.filter(item => item.owned);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  async function toggle(item) {
    setBusy(item.id); setError('');
    try { await onToggle(item); } catch (failure) { setError(failure.message); } finally { setBusy(null); }
  }
  if (!owned.length) return <div className="empty">
    <h2>Todavía no tenés decoraciones</h2>
    <p>Con los puntos que ganás ayudando a otros estudiantes podés comprar marcos, fondos, efectos y colores para tu nombre.</p>
    <Link className="btn btn-primary" to="/tienda">Ver la tienda</Link>
  </div>;
  return <div className="inventory">
    <aside className="inventory-preview" aria-labelledby="inventory-preview-title">
      <h2 id="inventory-preview-title">Tu perfil ahora</h2>
      <ProfileCardPreview person={person} decorations={person.decorations} subtitle={person.institution?.name}/>
      <Link className="text-link" to="/perfil">Ver mi perfil completo</Link>
    </aside>
    <div className="inventory-groups">
      {error && <div className="alert" role="alert"><p>{error}</p></div>}
      {categoryOrder.map(category => {
        const list = owned.filter(item => item.category === category);
        return <section key={category} className="inventory-group" aria-labelledby={`owned-${category}`}>
          <h2 id={`owned-${category}`}>{categoryPlural[category]}</h2>
          {list.length ? <ul className="inventory-list">{list.map(item => <li key={item.id} className={item.equipped ? 'inventory-item is-equipped' : 'inventory-item'}>
            <ShopItemPreview item={item} person={person} className="stage-small"/>
            <div>
              <h3>{item.name}</h3>
              <p className="shop-item-meta"><span className={`rarity-tag rarity-${item.rarity}`}>{rarityNames[item.rarity]}</span>{item.equipped && <span className="equipped-tag"><CheckIcon/>Puesta</span>}</p>
            </div>
            <button className={item.equipped ? 'btn btn-outline btn-small' : 'btn btn-primary btn-small'} type="button" aria-pressed={item.equipped} disabled={busy === item.id} onClick={() => toggle(item)}>
              {busy === item.id ? 'Guardando…' : item.equipped ? 'Sacar' : 'Poner'}<span className="sr-only"> {item.name}</span>
            </button>
          </li>)}</ul>
          : <p className="profile-empty">No tenés {categoryPlural[category].toLowerCase()}. <Link to={`/tienda?tipo=${category}`}>Ver {categoryPlural[category].toLowerCase()} en la tienda</Link></p>}
        </section>;
      })}
    </div>
  </div>;
}

// Saldo, nivel, reglas, lo ganado hoy y los movimientos.
function PointsView() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || '1');
  const loader = useCallback(signal => shopService.points(page, signal), [page]);
  const { result, loading, error, retry } = useFetch(loader);
  if (loading) return <Loading text="Cargando tus puntos…"/>;
  if (error) return <ErrorMessage message={error.message} retry={retry}/>;
  const { data, meta } = result;
  const progress = levelProgress(data.reputation, data.levels);
  const rules = data.rules;
  const earn = [
    ['Hacer una pregunta', rules.question.amount, data.today.question, rules.question.dailyLimit, null],
    ['Responder una pregunta', rules.answer.amount, data.today.answer, rules.answer.dailyLimit, 'Responder tus propias preguntas no suma.'],
    ['Que marquen tu respuesta como útil', rules.helpful.amount, data.today.helpful, rules.helpful.dailyLimit, 'Si la persona quita la marca, se descuentan.'],
  ];
  return <div className="points-view">
    <div className="points-summary">
      <section className="points-tile" aria-labelledby="balance-title">
        <h2 id="balance-title">Tu saldo</h2>
        <p className="points-big"><PointsIcon/>{formatPoints(data.balance)}<span>puntos</span></p>
        <p>Se usan en la tienda. Gastarlos no baja tu nivel.</p>
        <Link className="btn btn-primary btn-small" to="/tienda">Ir a la tienda</Link>
      </section>
      <section className="points-tile" aria-labelledby="level-title">
        <h2 id="level-title">Tu nivel</h2>
        <p className="level-line"><LevelBadge level={data.level}/><span>{formatPoints(data.reputation)} de reputación</span></p>
        <div className="level-meter" role="progressbar" aria-label="Avance al próximo nivel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span style={{ width: `${progress.percent}%` }}/></div>
        <p>{progress.next ? `Te faltan ${formatPoints(progress.missing)} de reputación para ser ${progress.next.name}.` : 'Llegaste al nivel más alto. ¡Gracias por ayudar!'}</p>
        <p className="fine-print">La reputación sube con lo mismo que da puntos y baja con las sanciones de moderación. Niveles: {data.levels.map(level => `${levelNames[level.key]} (desde ${formatPoints(level.min)})`).join(', ')}.</p>
      </section>
    </div>

    <section className="points-rules" aria-labelledby="earn-title">
      <h2 id="earn-title">Cómo sumar puntos</h2>
      <ul className="rule-list">{earn.map(([label, amount, today, limit, note]) => <li key={label}>
        <span className="rule-amount positive">+{amount}</span>
        <div><strong>{label}</strong>{note && <small>{note}</small>}</div>
        <span className="rule-today">Hoy: {today} de {limit}</span>
      </li>)}</ul>
      <p className="fine-print">Los topes diarios se reinician a la medianoche (hora de Argentina). Al crear tu cuenta recibiste {pointsLabel(rules.welcome)} de bienvenida.</p>
      <h2 className="rules-subtitle">Cómo se pierden</h2>
      <ul className="rule-list">
        <li><span className="rule-amount negative">−{rules.hidden}</span><div><strong>Moderación oculta algo que publicaste</strong><small>Por información falsa, ofensiva o spam.</small></div></li>
        <li><span className="rule-amount negative">−{rules.warning}</span><div><strong>Recibís una advertencia de moderación</strong><small>Si se revoca, te devolvemos todo.</small></div></li>
      </ul>
    </section>

    <section className="points-history" aria-labelledby="history-title">
      <h2 id="history-title">Movimientos</h2>
      {data.transactions.length ? <>
        <ul className="history-list">{data.transactions.map(row => <li key={row.id}>
          <div>
            <strong>{row.reason === 'purchase' ? `Compraste «${row.itemName}»` : reasonNames[row.reason]}</strong>
            <small>{formatDateTime(row.createdAt)}</small>
          </div>
          <span className={row.amount >= 0 ? 'history-amount positive' : 'history-amount negative'}>{row.amount >= 0 ? '+' : '−'}{formatPoints(Math.abs(row.amount))}</span>
          <span className="history-balance">Saldo: {formatPoints(row.balance)}</span>
        </li>)}</ul>
        {meta.pages > 1 && <nav className="pagination" aria-label="Páginas de movimientos">
          {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ ver: 'puntos', page: String(page - 1) })}>Anteriores</button>}
          <span>Página {meta.page} de {meta.pages}</span>
          {page < meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => setParams({ ver: 'puntos', page: String(page + 1) })}>Más viejos</button>}
        </nav>}
      </> : <p className="profile-empty">Todavía no hay movimientos.</p>}
    </section>
  </div>;
}

// Tienda de decoraciones (/tienda), tu colección (?ver=inventario) y tus puntos (?ver=puntos).
export default function ShopPage() {
  const { user, reloadUser } = useAuth();
  const [params] = useSearchParams();
  const view = ['inventario', 'puntos'].includes(params.get('ver')) ? params.get('ver') : '';
  usePageTitle(view === 'puntos' ? 'Mis puntos' : view === 'inventario' ? 'Mis decoraciones' : 'Tienda');
  const loader = useCallback(signal => shopService.catalog(signal), []);
  const catalog = useFetch(loader);
  const [shop, setShop] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { if (catalog.result) setShop({ items: catalog.result.data, ...catalog.result.meta }); }, [catalog.result]);

  // Después de comprar o ponerse algo se actualiza la sesión: el encabezado y el perfil muestran lo nuevo.
  async function purchase(item) {
    const { data } = await shopService.purchase(item.id);
    setShop(previous => ({ ...previous, balance: data.balance, items: previous.items.map(row => row.id === item.id ? { ...row, owned: true } : row) }));
    setOpen(previous => previous && previous.id === item.id ? { ...previous, owned: true } : previous);
    await reloadUser();
  }
  async function toggle(item) {
    const { data } = item.equipped ? await shopService.unequip(item.id) : await shopService.equip(item.id);
    const equipped = row => data.decorations[decorationKeys[row.category]] === row.slug;
    setShop(previous => ({ ...previous, items: previous.items.map(row => ({ ...row, equipped: equipped(row) })) }));
    setOpen(previous => previous ? { ...previous, equipped: equipped(previous) } : previous);
    await reloadUser();
  }

  const ownedCount = shop?.items.filter(item => item.owned).length ?? 0;
  return <div className="container page shop-page">
    <header className="shop-hero">
      <div className="shop-hero-copy">
        <p className="eyebrow">Tienda de Forbook</p>
        <h1>Decorá tu perfil.</h1>
        <p className="lead">Marcos, fondos, efectos y colores para tu nombre. Se compran con los puntos que ganás ayudando a otros estudiantes: nada se paga con dinero.</p>
      </div>
      <div className="balance-card" aria-live="polite">
        <span className="balance-label">Tu saldo</span>
        <strong className="balance-amount"><PointsIcon/>{formatPoints(shop?.balance ?? user.points ?? 0)}</strong>
        <span className="balance-level">Nivel {levelNames[shop?.level || user.level] || 'Nuevo'}</span>
      </div>
    </header>

    <nav className="mod-nav shop-tabs" aria-label="Secciones de la tienda">
      {views.map(([key, label]) => <Link key={key || 'tienda'} to={key ? `/tienda?ver=${key}` : '/tienda'} aria-current={view === key ? 'page' : undefined}>
        {label}{key === 'inventario' && shop ? ` (${ownedCount})` : ''}
      </Link>)}
    </nav>

    {view === 'puntos' ? <PointsView/>
      : catalog.loading || (!shop && !catalog.error) ? <Loading text="Abriendo la tienda…"/>
      : catalog.error ? <ErrorMessage message={catalog.error.message} retry={catalog.retry}/>
      : view === 'inventario' ? <Inventory items={shop.items} person={user} onToggle={toggle}/>
      : <Catalog items={shop.items} collections={shop.collections} person={user} onOpen={setOpen}/>}

    {open && shop && <ItemDialog key={open.id} item={open} person={user} balance={shop.balance} onClose={() => setOpen(null)} onPurchase={purchase} onToggle={toggle}/>}
  </div>;
}
