import { Router } from 'express';
import { getBlocks, removeBlock, setBlock } from '../controllers/user_block.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { blockUserValidation, setBlockValidation } from '../middlewares/validations/community.validation.js';

export const userBlockRouter = Router();

// Ocultar o bloquear a otra persona.
userBlockRouter.get('/blocks', authMiddleware, getBlocks);
userBlockRouter.put('/users/:id/block', authMiddleware, setBlockValidation, validator, setBlock);
userBlockRouter.delete('/users/:id/block', authMiddleware, blockUserValidation, validator, removeBlock);
