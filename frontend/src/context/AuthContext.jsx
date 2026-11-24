import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    setChecking(true); setError(null);
    try { const result = await authService.me(); setUser(result.data.user); }
    catch (error) { if (error.status === 401) setUser(null); else setError(error.message); }
    finally { setChecking(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  // Actualiza los datos de la sesión sin mostrar la pantalla de carga (por ejemplo, al editar el perfil).
  const reloadUser = useCallback(async () => {
    try { const result = await authService.me(); setUser(result.data.user); } catch (error) { if (error.status === 401) setUser(null); /* si es otro error, se conserva lo que había */ }
  }, []);
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('forbook:unauthorized', expired);
    window.addEventListener('forbook:account', reloadUser);
    return () => { window.removeEventListener('forbook:unauthorized', expired); window.removeEventListener('forbook:account', reloadUser); };
  }, [reloadUser]);
  const login = async values => { const result = await authService.login(values); setUser(result.data.user); };
  const register = async values => { const result = await authService.register(values); if (result.data.sessionStarted) setUser(result.data.user); return result.data.sessionStarted; };
  const logout = async () => { await authService.logout(); setUser(null); };
  return <AuthContext.Provider value={{ user, checking, error, refresh, reloadUser, login, register, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
