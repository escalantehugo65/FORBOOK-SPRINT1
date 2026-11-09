import { request } from './api';

const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));

// Épica 7. Los pedidos que modifican datos siempre mandan JSON, aunque sea {}.
export const moderationService = {
  report: body => request('/reports', { method: 'POST', body }),
  reports: (filters, signal) => request(`/moderation/reports?${query(filters)}`, { signal }),
  resolve: (id, body) => request(`/moderation/reports/${encodeURIComponent(id)}/resolve`, { method: 'POST', body }),
  log: (page, signal) => request(`/moderation/log?page=${encodeURIComponent(page)}`, { signal }),
  categories: signal => request('/admin/categories', { signal }),
  createCategory: body => request('/admin/categories', { method: 'POST', body }),
  updateCategory: (id, body) => request(`/admin/categories/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteCategory: id => request(`/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE', body: {} }),
  contents: signal => request('/admin/contents', { signal }),
  places: signal => request('/admin/places', { signal }),
  createPlace: body => request('/admin/places', { method: 'POST', body }),
  updatePlace: (id, body) => request(`/admin/places/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  updateSource: (id, body) => request(`/admin/contents/${encodeURIComponent(id)}/source`, { method: 'PUT', body }),
};
