import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Solo para quien no inició sesión (ingresar y crear cuenta). Con sesión, va directo a su inicio.
// Mientras se comprueba la sesión deja pasar: Layout abre la ventana de acceso cuando termina de comprobar.
export const PublicRoutes = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/inicio" replace/> : <Outlet/>;
};
