import { createContext, useContext } from 'react';
export const PublicAccessContext = createContext(null);
export function usePublicAccess() { return useContext(PublicAccessContext); }
