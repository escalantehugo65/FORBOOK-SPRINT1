import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading, ErrorMessage } from '../components/Feedback';

function SessionState({ children }) {
  const { checking, error, refresh } = useAuth();
  if (checking) return <div className="container section"><Loading text="Comprobando tu sesión…"/></div>;
  if (error) return <div className="container section"><ErrorMessage message={error} retry={refresh}/></div>;
  return children;
}
export function PrivateRoute() { const { user } = useAuth(); return <SessionState>{user ? <Outlet/> : <Navigate to="/" replace state={{ authMode: 'login' }}/>}</SessionState>; }
export function PublicRoute() { const { user } = useAuth(); return <SessionState>{user ? <Navigate to="/inicio" replace/> : <Outlet/>}</SessionState>; }
