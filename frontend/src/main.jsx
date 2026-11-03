import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';
import './editorial.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><ThemeProvider><AuthProvider><App/></AuthProvider></ThemeProvider></BrowserRouter></React.StrictMode>);
