import { Router } from 'express';
import { createReport, getReports, resolveReport } from '../controllers/report.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { moderatorMiddleware } from '../middlewares/role.middleware.js';
import { reportLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { createReportValidation, getReportsValidation, resolveReportValidation } from '../middlewares/validations/report.validation.js';

export const reportRouter = Router();

// Cualquier cuenta puede reportar (FF-34 y FF-35).
reportRouter.post('/reports', authMiddleware, reportLimit, createReportValidation, validator, createReport);

// Moderación y administración atienden la cola (FF-36 y FF-37).
reportRouter.get('/moderation/reports', authMiddleware, moderatorMiddleware, getReportsValidation, validator, getReports);
reportRouter.post('/moderation/reports/:id/resolve', authMiddleware, moderatorMiddleware, resolveReportValidation, validator, resolveReport);
