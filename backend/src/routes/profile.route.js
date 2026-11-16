import { Router } from 'express';
import { changePassword, getMyProfile, getUserProfile, hideBio, searchUsers, showBio, updateMyProfile } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { moderatorMiddleware } from '../middlewares/role.middleware.js';
import { passwordLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { bioVisibilityValidation, changePasswordValidation, searchUsersValidation, updateProfileValidation, userIdValidation } from '../middlewares/validations/profile.validation.js';

export const profileRouter = Router();

// El perfil propio y el de otras personas.
profileRouter.get('/profile', authMiddleware, getMyProfile);
profileRouter.put('/profile', authMiddleware, updateProfileValidation, validator, updateMyProfile);
profileRouter.put('/profile/password', authMiddleware, passwordLimit, changePasswordValidation, validator, changePassword);
profileRouter.get('/users', authMiddleware, searchUsersValidation, validator, searchUsers);
profileRouter.get('/users/:id', authMiddleware, userIdValidation, validator, getUserProfile);

// Moderación: ocultar o volver a mostrar la descripción de un perfil.
profileRouter.post('/moderation/users/:id/bio/hide', authMiddleware, moderatorMiddleware, bioVisibilityValidation, validator, hideBio);
profileRouter.post('/moderation/users/:id/bio/show', authMiddleware, moderatorMiddleware, bioVisibilityValidation, validator, showBio);
