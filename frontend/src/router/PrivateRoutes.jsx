import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionState } from './SessionState';

// Solo deja pasar con sesión iniciada. Sin sesión vuelve a la bienvenida con la ventana de ingreso abierta
// y, después de entrar, lleva a la página que se había pedido.
export const PrivateRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();
  return <SessionState>
    {user ? <Outlet/> : <Navigate to="/" replace state={{ authMode: 'login', from: `${location.pathname}${location.search}` }}/>}
  </SessionState>;
};
