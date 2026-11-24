import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { adminService } from '../services/admin';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import Avatar from '../components/Avatar';
import Field from '../components/Field';
import { accountStateNames } from '../utils/sanctions';
import { roleNames } from '../utils/admin';
import { formatDate } from '../utils/content';
import { formatPoints } from '../utils/shop';

// /admin/usuarios?search=ana&role=student&state=suspended&page=2: todas las cuentas, con su estado.
export default function AdminUsersPage() {
  usePageTitle('Usuarios');
  const [params, setParams] = useSearchParams();
  const notice = useLocation().state?.notice;
  const filters = { search: params.get('search') || '', role: params.get('role') || '', state: params.get('state') || '', page: params.get('page') || '' };
  const [text, setText] = useState(filters.search);
  useEffect(() => { setText(filters.search); }, [filters.search]);
  const key = params.toString();
  const loader = useCallback(signal => adminService.users(Object.fromEntries(new URLSearchParams(key)), signal), [key]);
  const { result, loading, error, retry } = useFetch(loader);
  const update = changes => setParams(Object.fromEntries(Object.entries({ ...filters, ...changes, page: changes.page || '' }).filter(([, value]) => value)));
  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    update({ search: value.length >= 2 ? value.slice(0, 80) : '' });
  }
  const meta = result?.meta;
  const page = Number(filters.page || 1);
  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Administración</p>
      <h1>Usuarios.</h1>
      <p className="lead">Buscá por nombre o correo. Desde cada cuenta podés cambiar el rol, sancionar, revocar sanciones y ajustar puntos.</p>
    </header>
    <ModerationNav/>
    {notice && <p className="report-done" role="status">{notice}</p>}
    <form className="filter-bar admin-filters" onSubmit={submit} noValidate>
      <Field label="Nombre o correo" name="user-search" type="search" value={text} maxLength={80} onChange={event => setText(event.target.value)}/>
      <Field label="Rol" name="user-role" value={filters.role} onChange={event => update({ role: event.target.value })}>
        <option value="">Todos</option>
        {Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Field>
      <Field label="Estado" name="user-state" value={filters.state} onChange={event => update({ state: event.target.value })}>
        <option value="">Todos</option>
        {Object.entries(accountStateNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Field>
      <div className="field"><span className="sr-only">Buscar</span><button className="btn btn-primary" type="submit">Buscar</button></div>
    </form>
    {loading ? <Loading text="Cargando cuentas…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : !result.data.length ? <div className="empty"><h2>No hay cuentas con esos filtros</h2><p>Probá con otro nombre, rol o estado.</p></div>
      : <>
        <p className="results-count" role="status">{meta.total} {meta.total === 1 ? 'cuenta' : 'cuentas'}</p>
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th scope="col">Cuenta</th><th scope="col">Institución</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col" className="num">Advert.</th><th scope="col" className="num">Puntos</th><th scope="col">Alta</th></tr></thead>
          <tbody>{result.data.map(person => <tr key={person.id}>
            <td><div className="admin-person"><Avatar person={person} size="small"/><div><Link to={`/admin/usuarios/${person.id}`}>{person.name}</Link>{person.own && ' (vos)'}<small>{person.email}</small></div></div></td>
            <td>{person.institution || '—'}</td>
            <td>{roleNames[person.role]}</td>
            <td><span className={`badge state-badge state-${person.state}`}>{accountStateNames[person.state]}</span></td>
            <td className="num">{person.warnings}</td>
            <td className="num">{formatPoints(person.points)}</td>
            <td>{formatDate(person.createdAt)}</td>
          </tr>)}</tbody>
        </table></div>
        {meta.pages > 1 && <nav className="pagination" aria-label="Páginas de cuentas">
          {page > 1 && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(page - 1) })}>Anterior</button>}
          <span>Página {meta.page} de {meta.pages}</span>
          {page < meta.pages && <button className="btn btn-outline btn-small" type="button" onClick={() => update({ page: String(page + 1) })}>Siguiente</button>}
        </nav>}
      </>}
  </div>;
}
