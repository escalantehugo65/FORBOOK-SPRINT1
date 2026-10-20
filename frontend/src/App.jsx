import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import { PrivateRoute, PublicRoute } from './router/guards';
import WelcomePage from './pages/WelcomePage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ContentDetailPage from './pages/ContentDetailPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); document.title = 'Forbook · Tu llegada a Formosa'; }, [pathname]);
  return <Routes><Route element={<Layout/>}><Route index element={<WelcomePage/>}/><Route element={<PublicRoute/>}><Route path="registro" element={<AuthPage key="register" registration/>}/><Route path="ingresar" element={<AuthPage key="login"/>}/></Route><Route element={<PrivateRoute/>}><Route path="inicio" element={<HomePage/>}/><Route path="conozcamos" element={<ExplorePage/>}/><Route path="conozcamos/:id" element={<ContentDetailPage/>}/></Route><Route path="*" element={<NotFoundPage/>}/></Route></Routes>;
}
