import { body } from 'express-validator';
import { idParam, moderationNote, onlyTheseFields } from './common.validation.js';

// Advertencia: motivo de una lista y una explicación que ve la persona advertida.
export const createWarningValidation = [
  idParam('Usuario inválido.'),
  ...onlyTheseFields([
    body('reason', 'Elegí un motivo.').isString().isIn(['false', 'offensive', 'spam', 'personal_data', 'other']),
    body('note', 'Explicá el motivo en 10 a 450 caracteres.').isString().trim().isLength({ min: 10, max: 450 }),
  ]),
];

export const revokeWarningValidation = [idParam('Advertencia inválida.'), ...moderationNote()];
