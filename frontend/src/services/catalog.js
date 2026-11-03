import { request } from './api';
export const catalogService = {
  institutions: signal => request('/institutions', { signal }),
  careers: (id, signal) => request(`/institutions/${encodeURIComponent(id)}/careers`, { signal }),
  categories: signal => request('/categories', { signal }),
  contents: (filters = {}, signal) => request(`/contents?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null))}`, { signal }),
  detail: (id, signal) => request(`/contents/${encodeURIComponent(id)}`, { signal }),
};
