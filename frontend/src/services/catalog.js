import { request } from './api';
export const catalogService = {
  countries: signal => request('/origin-countries', { signal }),
  localities: signal => request('/origin-localities', { signal }),
  institutions: signal => request('/institutions', { signal }),
  careers: (id, signal) => request(`/institutions/${encodeURIComponent(id)}/careers`, { signal }),
  institutionResources: signal => request('/institution-resources', { signal }),
  categories: signal => request('/categories', { signal }),
  contents: (filters = {}, signal) => request(`/contents?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))}`, { signal }),
  detail: (id, signal) => request(`/contents/${encodeURIComponent(id)}`, { signal }),
  guide: signal => request('/guide', { signal }),
  // Fichas que crea cualquier estudiante: se publican con su nombre.
  createContent: body => request('/contents', { method: 'POST', body }),
  ownContent: (id, signal) => request(`/contents/${encodeURIComponent(id)}/edit`, { signal }),
  updateContent: (id, body) => request(`/contents/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteContent: id => request(`/contents/${encodeURIComponent(id)}`, { method: 'DELETE', body: {} }),
};
