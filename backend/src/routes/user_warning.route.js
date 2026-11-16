import { Router } from 'express';
import { createWarning, revokeWarning } from '../controllers/user_warning.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { moderatorMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { createWarningValidation, revokeWarningValidation } from '../middlewares/validations/user_warning.validation.js';

export const userWarningRouter = Router();

// Moderación de perfiles: advertir y revocar una advertencia.
userWarningRouter.post('/moderation/users/:id/warnings', authMiddleware, moderatorMiddleware, createWarningValidation, validator, createWarning);
userWarningRouter.post('/moderation/warnings/:id/revoke', authMiddleware, moderatorMiddleware, revokeWarningValidation, validator, revokeWarning);
