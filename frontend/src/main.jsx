import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource-variable/nunito-sans';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/access.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><ThemeProvider><AuthProvider><App/></AuthProvider></ThemeProvider></BrowserRouter></React.StrictMode>);
