import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/admin';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { Loading, ErrorMessage } from '../components/Feedback';
import ModerationNav from '../components/ModerationNav';
import { formatPoints } from '../utils/shop';

function Stat({ value, label, to, alert = false }) {
  const content = <><dt>{label}</dt><dd>{formatPoints(value)}</dd></>;
  return to ? <Link className={`stat-card${alert ? ' is-alert' : ''}`} to={to}><dl className="stat-inner">{content}</dl></Link>
    : <div className={`stat-card${alert ? ' is-alert' : ''}`}><dl className="stat-inner">{content}</dl></div>;
}

// /admin: resumen del panel de administración (solo cuentas admin).
export default function AdminDashboardPage() {
  usePageTitle('Panel de administración');
  const loader = useCallback(signal => adminService.stats(signal), []);
  const { result, loading, error, retry } = useFetch(loader);
  const stats = result?.data;
  return <div className="container page">
    <header className="page-header">
      <p className="eyebrow">Administración</p>
      <h1>Panel de administración.</h1>
      <p className="lead">Cuentas, sanciones y apelaciones, reportes, comunidades, fichas, el mapa y la tienda. Cada cambio queda en el historial.</p>
    </header>
    <ModerationNav/>
    {loading ? <Loading text="Cargando el resumen…"/>
      : error ? <ErrorMessage message={error.message} retry={retry}/>
      : <>
        <section aria-labelledby="pending-title">
          <h2 id="pending-title" className="admin-subtitle">Para revisar</h2>
          <div className="stat-grid">
            <Stat value={stats.moderation.pendingReports} label="Reportes pendientes" to="/moderacion" alert={stats.moderation.pendingReports > 0}/>
            <Stat value={stats.moderation.pendingAppeals} label="Apelaciones pendientes" to="/admin/apelaciones" alert={stats.moderation.pendingAppeals > 0}/>
            <Stat value={stats.moderation.sanctions.restriction} label="Cuentas restringidas" to="/admin/usuarios?state=restricted"/>
            <Stat value={stats.moderation.sanctions.suspension} label="Cuentas suspendidas" to="/admin/usuarios?state=suspended"/>
            <Stat value={stats.moderation.sanctions.ban} label="Cuentas dadas de baja" to="/admin/usuarios?state=banned"/>
            <Stat value={stats.moderation.activeWarnings} label="Advertencias vigentes"/>
          </div>
        </section>
        <section aria-labelledby="users-title">
          <h2 id="users-title" className="admin-subtitle">Cuentas</h2>
          <div className="stat-grid">
            <Stat value={stats.users.total} label="Cuentas en total" to="/admin/usuarios"/>
            <Stat value={stats.users.lastWeek} label="Nuevas en los últimos 7 días"/>
            <Stat value={stats.users.byRole.student} label="Estudiantes" to="/admin/usuarios?role=student"/>
            <Stat value={stats.users.byRole.moderator} label="Moderación" to="/admin/usuarios?role=moderator"/>
            <Stat value={stats.users.byRole.admin} label="Administración" to="/admin/usuarios?role=admin"/>
          </div>
        </section>
        <section aria-labelledby="activity-title">
          <h2 id="activity-title" className="admin-subtitle">Actividad</h2>
          <div className="stat-grid">
            <Stat value={stats.activity.questions} label="Preguntas visibles"/>
            <Stat value={stats.activity.answers} label="Respuestas visibles"/>
            <Stat value={stats.activity.contents} label="Fichas publicadas" to="/moderacion/fichas"/>
            <Stat value={stats.activity.userContents} label="Fichas de estudiantes"/>
            <Stat value={stats.activity.communities} label="Comunidades abiertas" to="/admin/comunidades"/>
            <Stat value={stats.activity.messagesToday} label="Mensajes hoy"/>
            <Stat value={stats.activity.friendships} label="Amistades"/>
          </div>
        </section>
      </>}
    <p className="note">Para dar acceso de administración a una cuenta nueva, cambiale el rol desde Usuarios. Siempre tiene que quedar al menos una cuenta de administración.</p>
  </div>;
}
