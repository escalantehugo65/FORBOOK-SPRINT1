import { HttpError } from '../helpers/http.js';

export function positiveId(value, label = 'Identificador') {
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 4294967295) throw new HttpError(400, `${label} inválido.`);
  return Number(value);
}
export function validateCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Enviá un objeto JSON válido.');
  const allowed = registration ? ['name', 'email', 'password', 'origin', 'institutionId', 'careerId', 'arrivalStatus'] : ['email', 'password'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new HttpError(400, 'La petición contiene campos no permitidos.');
  const fields = {};
  const clean = {};
  const text = (key, min, max, trim = true) => {
    const value = typeof body[key] === 'string' ? (trim ? body[key].trim() : body[key]) : '';
    if (value.length < min || value.length > max) fields[key] = `Debe tener entre ${min} y ${max} caracteres.`;
    clean[key] = value;
  };
  text('email', 3, 254); clean.email = clean.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) fields.email = 'Ingresá un correo válido.';
  text('password', registration ? 10 : 1, 72, false);
  if (Buffer.byteLength(clean.password, 'utf8') > 72) fields.password = 'La contraseña debe ocupar como máximo 72 bytes.';
  if (registration) {
    text('name', 2, 100); text('origin', 2, 150);
    try { clean.careerId = positiveId(body.careerId, 'Carrera'); } catch { fields.careerId = 'Elegí una carrera válida.'; }
    clean.arrivalStatus = body.arrivalStatus;
    if (!['arrived', 'not_arrived'].includes(body.arrivalStatus)) fields.arrivalStatus = 'Elegí tu estado de llegada.';
    try { clean.institutionId = positiveId(body.institutionId, 'Institución'); } catch { fields.institutionId = 'Elegí una institución válida.'; }
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return clean;
}
