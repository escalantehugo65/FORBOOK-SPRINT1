const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message, status, fields) { super(message); this.status = status; this.fields = fields; }
}
export async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { method, credentials: 'include', signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('No pudimos conectar con Forbook. Revisá tu conexión y volvé a intentar.', 0);
  }
  let payload;
  try { payload = await response.json(); } catch { throw new ApiError('El servidor devolvió una respuesta inesperada.', response.status); }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('forbook:unauthorized'));
    throw new ApiError(payload.error?.message || 'No pudimos completar la operación.', response.status, payload.error?.fields);
  }
  return payload;
}
