import { request } from './api';

// Arma ?categoryId=2&status=open sin los filtros vacíos.
const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));

export const questionService = {
  list: (filters = {}, signal) => request(`/questions?${query(filters)}`, { signal }),
  create: body => request('/questions', { method: 'POST', body }),
};
