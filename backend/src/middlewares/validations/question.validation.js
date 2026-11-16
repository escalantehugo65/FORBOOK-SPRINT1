import { body, query } from 'express-validator';
import { idParam, isBoolean, isId, onlyTheseFields, onlyTheseFilters, pageQuery } from './common.validation.js';

// FF-24: GET /questions?categoryId=2&institutionId=1&status=open&page=2
export const getQuestionsValidation = [
  onlyTheseFilters([
    query('categoryId', 'Categoría inválida.').optional().custom(isId).toInt(),
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
    query('status', 'Estado inválido.').optional().isString().isIn(['open', 'answered', 'closed']),
    pageQuery(),
  ]),
];

export const questionIdValidation = [idParam('Pregunta inválida.')];

// FF-25: título obligatorio de 10 a 150 caracteres, detalle opcional hasta 2000.
export const createQuestionValidation = [
  ...onlyTheseFields([
    body('title', 'La pregunta debe tener entre 10 y 150 caracteres.').isString().trim().isLength({ min: 10, max: 150 }),
    body('body')
      .optional()
      .isString().withMessage('El detalle debe ser texto.')
      .bail()
      .trim()
      .isLength({ max: 2000 }).withMessage('El detalle puede tener hasta 2000 caracteres.'),
    body('categoryId', 'Elegí una categoría.').custom(isId).toInt(),
    body('forMyInstitution', 'Valor inválido.').optional().custom(isBoolean),
  ]),
];
