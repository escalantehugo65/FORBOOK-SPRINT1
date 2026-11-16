import { Router } from 'express';
import { getAdminContents, getContentById, getContents, updateContentSource } from '../controllers/content.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { contentIdValidation, getContentsValidation, updateSourceValidation } from '../middlewares/validations/content.validation.js';

export const contentRouter = Router();

// Conozcamos Formosa.
contentRouter.get('/contents', authMiddleware, getContentsValidation, validator, getContents);
contentRouter.get('/contents/:id', authMiddleware, contentIdValidation, validator, getContentById);

// Solo administración: fuentes de las fichas (FF-39).
contentRouter.get('/admin/contents', authMiddleware, adminMiddleware, getAdminContents);
contentRouter.put('/admin/contents/:id/source', authMiddleware, adminMiddleware, updateSourceValidation, validator, updateContentSource);
