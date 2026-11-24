import { Router } from 'express';
import { createAppeal, getMySanctions } from '../controllers/sanction.controller.js';
import { sessionMiddleware } from '../middlewares/auth.middleware.js';
import { reportLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { createAppealValidation } from '../middlewares/validations/sanction.validation.js';

export const sanctionRouter = Router();

// Las propias sanciones y las apelaciones. Funcionan aunque la cuenta esté suspendida o baneada.
sanctionRouter.get('/sanctions/mine', sessionMiddleware, getMySanctions);
sanctionRouter.post('/sanctions/appeals', sessionMiddleware, reportLimit, createAppealValidation, validator, createAppeal);
