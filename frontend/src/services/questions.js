import { request } from './api';

// Arma ?categoryId=2&status=open sin los filtros vacíos.
const query = filters => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));

export const questionService = {
  list: (filters = {}, signal) => request(`/questions?${query(filters)}`, { signal }),
  create: body => request('/questions', { method: 'POST', body }),
  detail: (id, signal) => request(`/questions/${encodeURIComponent(id)}`, { signal }),
  answer: (id, body) => request(`/questions/${encodeURIComponent(id)}/answers`, { method: 'POST', body: { body } }),
  // El backend exige JSON en todo pedido que modifica datos, por eso se manda {} aunque esté vacío.
  markHelpful: id => request(`/answers/${encodeURIComponent(id)}/helpful`, { method: 'PUT', body: {} }),
  unmarkHelpful: id => request(`/answers/${encodeURIComponent(id)}/helpful`, { method: 'DELETE', body: {} }),
};
