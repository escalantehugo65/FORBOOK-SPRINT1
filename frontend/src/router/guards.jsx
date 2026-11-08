import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading, ErrorMessage } from '../components/Feedback';
import ForbiddenPage from '../pages/ForbiddenPage';

// Mientras se comprueba la sesión no se muestra contenido privado ni se redirige antes de tiempo.
function SessionState({ children }) {
  const { checking, error, refresh } = useAuth();
  if (checking) return <div className="container page"><Loading text="Comprobando tu sesión…"/></div>;
  if (error) return <div className="container page"><ErrorMessage message={error} retry={refresh}/></div>;
  return children;
}
// Sin sesión se vuelve a la bienvenida con la ventana de ingreso abierta y, después, a la página pedida.
export function PrivateRoute() {
  const { user } = useAuth();
  const location = useLocation();
  return <SessionState>{user ? <Outlet/> : <Navigate to="/" replace state={{ authMode: 'login', from: `${location.pathname}${location.search}` }}/>}</SessionState>;
}
// Secciones de moderación (épica 7): con sesión pero sin el rol, se explica que no hay permiso.
// El backend también lo controla en cada pedido.
export function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet/> : <ForbiddenPage/>;
}
export function PublicRoute() { const { user } = useAuth(); return <SessionState>{user ? <Navigate to="/inicio" replace/> : <Outlet/>}</SessionState>; }
