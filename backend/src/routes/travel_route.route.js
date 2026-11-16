import { Router } from 'express';
import { getRouteById, getRoutes } from '../controllers/travel_route.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { getRoutesValidation, routeIdValidation } from '../middlewares/validations/travel_route.validation.js';

export const travelRouteRouter = Router();

// Rutas orientativas hasta cada institución (FF-22).
travelRouteRouter.get('/routes', authMiddleware, getRoutesValidation, validator, getRoutes);
travelRouteRouter.get('/routes/:id', authMiddleware, routeIdValidation, validator, getRouteById);
