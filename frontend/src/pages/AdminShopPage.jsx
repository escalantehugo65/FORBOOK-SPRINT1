import { useCallback, useState } from 'react';
import { adminService } from '../services/admin';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import { categoryNames, categoryOrder, rarityNames } from '../utils/shop';

function ItemRow({ item, onSaved }) {
  const [price, setPrice] = useState(String(item.price));
  const [available, setAvailable] = useState(item.available);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changed = Number(price) !== item.price || available !== item.available;
  async function save() {
    const value = Number(price);
    if (!Number.isInteger(value) || value < 1 || value > 100000) { setError('Entre 1 y 100000.'); return; }
    setBusy(true); setError('');
    try { const result = await adminService.updateShopItem(item.id, { price: value, available }); onSaved(item.id, { price: value, available }, result.message); }
    catch (failure) { setError(Object.values(failure.fields || {})[0] || failure.message); }
    finally { setBusy(false); }
  }
  return <tr>
    <th scope="row">{item.name}<small className="card-meta">{item.collection}</small></th>
    <td>{categoryNames[item.category]}</td>
    <td>{rarityNames[item.rarity]}</td>
    <td className="num">{item.owners}</td>
    <td>
      <label className="sr-only" htmlFor={`price-${item.id}`}>Precio de {item.name}</label>
      <input id={`price-${item.id}`} className="shop-price" type="number" inputMode="numeric" min="1" max="100000" step="1" value={price} disabled={busy} onChange={event => { setPrice(event.target.value); setError(''); }} aria-invalid={!!error}/>
      {error && <small className="field-error" role="alert">{error}</small>}
    </td>
    <td><label className="choice"><input type="checkbox" checked={available} disabled={busy} onChange={event => setAvailable(event.target.checked)}/>Se vende</label></td>
    <td><button className="btn btn-primary btn-small" type="button" disabled={busy || !changed} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}<span className="sr-only"> {item.name}</span></button></td>
  </tr>;
}

// /admin/tienda: precio de cada decoración y si se sigue vendiendo. Quien ya la compró la conserva.
export default function AdminShopPage() {
  usePageTitle('Tienda');
  const loader = useCallback(signal => adminService.shop(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const [saved, setSaved] = useState({});
  const [notice, setNotice] = useState('');
  const items = (result?.data || []).map(item => ({ ...item, ...saved[item.id] }));
  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Administración</p>
      <h1>Tienda de decoraciones.</h1>
      <p className="lead">Cambiá el precio o dejá de vender una decoración. Quien ya la tiene la conserva y la puede seguir usando.</p>
    </header>
    <ModerationNav/>
    {notice && <p className="report-done" role="status">{notice}</p>}
    {loading ? <Loading text="Cargando la tienda…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : categoryOrder.map(category => {
        const list = items.filter(item => item.category === category);
        if (!list.length) return null;
        return <section key={category} className="people-section" aria-labelledby={`shop-${category}`}>
          <h2 id={`shop-${category}`}>{categoryNames[category]}</h2>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th scope="col">Decoración</th><th scope="col">Categoría</th><th scope="col">Rareza</th><th scope="col" className="num">La tienen</th><th scope="col">Precio</th><th scope="col">Venta</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{list.map(item => <ItemRow key={`${item.id}-${item.price}-${item.available}`} item={item} onSaved={(id, changes, message) => { setSaved(previous => ({ ...previous, [id]: changes })); setNotice(message); }}/>)}</tbody>
          </table></div>
        </section>;
      })}
  </div>;
}
