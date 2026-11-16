import express, { Router } from 'express';
import { deleteAvatar, getAvatar, removeAvatarByModeration, uploadAvatar } from '../controllers/user_avatar.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { moderatorMiddleware } from '../middlewares/role.middleware.js';
import { uploadLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { avatarUserValidation, avatarValidation, removeAvatarValidation } from '../middlewares/validations/user_avatar.validation.js';

export const userAvatarRouter = Router();

// La foto viaja en el JSON, por eso esta ruta acepta un cuerpo más grande que el resto (ver app.js).
userAvatarRouter.put('/profile/avatar', authMiddleware, uploadLimit, express.json({ limit: '450kb' }), avatarValidation, validator, uploadAvatar);
userAvatarRouter.delete('/profile/avatar', authMiddleware, deleteAvatar);
userAvatarRouter.get('/users/:id/avatar', authMiddleware, avatarUserValidation, validator, getAvatar);

// Moderación: quitar una foto que no corresponde.
userAvatarRouter.post('/moderation/users/:id/avatar/remove', authMiddleware, moderatorMiddleware, removeAvatarValidation, validator, removeAvatarByModeration);
