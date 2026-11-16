import { Router } from 'express';
import { createPlace, getAdminPlaces, getPlaceById, getPlaces, updatePlace } from '../controllers/place.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { createPlaceValidation, getPlacesValidation, placeIdValidation, updatePlaceValidation } from '../middlewares/validations/place.validation.js';

export const placeRouter = Router();

// Mapa (épica 4).
placeRouter.get('/places', authMiddleware, getPlacesValidation, validator, getPlaces);
placeRouter.get('/places/:id', authMiddleware, placeIdValidation, validator, getPlaceById);

// Solo administración: cargar y editar lugares desde la página.
placeRouter.get('/admin/places', authMiddleware, adminMiddleware, getAdminPlaces);
placeRouter.post('/admin/places', authMiddleware, adminMiddleware, createPlaceValidation, validator, createPlace);
placeRouter.put('/admin/places/:id', authMiddleware, adminMiddleware, updatePlaceValidation, validator, updatePlace);
