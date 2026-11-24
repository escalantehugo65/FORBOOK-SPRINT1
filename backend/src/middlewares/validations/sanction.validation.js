import { body } from 'express-validator';
import { isId, onlyTheseFields } from './common.validation.js';

// POST /sanctions/appeals
export const createAppealValidation = [
  ...onlyTheseFields([
    body('targetType', 'Elegí qué querés apelar.').isString().isIn(['warning', 'sanction']),
    body('targetId', 'Sanción inválida.').custom(isId).toInt(),
    body('body', 'Explicá por qué en 20 a 1000 caracteres.').isString().trim().isLength({ min: 20, max: 1000 }),
  ]),
];
