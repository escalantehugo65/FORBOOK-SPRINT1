import { request } from './api';
export const authService = {
  me: () => request('/auth/me'),
  login: body => request('/auth/login', { method: 'POST', body }),
  register: body => request('/auth/register', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST', body: {} }),
};
