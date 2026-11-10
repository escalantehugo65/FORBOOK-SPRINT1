import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import { PrivateRoute, RoleRoute } from './router/guards';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ContentDetailPage from './pages/ContentDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import QuestionsPage from './pages/QuestionsPage';
import AskQuestionPage from './pages/AskQuestionPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import ModerationPage from './pages/ModerationPage';
import ModerationLogPage from './pages/ModerationLogPage';
import AdminCatalogPage from './pages/AdminCatalogPage';
import { Loading } from './components/Feedback';
import RoutesPage from './pages/RoutesPage';
import RouteDetailPage from './pages/RouteDetailPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';

// El mapa (Leaflet) se descarga solo cuando alguien entra a /mapa.
const MapPage = lazy(() => import('./pages/MapPage'));
const AdminPlacesPage = lazy(() => import('./pages/AdminPlacesPage'));
const mapFallback = <div className="container page"><Loading text="Cargando el mapa…"/></div>;

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
        <Route path="preguntas" element={<QuestionsPage/>}/>
        <Route path="preguntas/nueva" element={<AskQuestionPage/>}/>
        <Route path="preguntas/:id" element={<QuestionDetailPage/>}/>
        <Route path="mapa" element={<Suspense fallback={mapFallback}><MapPage/></Suspense>}/>
        <Route path="rutas" element={<RoutesPage/>}/>
        <Route path="rutas/:id" element={<RouteDetailPage/>}/>
        <Route path="espacios" element={<GroupsPage/>}/>
        <Route path="espacios/:id" element={<GroupDetailPage/>}/>
        <Route element={<RoleRoute roles={['moderator', 'admin']}/>}>
          <Route path="moderacion" element={<ModerationPage/>}/>
        </Route>
        <Route element={<RoleRoute roles={['admin']}/>}>
          <Route path="moderacion/historial" element={<ModerationLogPage/>}/>
          <Route path="moderacion/catalogo" element={<AdminCatalogPage/>}/>
          <Route path="moderacion/lugares" element={<Suspense fallback={mapFallback}><AdminPlacesPage/></Suspense>}/>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Route>
  </Routes>;
}
