import { body, param, query } from 'express-validator';
import { idParam, isBoolean, moderationNote, onlyTheseFields, onlyTheseFilters, pageQuery, searchQuery } from './common.validation.js';
import { sanctionReasons } from '../../helpers/sanction.helper.js';

export const adminIdValidation = [idParam()];

export const getUsersValidation = [
  onlyTheseFilters([
    searchQuery(),
    pageQuery(),
    query('role', 'Rol inválido.').optional().isIn(['student', 'moderator', 'admin']),
    query('state', 'Estado inválido.').optional().isIn(['active', 'restricted', 'suspended', 'banned']),
  ]),
];

export const updateRoleValidation = [
  idParam('Usuario inválido.'),
  ...onlyTheseFields([body('role', 'Elegí un rol.').isString().isIn(['student', 'moderator', 'admin'])]),
];

// Restricción y suspensión duran de 1 a 365 días; el baneo no lleva días.
export const createSanctionValidation = [
  idParam('Usuario inválido.'),
  ...onlyTheseFields([
    body('type', 'Elegí el tipo de sanción.').isString().isIn(['restriction', 'suspension', 'ban']),
    body('reason', 'Elegí un motivo.').isString().isIn(sanctionReasons),
    body('note', 'Explicá el motivo en 10 a 450 caracteres: lo va a leer la persona.').isString().trim().isLength({ min: 10, max: 450 }),
    body('days')
      .custom((value, { req }) => (req.body.type === 'ban' ? value === undefined || value === null : Number.isInteger(value) && value >= 1 && value <= 365))
      .withMessage((value, { req }) => (req.body.type === 'ban' ? 'Un baneo no lleva días.' : 'Elegí entre 1 y 365 días.')),
  ]),
];

export const revokeSanctionValidation = [idParam('Sanción inválida.'), ...moderationNote()];

export const adjustPointsValidation = [
  idParam('Usuario inválido.'),
  ...onlyTheseFields([
    body('amount', 'Elegí una cantidad entre -1000 y 1000, distinta de 0.').custom(value => Number.isInteger(value) && value !== 0 && value >= -1000 && value <= 1000),
    body('note', 'Escribí el motivo en 5 a 500 caracteres.').isString().trim().isLength({ min: 5, max: 500 }),
  ]),
];

export const getAppealsValidation = [
  onlyTheseFilters([query('status', 'Estado inválido.').optional().isIn(['pending', 'accepted', 'rejected', 'all']), pageQuery()]),
];

export const resolveAppealValidation = [
  idParam('Apelación inválida.'),
  ...onlyTheseFields([
    body('decision', 'Elegí si la aceptás o la rechazás.').isString().isIn(['accept', 'reject']),
    body('response', 'Escribí la respuesta en 5 a 500 caracteres: la va a leer la persona.').isString().trim().isLength({ min: 5, max: 500 }),
  ]),
];

export const getCommunitiesValidation = [
  onlyTheseFilters([query('status', 'Estado inválido.').optional().isIn(['open', 'closed', 'all']), searchQuery(), pageQuery()]),
];

export const noteValidation = [idParam(), ...moderationNote()];

export const updateShopItemValidation = [
  param('id', 'Decoración inválida.').isInt({ min: 1 }).toInt(),
  ...onlyTheseFields([
    body('price', 'El precio tiene que ser un número entero entre 1 y 100000.').custom(value => Number.isInteger(value) && value >= 1 && value <= 100000),
    body('available', 'Indicá si se vende.').custom(isBoolean),
  ]),
];
