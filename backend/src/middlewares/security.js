import { HttpError } from '../helpers/http.js';

export function securityHeaders(req, res, next) {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' });
  next();
}
export const requireAuth = (req, res, next) => req.session.userId ? next() : next(new HttpError(401, 'Iniciá sesión para continuar.'));
// Las mutaciones solo se aceptan con JSON y el origen exacto del frontend.
export const checkOrigin = origin => (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('origin') !== origin) return next(new HttpError(403, 'Origen de la petición no permitido.'));
    if (!req.is('application/json')) return next(new HttpError(415, 'La petición debe usar application/json.'));
  }
  next();
};
export function authRateLimit() {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const entry = attempts.get(req.ip) || { count: 0, until: now + 15 * 60000 };
    entry.count++; attempts.set(req.ip, entry);
    if (entry.count > 30) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return next(new HttpError(429, 'Demasiados intentos. Volvé a probar en unos minutos.')); }
    next();
  };
}
