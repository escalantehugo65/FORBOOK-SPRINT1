import { request } from './api';

// Perfiles. Los pedidos que modifican datos siempre mandan JSON.
export const profileService = {
  mine: signal => request('/profile', { signal }),
  update: body => request('/profile', { method: 'PUT', body }),
  changePassword: body => request('/profile/password', { method: 'PUT', body }),
  user: (id, signal) => request(`/users/${encodeURIComponent(id)}`, { signal }),
  warn: (id, body) => request(`/moderation/users/${encodeURIComponent(id)}/warnings`, { method: 'POST', body }),
  revokeWarning: (id, body) => request(`/moderation/warnings/${encodeURIComponent(id)}/revoke`, { method: 'POST', body }),
  setBio: (id, hidden, body) => request(`/moderation/users/${encodeURIComponent(id)}/bio/${hidden ? 'hide' : 'show'}`, { method: 'POST', body }),
};
