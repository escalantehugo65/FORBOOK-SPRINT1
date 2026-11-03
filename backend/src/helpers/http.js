export class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, origin: user.origin, originLocalityId: user.originLocalityId ?? null, career: user.career,
    arrivalStatus: user.arrivalStatus, institutionId: user.institutionId,
    institution: user.institution ? { id: user.institution.id, name: user.institution.name } : null };
}
export const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const sessionCall = (req, method) => new Promise((resolve, reject) => req.session[method](error => error ? reject(error) : resolve()));
