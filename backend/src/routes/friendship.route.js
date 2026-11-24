import { Router } from 'express';
import { acceptRequest, getMyFriends, getRequests, getUserFriends, removeFriendship, sendRequest } from '../controllers/friendship.controller.js';
import { getSummary } from '../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { participationLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import { friendsQueryValidation, userIdValidation } from '../middlewares/validations/friendship.validation.js';

export const friendshipRouter = Router();

// Amigos: solicitudes, aceptar, rechazar o cancelar, y listas.
friendshipRouter.get('/friends', authMiddleware, friendsQueryValidation, validator, getMyFriends);
friendshipRouter.get('/friends/requests', authMiddleware, getRequests);
friendshipRouter.get('/users/:id/friends', authMiddleware, userIdValidation, validator, getUserFriends);
friendshipRouter.post('/users/:id/friendship', authMiddleware, participationLimit, userIdValidation, validator, sendRequest);
friendshipRouter.post('/users/:id/friendship/accept', authMiddleware, userIdValidation, validator, acceptRequest);
friendshipRouter.delete('/users/:id/friendship', authMiddleware, userIdValidation, validator, removeFriendship);

// Avisos del encabezado.
friendshipRouter.get('/notifications/summary', authMiddleware, getSummary);
