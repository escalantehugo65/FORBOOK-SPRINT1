import { request } from './api';

// Tienda de decoraciones y puntos. Los pedidos que modifican datos siempre mandan JSON, aunque sea {}.
export const shopService = {
  catalog: signal => request('/shop', { signal }),
  purchase: id => request(`/shop/items/${encodeURIComponent(id)}/purchase`, { method: 'POST', body: {} }),
  equip: id => request(`/shop/items/${encodeURIComponent(id)}/equip`, { method: 'PUT', body: {} }),
  unequip: id => request(`/shop/items/${encodeURIComponent(id)}/equip`, { method: 'DELETE', body: {} }),
  points: (page, signal) => request(`/points?page=${encodeURIComponent(page)}`, { signal }),
};
