import { Router } from 'express';
import { getCountries, getLocalities } from '../controllers/locality.controller.js';

export const localityRouter = Router();

// Públicas: se usan en el formulario de registro.
localityRouter.get('/origin-countries', getCountries);
localityRouter.get('/origin-localities', getLocalities);
