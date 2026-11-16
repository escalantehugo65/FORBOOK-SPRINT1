import { Router } from 'express';
import { createRoute, getAdminRoutes, getRouteById, getRoutes, updateRoute } from '../controllers/travel_route.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { createRouteValidation, getRoutesValidation, routeIdValidation, updateRouteValidation } from '../middlewares/validations/travel_route.validation.js';

export const travelRouteRouter = Router();

// Rutas orientativas hasta cada institución (FF-22).
travelRouteRouter.get('/routes', authMiddleware, getRoutesValidation, validator, getRoutes);
travelRouteRouter.get('/routes/:id', authMiddleware, routeIdValidation, validator, getRouteById);

// Solo administración: cargar y editar rutas desde la página.
travelRouteRouter.get('/admin/routes', authMiddleware, adminMiddleware, getAdminRoutes);
travelRouteRouter.post('/admin/routes', authMiddleware, adminMiddleware, createRouteValidation, validator, createRoute);
travelRouteRouter.put('/admin/routes/:id', authMiddleware, adminMiddleware, updateRouteValidation, validator, updateRoute);
