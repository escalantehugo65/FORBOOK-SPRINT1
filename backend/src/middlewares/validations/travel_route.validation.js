import { body, query } from 'express-validator';
import { idParam, isId, onlyTheseFields, onlyTheseFilters } from './common.validation.js';
import { sourceRules } from './source.validation.js';

// FF-22: GET /routes?institutionId=2 (sin filtro, las de la institución del estudiante).
export const getRoutesValidation = [
  onlyTheseFilters([
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
  ]),
];

export const routeIdValidation = [idParam()];

const steps = (value) => value.split('\n');

// Administración: una ruta orientativa. Los pasos van uno por línea, con referencias de la calle.
// Como el tránsito y los recorridos cambian, la fuente y la fecha de revisión son obligatorias.
const routeFields = () => onlyTheseFields([
  body('title', 'El título debe tener entre 5 y 180 caracteres.').isString().trim().isLength({ min: 5, max: 180 }),
  body('institutionId', 'Elegí una institución.').custom(isId).toInt(),
  body('destinationPlaceId', 'Elegí un lugar del mapa válido.').optional({ values: 'falsy' }).custom(isId).toInt(),
  body('originLabel', 'El punto de partida debe tener entre 3 y 180 caracteres.').isString().trim().isLength({ min: 3, max: 180 }),
  body('mode', 'Elegí cómo se hace el recorrido.').isString().isIn(['walk', 'bus', 'bike', 'car', 'mixed']),
  body('steps')
    .isString().withMessage('Escribí los pasos, uno por línea.')
    .bail()
    .customSanitizer(value => steps(value).map(step => step.trim()).filter(Boolean).join('\n'))
    .custom(value => value.length > 0).withMessage('Escribí al menos un paso.')
    .bail()
    .custom(value => steps(value).length <= 20).withMessage('Usá hasta 20 pasos.')
    .custom(value => steps(value).every(step => step.length <= 300)).withMessage('Cada paso puede tener hasta 300 caracteres.'),
  body('durationLabel', 'El tiempo puede tener hasta 120 caracteres.').optional({ values: 'null' }).isString().trim().isLength({ max: 120 }),
  body('status', 'Elegí si se publica o queda como borrador.').isString().isIn(['draft', 'published']),
  ...sourceRules({
    types: ['official', 'community'],
    typeMessage: 'Elegí fuente oficial o comunitaria verificable.',
    withAuthor: false,
    reviewedAtRequired: true,
  }),
]);

export const createRouteValidation = [...routeFields()];

export const updateRouteValidation = [idParam('Ruta inválida.'), ...routeFields()];
