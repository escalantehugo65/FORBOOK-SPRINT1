import { Router } from 'express';
import { equipItem, getShop, purchaseItem, unequipItem } from '../controllers/shop.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { shopLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { shopItemIdValidation } from '../middlewares/validations/shop.validation.js';

export const shopRouter = Router();

// Tienda de decoraciones: ver, comprar con puntos y ponerse o sacarse una decoración.
shopRouter.get('/shop', authMiddleware, getShop);
shopRouter.post('/shop/items/:id/purchase', authMiddleware, shopLimit, shopItemIdValidation, validator, purchaseItem);
shopRouter.put('/shop/items/:id/equip', authMiddleware, shopItemIdValidation, validator, equipItem);
shopRouter.delete('/shop/items/:id/equip', authMiddleware, shopItemIdValidation, validator, unequipItem);
