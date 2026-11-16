import { useAuth } from '../context/AuthContext';
import { Loading, ErrorMessage } from '../components/Feedback';

// Mientras se comprueba la sesión no se muestra contenido privado ni se redirige antes de tiempo.
export const SessionState = ({ children }) => {
  const { checking, error, refresh } = useAuth();
  if (checking) return <div className="container page"><Loading text="Comprobando tu sesión…"/></div>;
  if (error) return <div className="container page"><ErrorMessage message={error} retry={refresh}/></div>;
  return children;
};
