import { body } from 'express-validator';
import { idParam, onlyTheseFields } from './common.validation.js';

const categoryFields = () => onlyTheseFields([
  body('name', 'El nombre debe tener entre 3 y 100 caracteres.').isString().trim().isLength({ min: 3, max: 100 }),
  body('description', 'La descripción debe tener entre 10 y 350 caracteres.').isString().trim().isLength({ min: 10, max: 350 }),
]);

export const createCategoryValidation = [...categoryFields()];

export const updateCategoryValidation = [idParam('Categoría inválida.'), ...categoryFields()];

export const categoryIdValidation = [idParam('Categoría inválida.')];
