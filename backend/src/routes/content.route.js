import { Router } from 'express';
import { createContent, getAdminContentById, getAdminContents, getContentById, getContents, updateContent, updateContentSource } from '../controllers/content.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { adminContentIdValidation, contentIdValidation, createContentValidation, getContentsValidation, updateContentValidation, updateSourceValidation } from '../middlewares/validations/content.validation.js';

export const contentRouter = Router();

// Conozcamos Formosa.
contentRouter.get('/contents', authMiddleware, getContentsValidation, validator, getContents);
contentRouter.get('/contents/:id', authMiddleware, contentIdValidation, validator, getContentById);

// Solo administración: fichas completas y sus fuentes (FF-39).
contentRouter.get('/admin/contents', authMiddleware, adminMiddleware, getAdminContents);
contentRouter.post('/admin/contents', authMiddleware, adminMiddleware, createContentValidation, validator, createContent);
contentRouter.get('/admin/contents/:id', authMiddleware, adminMiddleware, adminContentIdValidation, validator, getAdminContentById);
contentRouter.put('/admin/contents/:id', authMiddleware, adminMiddleware, updateContentValidation, validator, updateContent);
contentRouter.put('/admin/contents/:id/source', authMiddleware, adminMiddleware, updateSourceValidation, validator, updateContentSource);
