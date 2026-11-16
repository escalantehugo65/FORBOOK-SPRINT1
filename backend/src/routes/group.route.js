import { Router } from 'express';
import { getGroupById, getGroups } from '../controllers/group.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { getGroupsValidation, groupIdValidation } from '../middlewares/validations/group.validation.js';

export const groupRouter = Router();

// Espacios de integración (épica 6).
groupRouter.get('/groups', authMiddleware, getGroupsValidation, validator, getGroups);
groupRouter.get('/groups/:id', authMiddleware, groupIdValidation, validator, getGroupById);
