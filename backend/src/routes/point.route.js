import { Router } from 'express';
import { getPoints } from '../controllers/point.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { getPointsValidation } from '../middlewares/validations/shop.validation.js';

export const pointRouter = Router();

// Saldo, nivel, reglas y movimientos de puntos de la propia cuenta.
pointRouter.get('/points', authMiddleware, getPointsValidation, validator, getPoints);
