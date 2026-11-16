import { body, query } from 'express-validator';
import { isInsideFormosa, placeKinds } from '../../helpers/place.helper.js';
import { idParam, isId, onlyTheseFields, onlyTheseFilters } from './common.validation.js';
import { sourceRules } from './source.validation.js';

const isEmpty = (value) => value === undefined || value === null || value === '';
const isCoordinate = (value) => typeof value === 'number' && Number.isFinite(value);

// FF-21 y FF-23: GET /places?kind=health&institutionId=2
export const getPlacesValidation = [
  onlyTheseFilters([
    query('kind', 'Tipo de lugar inválido.').optional().isString().isIn(placeKinds),
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
  ]),
];

export const placeIdValidation = [idParam()];

// Lugar cargado por administración. Los lugares no tienen autoría: solo fuente oficial o comunitaria verificable.
const placeFields = () => onlyTheseFields([
  body('name', 'El nombre debe tener entre 3 y 150 caracteres.').isString().trim().isLength({ min: 3, max: 150 }),
  body('kind', 'Elegí una categoría.').isString().isIn(placeKinds),
  body('institutionId', 'Elegí una institución válida.').optional({ values: 'falsy' }).custom(isId).toInt(),
  body('addressLabel', 'La dirección puede tener hasta 250 caracteres.').optional({ values: 'null' }).isString().trim().isLength({ max: 250 }),
  body('studentNote', 'La nota puede tener hasta 450 caracteres.').optional({ values: 'null' }).isString().trim().isLength({ max: 450 }),
  // La ubicación es opcional, pero si viene, vienen las dos coordenadas y tienen que caer dentro de la provincia.
  body('latitude')
    .custom((value, { req }) => isEmpty(value) === isEmpty(req.body.longitude)).withMessage('Cargá las dos coordenadas o ninguna.')
    .bail()
    .if(value => !isEmpty(value))
    .custom((value, { req }) => isCoordinate(value) && isCoordinate(req.body.longitude)).withMessage('Las coordenadas tienen que ser números.')
    .bail()
    .custom((value, { req }) => isInsideFormosa(value, req.body.longitude)).withMessage('Esa ubicación queda fuera de la provincia de Formosa.'),
  body('longitude'),
  body('status', 'Elegí si se publica o queda como borrador.').isString().isIn(['draft', 'published']),
  ...sourceRules({
    types: ['official', 'community'],
    typeMessage: 'Elegí fuente oficial o comunitaria verificable.',
    withAuthor: false,
    reviewedAtRequired: true,
  }),
]);

export const createPlaceValidation = [...placeFields()];

export const updatePlaceValidation = [idParam('Lugar inválido.'), ...placeFields()];
