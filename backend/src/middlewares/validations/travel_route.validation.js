import { body, query } from 'express-validator';
import { isInsideFormosa } from '../../helpers/place.helper.js';
import { hasText, idParam, isId, isPresent, onlyTheseFields, onlyTheseFilters } from './common.validation.js';
import { sourceRules } from './source.validation.js';

// FF-22: GET /routes?institutionId=2 (sin filtro, las de la institución del estudiante).
export const getRoutesValidation = [
  onlyTheseFilters([
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
  ]),
];

export const routeIdValidation = [idParam()];

const steps = (value) => value.split('\n');

// Paradas (por ejemplo, las del colectivo del IPF): nombre, referencia opcional y coordenadas dentro de Formosa.
// Se revisan juntas para devolver un solo mensaje que diga qué parada está mal.
const stopKeys = ['name', 'reference', 'latitude', 'longitude'];
const isCoordinate = (value) => typeof value === 'number' && Number.isFinite(value);
const textLength = (value) => value.trim().length;
const stopError = (stop) => {
  if (!stop || typeof stop !== 'object' || Array.isArray(stop)) return 'no tiene el formato esperado';
  if (Object.keys(stop).some(key => !stopKeys.includes(key))) return 'tiene campos no permitidos';
  if (!hasText(stop.name) || textLength(stop.name) < 2 || textLength(stop.name) > 120) return 'el nombre debe tener entre 2 y 120 caracteres';
  if (isPresent(stop.reference) && (typeof stop.reference !== 'string' || textLength(stop.reference) > 250)) return 'la referencia puede tener hasta 250 caracteres';
  if (!isCoordinate(stop.latitude) || !isCoordinate(stop.longitude)) return 'cargá la latitud y la longitud';
  if (!isInsideFormosa(stop.latitude, stop.longitude)) return 'la ubicación queda fuera de la provincia de Formosa';
  return null;
};
// Las columnas guardan 6 decimales (unos 10 cm): se redondea igual para comparar lo guardado con lo nuevo.
const sixDecimals = (value) => Number(value.toFixed(6));

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
  // Opcional: si no viene, al editar se conservan las paradas que ya tenía la ruta. Una lista vacía las borra.
  body('stops')
    .optional()
    .isArray({ max: 30 }).withMessage('Cargá hasta 30 paradas.')
    .bail()
    .custom(stops => {
      const index = stops.findIndex(stopError);
      if (index >= 0) throw new Error(`Parada ${index + 1}: ${stopError(stops[index])}.`);
      return true;
    })
    .bail()
    .customSanitizer(stops => stops.map(stop => ({
      name: stop.name.trim(),
      reference: stop.reference?.trim() || null,
      latitude: sixDecimals(stop.latitude),
      longitude: sixDecimals(stop.longitude),
    }))),
  ...sourceRules({
    types: ['official', 'community'],
    typeMessage: 'Elegí fuente oficial o comunitaria verificable.',
    withAuthor: false,
    reviewedAtRequired: true,
  }),
]);

export const createRouteValidation = [...routeFields()];

export const updateRouteValidation = [idParam('Ruta inválida.'), ...routeFields()];
