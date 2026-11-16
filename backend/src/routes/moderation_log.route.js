import { Router } from 'express';
import { getModerationLog } from '../controllers/moderation_log.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { getModerationLogValidation } from '../middlewares/validations/moderation_log.validation.js';

export const moderationLogRouter = Router();

// Solo administración ve el historial (FF-38).
moderationLogRouter.get('/moderation/log', authMiddleware, adminMiddleware, getModerationLogValidation, validator, getModerationLog);
