import express, { Router } from 'express';
import { closeCommunity, createCommunity, getCommunities, getCommunityById, getUnread, joinCommunity, leaveCommunity, updateCommunity, updateMembership } from '../controllers/community.controller.js';
import { banMember, getMembers, unbanMember, updateMember } from '../controllers/community_member.controller.js';
import { createRole, deleteRole, updateRole } from '../controllers/community_role.controller.js';
import { createMessage, deleteMessage, getAttachment, getMessages } from '../controllers/community_message.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { communityLimit } from '../middlewares/rate_limit.middleware.js';
import { validator } from '../middlewares/validator.middleware.js';
import {
  communityIdValidation, createCommunityValidation, createMessageValidation, createRoleValidation, getCommunitiesValidation, getMembersValidation,
  getMessagesValidation, memberValidation, membershipValidation, messageValidation, roleValidation, updateCommunityValidation, updateMemberValidation, updateRoleValidation,
} from '../middlewares/validations/community.validation.js';

export const communityRouter = Router();

// Comunidades: listar, buscar, crear y administrar.
communityRouter.get('/communities', authMiddleware, getCommunitiesValidation, validator, getCommunities);
communityRouter.get('/communities/unread', authMiddleware, getUnread);
communityRouter.post('/communities', authMiddleware, communityLimit, createCommunityValidation, validator, createCommunity);
communityRouter.get('/communities/:id', authMiddleware, communityIdValidation, validator, getCommunityById);
communityRouter.put('/communities/:id', authMiddleware, updateCommunityValidation, validator, updateCommunity);
communityRouter.delete('/communities/:id', authMiddleware, communityIdValidation, validator, closeCommunity);

// Unirse, salir y avisos.
communityRouter.post('/communities/:id/join', authMiddleware, communityIdValidation, validator, joinCommunity);
communityRouter.delete('/communities/:id/membership', authMiddleware, communityIdValidation, validator, leaveCommunity);
communityRouter.put('/communities/:id/membership', authMiddleware, membershipValidation, validator, updateMembership);

// Miembros y roles.
communityRouter.get('/communities/:id/members', authMiddleware, getMembersValidation, validator, getMembers);
communityRouter.put('/communities/:id/members/:userId', authMiddleware, updateMemberValidation, validator, updateMember);
communityRouter.delete('/communities/:id/members/:userId', authMiddleware, memberValidation, validator, banMember);
communityRouter.post('/communities/:id/members/:userId/unban', authMiddleware, memberValidation, validator, unbanMember);
communityRouter.post('/communities/:id/roles', authMiddleware, createRoleValidation, validator, createRole);
communityRouter.put('/communities/:id/roles/:roleId', authMiddleware, updateRoleValidation, validator, updateRole);
communityRouter.delete('/communities/:id/roles/:roleId', authMiddleware, roleValidation, validator, deleteRole);

// Chat. Un mensaje puede llevar una imagen o un audio dentro del JSON, por eso acepta un cuerpo más grande (ver app.js).
communityRouter.get('/communities/:id/messages', authMiddleware, getMessagesValidation, validator, getMessages);
communityRouter.post('/communities/:id/messages', authMiddleware, express.json({ limit: '1100kb' }), createMessageValidation, validator, createMessage);
communityRouter.delete('/communities/:id/messages/:messageId', authMiddleware, messageValidation, validator, deleteMessage);
communityRouter.get('/communities/:id/messages/:messageId/attachment', authMiddleware, messageValidation, validator, getAttachment);
