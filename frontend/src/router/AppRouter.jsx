import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from '../components/Layout';
import { Loading } from '../components/Feedback';
import { PrivateRoutes } from './PrivateRoutes';
import { PublicRoutes } from './PublicRoutes';
import { RoleRoutes } from './RoleRoutes';
import WelcomePage from '../pages/WelcomePage';
import HomePage from '../pages/HomePage';
import ExplorePage from '../pages/ExplorePage';
import ContentDetailPage from '../pages/ContentDetailPage';
import NotFoundPage from '../pages/NotFoundPage';
import QuestionsPage from '../pages/QuestionsPage';
import AskQuestionPage from '../pages/AskQuestionPage';
import QuestionDetailPage from '../pages/QuestionDetailPage';
import ModerationPage from '../pages/ModerationPage';
import ModerationLogPage from '../pages/ModerationLogPage';
import AdminCatalogPage from '../pages/AdminCatalogPage';
import RoutesPage from '../pages/RoutesPage';
import RouteDetailPage from '../pages/RouteDetailPage';
import GroupsPage from '../pages/GroupsPage';
import GroupDetailPage from '../pages/GroupDetailPage';
import ProfilePage from '../pages/ProfilePage';
import UserProfilePage from '../pages/UserProfilePage';
import ShopPage from '../pages/ShopPage';
import SearchPage from '../pages/SearchPage';
import AdminContentsPage from '../pages/AdminContentsPage';
import AdminRoutesPage from '../pages/AdminRoutesPage';
import CommunitiesPage from '../pages/CommunitiesPage';


// El mapa (Leaflet) se descarga solo cuando alguien entra a /mapa.
const MapPage = lazy(() => import('../pages/MapPage'));
const AdminPlacesPage = lazy(() => import('../pages/AdminPlacesPage'));
// Las pantallas de una comunidad (chat, administración) y las misiones se descargan recién al entrar.
const CommunityPage = lazy(() => import('../pages/CommunityPage'));
const CommunityFormPage = lazy(() => import('../pages/CommunityFormPage'));
const MissionsPage = lazy(() => import('../pages/MissionsPage'));
const pageFallback = <div className="container page"><Loading/></div>;
const mapFallback = <div className="container page"><Loading text="Cargando el mapa…"/></div>;

export const AppRouter = () => {
  const { pathname, hash } = useLocation();
  // Al cambiar de pantalla se vuelve arriba; si la dirección trae #seccion, se baja hasta esa sección.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return <Routes>
    <Route element={<Layout/>}>
      {/* Rutas públicas: la bienvenida la ven todos */}
      <Route index element={<WelcomePage/>}/>
      <Route element={<PublicRoutes/>}>
        <Route path="registro" element={<Navigate to="/" replace state={{ authMode: 'register' }}/>}/>
        <Route path="ingresar" element={<Navigate to="/" replace state={{ authMode: 'login' }}/>}/>
      </Route>

      {/* Rutas privadas: sin sesión, PrivateRoutes abre la ventana de ingreso */}
      <Route element={<PrivateRoutes/>}>
        <Route path="inicio" element={<HomePage/>}/>
        <Route path="conozcamos" element={<ExplorePage/>}/>
        <Route path="conozcamos/:id" element={<ContentDetailPage/>}/>
        <Route path="preguntas" element={<QuestionsPage/>}/>
        <Route path="preguntas/nueva" element={<AskQuestionPage/>}/>
        <Route path="preguntas/:id" element={<QuestionDetailPage/>}/>
        <Route path="mapa" element={<Suspense fallback={mapFallback}><MapPage/></Suspense>}/>
        <Route path="rutas" element={<RoutesPage/>}/>
        <Route path="rutas/:id" element={<RouteDetailPage/>}/>
        <Route path="comunidades" element={<CommunitiesPage/>}/>
        <Route path="comunidades/nueva" element={<Suspense fallback={pageFallback}><CommunityFormPage/></Suspense>}/>
        <Route path="comunidades/:id" element={<Suspense fallback={pageFallback}><CommunityPage/></Suspense>}/>
        <Route path="comunidades/:id/editar" element={<Suspense fallback={pageFallback}><CommunityFormPage/></Suspense>}/>
        <Route path="misiones" element={<Suspense fallback={pageFallback}><MissionsPage/></Suspense>}/>
        <Route path="espacios" element={<GroupsPage/>}/>
        <Route path="espacios/:id" element={<GroupDetailPage/>}/>
        <Route path="perfil" element={<ProfilePage/>}/>
        <Route path="usuarios/:id" element={<UserProfilePage/>}/>
        <Route path="tienda" element={<ShopPage/>}/>
        <Route path="buscar" element={<SearchPage/>}/>

        {/* Moderación y administración */}
        <Route element={<RoleRoutes roles={['moderator', 'admin']}/>}>
          <Route path="moderacion" element={<ModerationPage/>}/>
        </Route>
        <Route element={<RoleRoutes roles={['admin']}/>}>
          <Route path="moderacion/historial" element={<ModerationLogPage/>}/>
          <Route path="moderacion/catalogo" element={<AdminCatalogPage/>}/>
          <Route path="moderacion/fichas" element={<AdminContentsPage/>}/>
          <Route path="moderacion/rutas" element={<AdminRoutesPage/>}/>
          <Route path="moderacion/lugares" element={<Suspense fallback={mapFallback}><AdminPlacesPage/></Suspense>}/>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage/>}/>
    </Route>
  </Routes>;
};
