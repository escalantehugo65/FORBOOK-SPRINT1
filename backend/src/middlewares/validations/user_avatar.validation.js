import { body } from 'express-validator';
import { idParam, moderationNote, onlyTheseFields } from './common.validation.js';

// PUT /profile/avatar: la imagen llega como texto (data URL). Que sea un JPEG de verdad lo revisa image.helper.js.
export const avatarValidation = [
  ...onlyTheseFields([
    body('image', 'Elegí una foto.').isString().isLength({ min: 30, max: 450000 }),
  ]),
];

// GET /users/:id/avatar
export const avatarUserValidation = [idParam('Usuario inválido.')];

// POST /moderation/users/:id/avatar/remove
export const removeAvatarValidation = [idParam('Usuario inválido.'), ...moderationNote()];
