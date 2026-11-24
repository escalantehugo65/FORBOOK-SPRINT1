import { request } from './api';

const id = value => encodeURIComponent(value);

// Amigos: solicitud, aceptar y quitar (o cancelar, o rechazar). Los pedidos que modifican datos mandan JSON.
export const friendService = {
  list: (search = '', signal) => request(`/friends${search ? `?${new URLSearchParams({ search })}` : ''}`, { signal }),
  requests: signal => request('/friends/requests', { signal }),
  ofUser: (userId, signal) => request(`/users/${id(userId)}/friends`, { signal }),
  send: userId => request(`/users/${id(userId)}/friendship`, { method: 'POST', body: {} }),
  accept: userId => request(`/users/${id(userId)}/friendship/accept`, { method: 'POST', body: {} }),
  remove: userId => request(`/users/${id(userId)}/friendship`, { method: 'DELETE', body: {} }),
  summary: signal => request('/notifications/summary', { signal }),
};
