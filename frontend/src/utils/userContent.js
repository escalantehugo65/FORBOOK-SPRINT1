// Fichas que crea cualquier estudiante. Mismos límites que valida el backend.
export const userContentLimits = { title: [5, 180], summary: [10, 450], body: [30, 10000], sourceLabel: 250, sourceUrl: 1000 };
export const userSourceHints = {
  experience: 'Lo que viviste o sabés por experiencia. Se muestra como opinión o experiencia, con tu nombre.',
  community: 'Algo que cualquiera puede comprobar: indicá dónde (por ejemplo, el cartel del local o una página).',
  official: 'Sale de un organismo o de una institución: poné su nombre y el enlace a la publicación.',
};
export const emptyUserContent = { title: '', summary: '', body: '', categoryId: '', forMyInstitution: false, sourceType: 'experience', sourceLabel: '', sourceUrl: '' };

const isHttps = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };

// Errores por campo, con los mismos textos que el backend. Devuelve {} si está todo bien.
export function validateUserContent(values) {
  const errors = {};
  const length = key => values[key].trim().length;
  const [titleMin, titleMax] = userContentLimits.title;
  const [summaryMin, summaryMax] = userContentLimits.summary;
  const [bodyMin, bodyMax] = userContentLimits.body;
  if (length('title') < titleMin || length('title') > titleMax) errors.title = `El título debe tener entre ${titleMin} y ${titleMax} caracteres.`;
  if (length('summary') < summaryMin || length('summary') > summaryMax) errors.summary = `El resumen debe tener entre ${summaryMin} y ${summaryMax} caracteres.`;
  if (length('body') < bodyMin || length('body') > bodyMax) errors.body = `El texto debe tener entre ${bodyMin} y ${bodyMax} caracteres.`;
  if (!values.categoryId) errors.categoryId = 'Elegí una categoría.';
  const label = values.sourceLabel.trim();
  const url = values.sourceUrl.trim();
  if (values.sourceType === 'official' && !label) errors.sourceLabel = 'Una fuente oficial necesita el nombre del organismo.';
  else if (values.sourceType === 'community' && !label) errors.sourceLabel = 'Una fuente comunitaria necesita una referencia para verificarla.';
  else if (label.length > userContentLimits.sourceLabel) errors.sourceLabel = `La fuente puede tener hasta ${userContentLimits.sourceLabel} caracteres.`;
  if (values.sourceType === 'official' && !url) errors.sourceUrl = 'Una fuente oficial necesita el enlace a la publicación.';
  else if (url && !isHttps(url)) errors.sourceUrl = 'Usá un enlace completo que empiece con https://';
  return errors;
}

// Lo que se manda al backend: textos sin espacios de más y la categoría como número.
export const userContentBody = values => ({
  title: values.title.trim(), summary: values.summary.trim(), body: values.body.trim(), categoryId: Number(values.categoryId),
  forMyInstitution: Boolean(values.forMyInstitution), sourceType: values.sourceType, sourceLabel: values.sourceLabel.trim(), sourceUrl: values.sourceUrl.trim(),
});
