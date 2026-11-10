import { request } from './api';

const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));

// Épica 4 (lugares y rutas) y épica 6 (espacios de integración).
export const placeService = {
  places: (filters = {}, signal) => request(`/places?${query(filters)}`, { signal }),
  routes: (filters = {}, signal) => request(`/routes?${query(filters)}`, { signal }),
  route: (id, signal) => request(`/routes/${encodeURIComponent(id)}`, { signal }),
};
export const groupService = {
  suggestions: signal => request('/groups', { signal }),
  detail: (id, signal) => request(`/groups/${encodeURIComponent(id)}`, { signal }),
};
