const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
// Dirección completa de un recurso de la API que no se pide con fetch (por ejemplo, la foto de perfil en un <img>).
export const apiUrl = path => `${BASE}${path}`;
// Códigos que manda el backend cuando la cuenta tiene una sanción vigente.
export const accountCodes = ['account_suspended', 'account_restricted'];
export class ApiError extends Error {
  constructor(message, status, fields, code) { super(message); this.status = status; this.fields = fields; this.code = code; }
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
    const code = payload.error?.code;
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('forbook:unauthorized'));
    // Una sanción nueva (o que terminó) cambia lo que la cuenta puede hacer: se vuelven a pedir los datos de la sesión.
    if (response.status === 403 && accountCodes.includes(code)) window.dispatchEvent(new Event('forbook:account'));
    throw new ApiError(payload.error?.message || 'No pudimos completar la operación.', response.status, payload.error?.fields, code);
  }
  return payload;
}
