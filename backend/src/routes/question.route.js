import { Router } from 'express';
import { createQuestion, getQuestionById, getQuestions } from '../controllers/question.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { participationLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { createQuestionValidation, getQuestionsValidation, questionIdValidation } from '../middlewares/validations/question.validation.js';

export const questionRouter = Router();

questionRouter.get('/questions', authMiddleware, getQuestionsValidation, validator, getQuestions);
questionRouter.post('/questions', authMiddleware, participationLimit, createQuestionValidation, validator, createQuestion);
questionRouter.get('/questions/:id', authMiddleware, questionIdValidation, validator, getQuestionById);
