import { request } from './api';

// Sanciones de la propia cuenta y apelaciones. Responden aunque la cuenta esté suspendida.
export const sanctionService = {
  mine: signal => request('/sanctions/mine', { signal }),
  appeal: body => request('/sanctions/appeals', { method: 'POST', body }),
};
