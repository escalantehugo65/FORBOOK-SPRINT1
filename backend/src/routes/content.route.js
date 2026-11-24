import { Router } from 'express';
import { createContent, createUserContent, getGuide, deleteUserContent, getAdminContentById, getAdminContents, getContentById, getContents, getOwnContent, updateContent, updateContentSource, updateUserContent } from '../controllers/content.controller.js';
import { authMiddleware, participationMiddleware } from '../middlewares/auth.middleware.js';
import { participationLimit } from '../middlewares/rate_limit.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { adminContentIdValidation, contentIdValidation, createContentValidation, createUserContentValidation, getContentsValidation, updateContentValidation, updateSourceValidation, updateUserContentValidation } from '../middlewares/validations/content.validation.js';

export const contentRouter = Router();

// Conozcamos Formosa.
contentRouter.get('/contents', authMiddleware, getContentsValidation, validator, getContents);
contentRouter.get('/guide', authMiddleware, getGuide);
contentRouter.get('/contents/:id', authMiddleware, contentIdValidation, validator, getContentById);

// Fichas creadas por estudiantes: cada una muestra quién la hizo.
contentRouter.post('/contents', authMiddleware, participationMiddleware, participationLimit, createUserContentValidation, validator, createUserContent);
contentRouter.get('/contents/:id/edit', authMiddleware, contentIdValidation, validator, getOwnContent);
contentRouter.put('/contents/:id', authMiddleware, participationMiddleware, participationLimit, updateUserContentValidation, validator, updateUserContent);
contentRouter.delete('/contents/:id', authMiddleware, contentIdValidation, validator, deleteUserContent);

// Solo administración: fichas completas y sus fuentes (FF-39).
contentRouter.get('/admin/contents', authMiddleware, adminMiddleware, getAdminContents);
contentRouter.post('/admin/contents', authMiddleware, adminMiddleware, createContentValidation, validator, createContent);
contentRouter.get('/admin/contents/:id', authMiddleware, adminMiddleware, adminContentIdValidation, validator, getAdminContentById);
contentRouter.put('/admin/contents/:id', authMiddleware, adminMiddleware, updateContentValidation, validator, updateContent);
contentRouter.put('/admin/contents/:id/source', authMiddleware, adminMiddleware, updateSourceValidation, validator, updateContentSource);
