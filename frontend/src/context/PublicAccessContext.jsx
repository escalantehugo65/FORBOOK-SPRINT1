import { createContext, useContext } from 'react';

// Permite que cualquier página abra la ventana de ingreso o registro: openAccess('login' | 'register').
export const PublicAccessContext = createContext({ openAccess: () => {} });
export function usePublicAccess() { return useContext(PublicAccessContext); }
