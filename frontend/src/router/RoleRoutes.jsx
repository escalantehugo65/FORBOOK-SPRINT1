import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ForbiddenPage from '../pages/ForbiddenPage';

// Secciones de moderación (épica 7): con sesión pero sin el rol, se explica que no hay permiso.
// Va dentro de PrivateRoutes. El backend también lo controla en cada pedido.
export const RoleRoutes = ({ roles }) => {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet/> : <ForbiddenPage/>;
};
