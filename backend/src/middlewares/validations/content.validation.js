import { body, query } from 'express-validator';
import { idParam, isId, onlyTheseFields, onlyTheseFilters, pageQuery, searchQuery } from './common.validation.js';
import { sourceRules } from './source.validation.js';

// GET /contents?categoryId=2&scope=institution&search=colectivo&page=2
// scope: "institution" = solo las de tu institución; "general" = solo las de toda la ciudad (FF-18).
export const getContentsValidation = [
  onlyTheseFilters([
    query('categoryId', 'Categoría inválida.').optional().custom(isId).toInt(),
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
    query('scope', 'Filtro no permitido.').optional().isString().isIn(['institution', 'general']),
    searchQuery(),
    pageQuery(),
  ]),
];

export const contentIdValidation = [idParam()];

const sourceFields = () => sourceRules({
  types: ['official', 'community', 'experience'],
  typeMessage: 'Elegí un tipo de fuente.',
  withAuthor: true,
  reviewedAtRequired: false,
});

// Administración: cambiar solo la fuente de una ficha.
export const updateSourceValidation = [idParam('Ficha inválida.'), ...onlyTheseFields(sourceFields())];

// Administración: crear o editar una ficha completa.
const contentFields = () => onlyTheseFields([
  body('title', 'El título debe tener entre 5 y 180 caracteres.').isString().trim().isLength({ min: 5, max: 180 }),
  body('summary', 'El resumen debe tener entre 10 y 450 caracteres.').isString().trim().isLength({ min: 10, max: 450 }),
  body('body', 'El texto debe tener entre 30 y 10000 caracteres.').isString().trim().isLength({ min: 30, max: 10000 }),
  body('categoryId', 'Elegí una categoría.').custom(isId).toInt(),
  body('institutionId', 'Elegí una institución válida.').optional({ values: 'falsy' }).custom(isId).toInt(),
  body('status', 'Elegí si se publica o queda como borrador.').isString().isIn(['draft', 'published']),
  ...sourceFields(),
]);

export const createContentValidation = [...contentFields()];

export const updateContentValidation = [idParam('Ficha inválida.'), ...contentFields()];

export const adminContentIdValidation = [idParam('Ficha inválida.')];
