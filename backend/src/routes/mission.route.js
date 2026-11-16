import { Router } from 'express';
import { claimMission, getMissions } from '../controllers/mission.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { missionValidation } from '../middlewares/validations/community.validation.js';

export const missionRouter = Router();

// Misiones: metas que dan puntos para la tienda.
missionRouter.get('/missions', authMiddleware, getMissions);
missionRouter.post('/missions/:key/claim', authMiddleware, missionValidation, validator, claimMission);
