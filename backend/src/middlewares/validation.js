import { HttpError } from '../helpers/http.js';

export function positiveId(value, label = 'Identificador') {
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 4294967295) throw new HttpError(400, `${label} inválido.`);
  return Number(value);
}
export function validateCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Enviá un objeto JSON válido.');
  const allowed = registration ? ['name', 'email', 'password', 'originLocalityId', 'institutionId', 'careerId', 'arrivalStatus'] : ['email', 'password'];
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
    text('name', 2, 100);
    if (typeof body.originLocalityId !== 'string' || !/^34\d{6}$/.test(body.originLocalityId)) fields.originLocalityId = 'Elegí una localidad de Formosa.';
    clean.originLocalityId = body.originLocalityId;
    try { clean.careerId = positiveId(body.careerId, 'Carrera'); } catch { fields.careerId = 'Elegí una carrera válida.'; }
    clean.arrivalStatus = body.arrivalStatus;
    if (!['arrived', 'not_arrived'].includes(body.arrivalStatus)) fields.arrivalStatus = 'Elegí tu estado de llegada.';
    try { clean.institutionId = positiveId(body.institutionId, 'Institución'); } catch { fields.institutionId = 'Elegí una institución válida.'; }
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return clean;
}

// Pregunta: título obligatorio de 10 a 150 caracteres, detalle opcional hasta 2000.
export function validateQuestion(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Enviá un objeto JSON válido.');
  if (Object.keys(body).some(key => !['title', 'body', 'categoryId', 'forMyInstitution'].includes(key))) throw new HttpError(400, 'La petición contiene campos no permitidos.');
  const fields = {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const detail = typeof body.body === 'string' ? body.body.trim() : '';
  if (title.length < 10 || title.length > 150) fields.title = 'La pregunta debe tener entre 10 y 150 caracteres.';
  if (body.body !== undefined && typeof body.body !== 'string') fields.body = 'El detalle debe ser texto.';
  if (detail.length > 2000) fields.body = 'El detalle puede tener hasta 2000 caracteres.';
  let categoryId;
  try { categoryId = positiveId(body.categoryId, 'Categoría'); } catch { fields.categoryId = 'Elegí una categoría.'; }
  if (body.forMyInstitution !== undefined && typeof body.forMyInstitution !== 'boolean') fields.forMyInstitution = 'Valor inválido.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return { title, body: detail, categoryId, forMyInstitution: body.forMyInstitution === true };
}
