import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import { PrivateRoute } from './router/guards';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ContentDetailPage from './pages/ContentDetailPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const { pathname, hash } = useLocation();
  // Al cambiar de pantalla se vuelve arriba; si la dirección trae #seccion, se baja hasta esa sección.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return <Routes>
    <Route element={<Layout/>}>
      <Route index element={<WelcomePage/>}/>
      <Route path="registro" element={<Navigate to="/" replace state={{ authMode: 'register' }}/>}/>
      <Route path="ingresar" element={<Navigate to="/" replace state={{ authMode: 'login' }}/>}/>
      <Route element={<PrivateRoute/>}>
        <Route path="inicio" element={<HomePage/>}/>
        <Route path="conozcamos" element={<ExplorePage/>}/>
        <Route path="conozcamos/:id" element={<ContentDetailPage/>}/>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Route>
  </Routes>;
}
