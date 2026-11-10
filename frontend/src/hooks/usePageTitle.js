import { useEffect } from 'react';

// Cambia el título de la pestaña según la pantalla, para orientarse y para lectores de pantalla.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Forbook` : 'Forbook · Tu llegada a Formosa';
  }, [title]);
}
