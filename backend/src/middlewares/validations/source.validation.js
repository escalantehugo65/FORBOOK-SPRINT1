import { body } from 'express-validator';
import { hasText, isPresent } from './common.validation.js';

const isHttpsUrl = (value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};
const isRealDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const isFutureDate = (value) => new Date(`${value}T00:00:00Z`).getTime() > Date.now();

// Fuente de un dato (FF-39): la usan las fichas y los lugares del mapa. Cada tipo exige lo que lo hace confiable:
// oficial = organismo + enlace https; comunitaria = referencia para verificarla; experiencia = quién la cuenta.
// Los textos vacíos se guardan como null.
export const sourceRules = ({ types, typeMessage, withAuthor, reviewedAtRequired }) => [
  body('sourceType', typeMessage).isString().isIn(types),
  body('sourceLabel')
    .custom((value, { req }) => hasText(value) || !['official', 'community'].includes(req.body.sourceType))
    .withMessage((value, { req }) => (req.body.sourceType === 'official'
      ? 'Una fuente oficial necesita el nombre del organismo.'
      : 'Una fuente comunitaria necesita una referencia para verificarla.'))
    .bail()
    .if(isPresent)
    .isString().withMessage('La fuente puede tener hasta 250 caracteres.')
    .trim()
    .isLength({ max: 250 }).withMessage('La fuente puede tener hasta 250 caracteres.'),
  body('sourceUrl')
    .custom((value, { req }) => hasText(value) || req.body.sourceType !== 'official').withMessage('Una fuente oficial necesita el enlace a la publicación.')
    .bail()
    .if(isPresent)
    .isString().withMessage('El enlace puede tener hasta 1000 caracteres.')
    .trim()
    .isLength({ max: 1000 }).withMessage('El enlace puede tener hasta 1000 caracteres.')
    .bail()
    .custom(value => value === '' || isHttpsUrl(value)).withMessage('Usá un enlace completo que empiece con https://'),
  ...(withAuthor ? [
    body('authorLabel')
      .custom((value, { req }) => hasText(value) || req.body.sourceType !== 'experience').withMessage('Una experiencia necesita indicar quién la cuenta.')
      .bail()
      .if(isPresent)
      .isString().withMessage('La autoría puede tener hasta 180 caracteres.')
      .trim()
      .isLength({ max: 180 }).withMessage('La autoría puede tener hasta 180 caracteres.'),
  ] : []),
  body('reviewedAt')
    .custom((value, { req }) => !reviewedAtRequired || hasText(value) || !types.includes(req.body.sourceType)).withMessage('Indicá cuándo revisaste el dato.')
    .bail()
    .if(isPresent)
    .isString().withMessage('Usá el formato AAAA-MM-DD.')
    .trim()
    .isLength({ max: 10 }).withMessage('Usá el formato AAAA-MM-DD.')
    .bail()
    .custom(value => value === '' || isRealDate(value)).withMessage('Usá una fecha válida (AAAA-MM-DD).')
    .bail()
    .custom(value => value === '' || !isFutureDate(value)).withMessage('La fecha de revisión no puede ser futura.'),
];
