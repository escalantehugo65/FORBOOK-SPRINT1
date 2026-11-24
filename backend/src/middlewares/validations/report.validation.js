import { body, query } from 'express-validator';
import { idParam, isId, onlyTheseFields, onlyTheseFilters, pageQuery } from './common.validation.js';

// FF-34 y FF-35: reportar una pregunta, una respuesta, una ficha, un perfil o un mensaje del chat de una comunidad.
export const createReportValidation = [
  ...onlyTheseFields([
    body('targetType', 'Tipo de contenido inválido.').isString().isIn(['question', 'answer', 'content', 'profile', 'message']),
    body('targetId', 'Contenido inválido.').custom(isId).toInt(),
    // "Desactualizada" solo tiene sentido para las fichas de Conozcamos Formosa.
    body('reason', 'Elegí un motivo.')
      .isString()
      .isIn(['false', 'offensive', 'spam', 'outdated', 'personal_data', 'other'])
      .bail()
      .custom((value, { req }) => value !== 'outdated' || req.body.targetType === 'content').withMessage('Ese motivo solo se usa en las fichas.'),
    body('details', 'El comentario puede tener hasta 500 caracteres.').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }),
  ]),
];

// FF-36: cola de reportes. Sin estado, se muestran los pendientes.
export const getReportsValidation = [
  onlyTheseFilters([
    query('status', 'Estado inválido.').optional().isString().isIn(['pending', 'dismissed', 'actioned', 'all']),
    pageQuery(),
  ]),
];

// FF-37: toda decisión necesita un estado final (la decisión) y un motivo interno.
export const resolveReportValidation = [
  idParam('Reporte inválido.'),
  ...onlyTheseFields([
    body('decision', 'Elegí una decisión.').isString().isIn(['dismiss', 'hide', 'close']),
    body('note', 'El motivo interno debe tener entre 5 y 500 caracteres.').isString().trim().isLength({ min: 5, max: 500 }),
  ]),
];
