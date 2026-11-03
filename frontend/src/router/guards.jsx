import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading, ErrorMessage } from '../components/Feedback';

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
export function PublicRoute() { const { user } = useAuth(); return <SessionState>{user ? <Navigate to="/inicio" replace/> : <Outlet/>}</SessionState>; }
