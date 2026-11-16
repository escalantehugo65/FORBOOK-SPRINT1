import { apiUrl, request } from './api';

const id = value => encodeURIComponent(value);
const query = params => {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== null));
  return search.size ? `?${search}` : '';
};

// Comunidades, su chat, ocultar o bloquear personas y misiones.
// Los pedidos que modifican datos siempre mandan JSON, aunque sea {}.
export const communityService = {
  list: (filters, signal) => request(`/communities${query(filters)}`, { signal }),
  unread: signal => request('/communities/unread', { signal }),
  create: body => request('/communities', { method: 'POST', body }),
  detail: (communityId, signal) => request(`/communities/${id(communityId)}`, { signal }),
  update: (communityId, body) => request(`/communities/${id(communityId)}`, { method: 'PUT', body }),
  close: communityId => request(`/communities/${id(communityId)}`, { method: 'DELETE', body: {} }),
  join: communityId => request(`/communities/${id(communityId)}/join`, { method: 'POST', body: {} }),
  leave: communityId => request(`/communities/${id(communityId)}/membership`, { method: 'DELETE', body: {} }),
  notifications: (communityId, notifications) => request(`/communities/${id(communityId)}/membership`, { method: 'PUT', body: { notifications } }),
  members: (communityId, filters, signal) => request(`/communities/${id(communityId)}/members${query(filters)}`, { signal }),
  updateMember: (communityId, userId, body) => request(`/communities/${id(communityId)}/members/${id(userId)}`, { method: 'PUT', body }),
  ban: (communityId, userId) => request(`/communities/${id(communityId)}/members/${id(userId)}`, { method: 'DELETE', body: {} }),
  unban: (communityId, userId) => request(`/communities/${id(communityId)}/members/${id(userId)}/unban`, { method: 'POST', body: {} }),
  createRole: (communityId, body) => request(`/communities/${id(communityId)}/roles`, { method: 'POST', body }),
  updateRole: (communityId, roleId, body) => request(`/communities/${id(communityId)}/roles/${id(roleId)}`, { method: 'PUT', body }),
  deleteRole: (communityId, roleId) => request(`/communities/${id(communityId)}/roles/${id(roleId)}`, { method: 'DELETE', body: {} }),
  messages: (communityId, filters, signal) => request(`/communities/${id(communityId)}/messages${query(filters)}`, { signal }),
  send: (communityId, body) => request(`/communities/${id(communityId)}/messages`, { method: 'POST', body }),
  deleteMessage: (communityId, messageId) => request(`/communities/${id(communityId)}/messages/${id(messageId)}`, { method: 'DELETE', body: {} }),
  // Dirección de la imagen o el audio de un mensaje, para usar en <img> o <audio>.
  attachmentUrl: (communityId, messageId) => apiUrl(`/communities/${id(communityId)}/messages/${id(messageId)}/attachment`),
  blocks: signal => request('/blocks', { signal }),
  block: (userId, kind) => request(`/users/${id(userId)}/block`, { method: 'PUT', body: { kind } }),
  unblock: userId => request(`/users/${id(userId)}/block`, { method: 'DELETE', body: {} }),
  missions: signal => request('/missions', { signal }),
  claim: key => request(`/missions/${id(key)}/claim`, { method: 'POST', body: {} }),
};

// Avisa al encabezado que cambió la cantidad de mensajes sin leer (para actualizar el número del menú).
export const notifyUnreadChanged = () => window.dispatchEvent(new Event('forbook:unread'));
