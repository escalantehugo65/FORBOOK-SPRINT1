import { Router } from 'express';
import {
  adjustPoints, closeCommunity, createSanction, getAppeals, getCommunities, getShopItems, getStats, getUserDetail, getUsers,
  deleteUser, hideContent, reopenCommunity, resolveAppeal, revokeSanction, showContent, updateRole, updateShopItem,
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/role.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import {
  adjustPointsValidation, adminIdValidation, createSanctionValidation, getAppealsValidation, getCommunitiesValidation, getUsersValidation,
  noteValidation, resolveAppealValidation, revokeSanctionValidation, updateRoleValidation, updateShopItemValidation,
} from '../middlewares/validations/admin.validation.js';

export const adminRouter = Router();
const admin = [authMiddleware, adminMiddleware];

// Panel de administración: solo cuentas con rol admin.
adminRouter.get('/admin/stats', ...admin, getStats);
adminRouter.get('/admin/users', ...admin, getUsersValidation, validator, getUsers);
adminRouter.get('/admin/users/:id', ...admin, adminIdValidation, validator, getUserDetail);
adminRouter.put('/admin/users/:id/role', ...admin, updateRoleValidation, validator, updateRole);
adminRouter.post('/admin/users/:id/sanctions', ...admin, createSanctionValidation, validator, createSanction);
adminRouter.post('/admin/users/:id/points', ...admin, adjustPointsValidation, validator, adjustPoints);
adminRouter.delete('/admin/users/:id', ...admin, noteValidation, validator, deleteUser);
adminRouter.post('/admin/sanctions/:id/revoke', ...admin, revokeSanctionValidation, validator, revokeSanction);
adminRouter.get('/admin/appeals', ...admin, getAppealsValidation, validator, getAppeals);
adminRouter.post('/admin/appeals/:id/resolve', ...admin, resolveAppealValidation, validator, resolveAppeal);
adminRouter.get('/admin/communities', ...admin, getCommunitiesValidation, validator, getCommunities);
adminRouter.post('/admin/communities/:id/close', ...admin, noteValidation, validator, closeCommunity);
adminRouter.post('/admin/communities/:id/reopen', ...admin, noteValidation, validator, reopenCommunity);
adminRouter.get('/admin/shop', ...admin, getShopItems);
adminRouter.put('/admin/shop/:id', ...admin, updateShopItemValidation, validator, updateShopItem);
adminRouter.post('/admin/contents/:id/hide', ...admin, noteValidation, validator, hideContent);
adminRouter.post('/admin/contents/:id/show', ...admin, noteValidation, validator, showContent);
