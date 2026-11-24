import { request } from './api';

const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
const id = value => encodeURIComponent(value);

// Panel de administración. El backend responde 403 a cualquier cuenta que no sea admin.
export const adminService = {
  stats: signal => request('/admin/stats', { signal }),
  users: (filters, signal) => request(`/admin/users?${query(filters)}`, { signal }),
  user: (userId, signal) => request(`/admin/users/${id(userId)}`, { signal }),
  deleteUser: (userId, note) => request(`/admin/users/${id(userId)}`, { method: 'DELETE', body: { note } }),
  setRole: (userId, role) => request(`/admin/users/${id(userId)}/role`, { method: 'PUT', body: { role } }),
  sanction: (userId, body) => request(`/admin/users/${id(userId)}/sanctions`, { method: 'POST', body }),
  revokeSanction: (sanctionId, note) => request(`/admin/sanctions/${id(sanctionId)}/revoke`, { method: 'POST', body: { note } }),
  revokeWarning: (warningId, note) => request(`/moderation/warnings/${id(warningId)}/revoke`, { method: 'POST', body: { note } }),
  points: (userId, body) => request(`/admin/users/${id(userId)}/points`, { method: 'POST', body }),
  appeals: (filters, signal) => request(`/admin/appeals?${query(filters)}`, { signal }),
  resolveAppeal: (appealId, body) => request(`/admin/appeals/${id(appealId)}/resolve`, { method: 'POST', body }),
  communities: (filters, signal) => request(`/admin/communities?${query(filters)}`, { signal }),
  closeCommunity: (communityId, note) => request(`/admin/communities/${id(communityId)}/close`, { method: 'POST', body: { note } }),
  reopenCommunity: (communityId, note) => request(`/admin/communities/${id(communityId)}/reopen`, { method: 'POST', body: { note } }),
  shop: signal => request('/admin/shop', { signal }),
  updateShopItem: (itemId, body) => request(`/admin/shop/${id(itemId)}`, { method: 'PUT', body }),
  hideContent: (contentId, note) => request(`/admin/contents/${id(contentId)}/hide`, { method: 'POST', body: { note } }),
  showContent: (contentId, note) => request(`/admin/contents/${id(contentId)}/show`, { method: 'POST', body: { note } }),
};
