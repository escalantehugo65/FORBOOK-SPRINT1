import { body } from 'express-validator';
import { idParam, onlyTheseFields } from './common.validation.js';

// FF-27: POST /questions/:id/answers. Texto obligatorio de 10 a 2000 caracteres.
export const createAnswerValidation = [
  idParam('Pregunta inválida.'),
  ...onlyTheseFields([
    body('body', 'La respuesta debe tener entre 10 y 2000 caracteres.').isString().trim().isLength({ min: 10, max: 2000 }),
  ]),
];

// FF-28: PUT y DELETE /answers/:id/helpful
export const answerIdValidation = [idParam('Respuesta inválida.')];
