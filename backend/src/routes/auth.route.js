import { Router } from 'express';
import { getMe, login, logout, register } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { loginValidation, registerValidation } from '../middlewares/validations/auth.validation.js';

export const authRouter = Router();

authRouter.post('/auth/register', authLimit, registerValidation, validator, register);
authRouter.post('/auth/login', authLimit, loginValidation, validator, login);
authRouter.get('/auth/me', authMiddleware, getMe);
authRouter.post('/auth/logout', logout);
