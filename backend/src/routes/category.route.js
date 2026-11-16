import { Router } from 'express';
import { createCategory, deleteCategory, getAdminCategories, getCategories, updateCategory } from '../controllers/category.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { categoryIdValidation, createCategoryValidation, updateCategoryValidation } from '../middlewares/validations/category.validation.js';

export const categoryRouter = Router();

categoryRouter.get('/categories', authMiddleware, getCategories);

// Solo administración (FF-39).
categoryRouter.get('/admin/categories', authMiddleware, adminMiddleware, getAdminCategories);
categoryRouter.post('/admin/categories', authMiddleware, adminMiddleware, createCategoryValidation, validator, createCategory);
categoryRouter.put('/admin/categories/:id', authMiddleware, adminMiddleware, updateCategoryValidation, validator, updateCategory);
categoryRouter.delete('/admin/categories/:id', authMiddleware, adminMiddleware, categoryIdValidation, validator, deleteCategory);
