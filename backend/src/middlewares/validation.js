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

// Respuesta: texto obligatorio de 10 a 2000 caracteres.
export function validateAnswer(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Enviá un objeto JSON válido.');
  if (Object.keys(body).some(key => key !== 'body')) throw new HttpError(400, 'La petición contiene campos no permitidos.');
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (text.length < 10 || text.length > 2000) throw new HttpError(400, 'Revisá los campos indicados.', { body: 'La respuesta debe tener entre 10 y 2000 caracteres.' });
  return { body: text };
}

const plainObject = (body, allowed) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Enviá un objeto JSON válido.');
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new HttpError(400, 'La petición contiene campos no permitidos.');
};
const optionalText = (value, max, fields, key, message) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') { fields[key] = message; return ''; }
  const text = value.trim();
  if (text.length > max) fields[key] = message;
  return text;
};

// Reporte (FF-34 y FF-35). "Desactualizada" solo tiene sentido para las fichas de Conozcamos Formosa.
export function validateReport(body) {
  plainObject(body, ['targetType', 'targetId', 'reason', 'details']);
  const fields = {};
  if (!['question', 'answer', 'content'].includes(body.targetType)) fields.targetType = 'Tipo de contenido inválido.';
  let targetId;
  try { targetId = positiveId(body.targetId, 'Contenido'); } catch { fields.targetId = 'Contenido inválido.'; }
  if (!['false', 'offensive', 'spam', 'outdated', 'other'].includes(body.reason)) fields.reason = 'Elegí un motivo.';
  else if (body.reason === 'outdated' && body.targetType !== 'content') fields.reason = 'Ese motivo solo se usa en las fichas.';
  const details = optionalText(body.details, 500, fields, 'details', 'El comentario puede tener hasta 500 caracteres.');
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return { targetType: body.targetType, targetId, reason: body.reason, details };
}

// Resolución (FF-37): toda decisión necesita un estado final (la decisión) y un motivo interno.
export function validateResolution(body) {
  plainObject(body, ['decision', 'note']);
  const fields = {};
  if (!['dismiss', 'hide', 'close'].includes(body.decision)) fields.decision = 'Elegí una decisión.';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length < 5 || note.length > 500) fields.note = 'El motivo interno debe tener entre 5 y 500 caracteres.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return { decision: body.decision, note };
}

// Categoría (FF-39).
export function validateCategory(body) {
  plainObject(body, ['name', 'description']);
  const fields = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (name.length < 3 || name.length > 100) fields.name = 'El nombre debe tener entre 3 y 100 caracteres.';
  if (description.length < 10 || description.length > 350) fields.description = 'La descripción debe tener entre 10 y 350 caracteres.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return { name, description };
}

// Metadatos de fuente (FF-39). Cada tipo exige lo que lo hace confiable:
// oficial = organismo + enlace https; comunitaria = referencia para verificar; experiencia = quién la cuenta.
export function validateSource(body) {
  plainObject(body, ['sourceType', 'sourceLabel', 'sourceUrl', 'authorLabel', 'reviewedAt']);
  const fields = {};
  if (!['official', 'community', 'experience'].includes(body.sourceType)) fields.sourceType = 'Elegí un tipo de fuente.';
  const sourceLabel = optionalText(body.sourceLabel, 250, fields, 'sourceLabel', 'La fuente puede tener hasta 250 caracteres.');
  const sourceUrl = optionalText(body.sourceUrl, 1000, fields, 'sourceUrl', 'El enlace puede tener hasta 1000 caracteres.');
  const authorLabel = optionalText(body.authorLabel, 180, fields, 'authorLabel', 'La autoría puede tener hasta 180 caracteres.');
  const reviewedAt = optionalText(body.reviewedAt, 10, fields, 'reviewedAt', 'Usá el formato AAAA-MM-DD.');
  if (sourceUrl) {
    let url;
    try { url = new URL(sourceUrl); } catch { url = null; }
    if (!url || url.protocol !== 'https:') fields.sourceUrl = 'Usá un enlace completo que empiece con https://';
  }
  if (reviewedAt) {
    const date = new Date(`${reviewedAt}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== reviewedAt) fields.reviewedAt = 'Usá una fecha válida (AAAA-MM-DD).';
    else if (date.getTime() > Date.now()) fields.reviewedAt = 'La fecha de revisión no puede ser futura.';
  }
  if (body.sourceType === 'official') {
    if (!sourceLabel) fields.sourceLabel = 'Una fuente oficial necesita el nombre del organismo.';
    if (!sourceUrl) fields.sourceUrl = 'Una fuente oficial necesita el enlace a la publicación.';
  }
  if (body.sourceType === 'community' && !sourceLabel) fields.sourceLabel = 'Una fuente comunitaria necesita una referencia para verificarla.';
  if (body.sourceType === 'experience' && !authorLabel) fields.authorLabel = 'Una experiencia necesita indicar quién la cuenta.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Revisá los campos indicados.', fields);
  return { sourceType: body.sourceType, sourceLabel: sourceLabel || null, sourceUrl: sourceUrl || null, authorLabel: authorLabel || null, reviewedAt: reviewedAt || null };
}
