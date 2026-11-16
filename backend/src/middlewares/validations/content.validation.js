import { query } from 'express-validator';
import { idParam, isId, onlyTheseFields, onlyTheseFilters, pageQuery } from './common.validation.js';
import { sourceRules } from './source.validation.js';

// GET /contents?categoryId=2&institutionId=1&page=2
export const getContentsValidation = [
  onlyTheseFilters([
    query('categoryId', 'Categoría inválida.').optional().custom(isId).toInt(),
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
    pageQuery(),
  ]),
];

export const contentIdValidation = [idParam()];

// Administración: cambiar la fuente de una ficha.
export const updateSourceValidation = [
  idParam('Ficha inválida.'),
  ...onlyTheseFields(sourceRules({
    types: ['official', 'community', 'experience'],
    typeMessage: 'Elegí un tipo de fuente.',
    withAuthor: true,
    reviewedAtRequired: false,
  })),
];
