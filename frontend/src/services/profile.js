import { request } from './api';

const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));

// Perfiles. Los pedidos que modifican datos siempre mandan JSON.
export const profileService = {
  mine: signal => request('/profile', { signal }),
  update: body => request('/profile', { method: 'PUT', body }),
  changePassword: body => request('/profile/password', { method: 'PUT', body }),
  changeEmail: body => request('/profile/email', { method: 'PUT', body }),
  // Dar de baja la propia cuenta: pide la contraseña y no se puede deshacer.
  deleteAccount: body => request('/profile', { method: 'DELETE', body }),
  user: (id, signal) => request(`/users/${encodeURIComponent(id)}`, { signal }),
  search: (filters, signal) => request(`/users?${query(filters)}`, { signal }),
  suggested: signal => request('/users/suggested', { signal }),
  // La foto ya va recortada y en JPEG: { image: "data:image/jpeg;base64,..." }.
  uploadAvatar: image => request('/profile/avatar', { method: 'PUT', body: { image } }),
  removeAvatar: () => request('/profile/avatar', { method: 'DELETE', body: {} }),
  warn: (id, body) => request(`/moderation/users/${encodeURIComponent(id)}/warnings`, { method: 'POST', body }),
  revokeWarning: (id, body) => request(`/moderation/warnings/${encodeURIComponent(id)}/revoke`, { method: 'POST', body }),
  setBio: (id, hidden, body) => request(`/moderation/users/${encodeURIComponent(id)}/bio/${hidden ? 'hide' : 'show'}`, { method: 'POST', body }),
  removeAvatarByModeration: (id, body) => request(`/moderation/users/${encodeURIComponent(id)}/avatar/remove`, { method: 'POST', body }),
};
