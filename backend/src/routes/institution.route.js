import { Router } from 'express';
import { getCareers, getInstitutionResources, getInstitutions } from '../controllers/institution.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { institutionIdValidation } from '../middlewares/validations/institution.validation.js';

export const institutionRouter = Router();

// Públicas: se usan en el formulario de registro.
institutionRouter.get('/institutions', getInstitutions);
institutionRouter.get('/institutions/:id/careers', institutionIdValidation, validator, getCareers);

institutionRouter.get('/institution-resources', authMiddleware, getInstitutionResources);
