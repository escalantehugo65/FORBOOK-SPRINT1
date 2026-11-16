import { Router } from 'express';
import { createAnswer, markHelpful, unmarkHelpful } from '../controllers/answer.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { participationLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { answerIdValidation, createAnswerValidation } from '../middlewares/validations/answer.validation.js';

export const answerRouter = Router();

answerRouter.post('/questions/:id/answers', authMiddleware, participationLimit, createAnswerValidation, validator, createAnswer);
answerRouter.put('/answers/:id/helpful', authMiddleware, participationLimit, answerIdValidation, validator, markHelpful);
answerRouter.delete('/answers/:id/helpful', authMiddleware, participationLimit, answerIdValidation, validator, unmarkHelpful);
