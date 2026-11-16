import { body, param, query } from 'express-validator';
import { communityColors, communityLimits, communityTopics } from '../../helpers/community.helper.js';
import { hasText, idParam, isBoolean, isId, isPresent, onlyTheseFields, onlyTheseFilters, pageQuery, searchQuery } from './common.validation.js';

const communityId = () => idParam('Comunidad inválida.');
const idIn = (name, message) => param(name, message).custom(isId).toInt();

// GET /communities?scope=mine&search=centro&topic=barrio
export const getCommunitiesValidation = [
  onlyTheseFilters([
    query('scope', 'Filtro inválido.').optional().isIn(['mine', 'all']),
    query('topic', 'Tema inválido.').optional().isIn(communityTopics),
    searchQuery(),
  ]),
];

export const communityIdValidation = [communityId()];

// Datos de una comunidad (crear y editar).
const communityFields = () => onlyTheseFields([
  body('name', 'El nombre debe tener entre 3 y 60 caracteres.').isString().trim().isLength({ min: 3, max: 60 }),
  body('description', 'Contá de qué se trata en 10 a 300 caracteres.').isString().trim().isLength({ min: 10, max: 300 }),
  body('rules', 'Las reglas pueden tener hasta 1000 caracteres.').optional({ values: 'null' }).isString().trim().isLength({ max: 1000 }),
  body('topic', 'Elegí un tema.').isString().isIn(communityTopics),
  body('color', 'Elegí un color.').isString().isIn(communityColors),
]);
export const createCommunityValidation = [...communityFields()];
export const updateCommunityValidation = [communityId(), ...communityFields()];

// PUT /communities/:id/membership
export const membershipValidation = [
  communityId(),
  ...onlyTheseFields([body('notifications', 'Elegí si querés avisos o silenciarla.').isString().isIn(['all', 'muted'])]),
];

// GET /communities/:id/members?search=ana&status=banned&page=2
export const getMembersValidation = [
  communityId(),
  onlyTheseFilters([searchQuery(), pageQuery(), query('status', 'Filtro inválido.').optional().isIn(['active', 'banned'])]),
];

export const memberValidation = [communityId(), idIn('userId', 'Usuario inválido.')];

// PUT /communities/:id/members/:userId { rank?, roleId? }: al menos uno de los dos.
export const updateMemberValidation = [
  ...memberValidation,
  ...onlyTheseFields([
    body('rank', 'Elegí administrador o miembro.').optional().isString().isIn(['admin', 'member']),
    body('roleId', 'Rol inválido.').optional({ values: 'null' }).custom(isId).toInt(),
  ]),
];

// Roles propios de la comunidad.
const roleFields = () => onlyTheseFields([
  body('name', 'El nombre del rol debe tener entre 2 y 30 caracteres.').isString().trim().isLength({ min: 2, max: 30 }),
  body('color', 'Elegí un color.').isString().isIn(communityColors),
  body('canModerate', 'Indicá si el rol puede moderar.').custom(isBoolean),
]);
export const createRoleValidation = [communityId(), ...roleFields()];
export const roleValidation = [communityId(), idIn('roleId', 'Rol inválido.')];
export const updateRoleValidation = [...roleValidation, ...roleFields()];

// GET /communities/:id/messages?before=120 | ?after=160
export const getMessagesValidation = [
  communityId(),
  onlyTheseFilters([
    query('before', 'Mensaje inválido.').optional().custom(isId).toInt(),
    query('after', 'Mensaje inválido.').optional().isInt({ min: 0, max: 4294967295 }).toInt()
      .custom((value, { req }) => req.query.before === undefined).withMessage('Usá before o after, no los dos.'),
  ]),
];

// POST /communities/:id/messages: texto, imagen (con texto opcional) o audio. Un solo archivo por mensaje.
// Que el archivo sea lo que dice ser lo revisa helpers/community.helper.js.
export const createMessageValidation = [
  communityId(),
  ...onlyTheseFields([
    body('body')
      .custom((value, { req }) => hasText(value) || hasText(req.body.image) || hasText(req.body.audio)).withMessage('Escribí un mensaje.')
      .bail()
      .if(isPresent)
      .isString().withMessage('Escribí un mensaje.')
      .trim()
      .isLength({ max: communityLimits.messageLength }).withMessage(`El mensaje puede tener hasta ${communityLimits.messageLength} caracteres.`),
    body('image', 'No pudimos leer la imagen.').optional().isString().isLength({ min: 30, max: 1000000 })
      .custom((value, { req }) => req.body.audio === undefined).withMessage('Mandá una imagen o un audio, no los dos.'),
    body('audio', 'No pudimos leer el audio.').optional().isString().isLength({ min: 30, max: 900000 }),
    body('seconds')
      .custom((value, { req }) => (req.body.audio === undefined ? value === undefined : Number.isInteger(value) && value >= 1 && value <= communityLimits.audioSeconds))
      .withMessage(`El audio puede durar hasta ${communityLimits.audioSeconds} segundos.`),
  ]),
];

export const messageValidation = [communityId(), idIn('messageId', 'Mensaje inválido.')];

// PUT /users/:id/block
export const setBlockValidation = [
  idParam('Usuario inválido.'),
  ...onlyTheseFields([body('kind', 'Elegí ocultar o bloquear.').isString().isIn(['hidden', 'blocked'])]),
];
export const blockUserValidation = [idParam('Usuario inválido.')];

// POST /missions/:key/claim
export const missionValidation = [param('key', 'Misión inválida.').isString().matches(/^[a-z_]{2,40}$/)];
