import { Op } from 'sequelize';
import { Friendship } from '../models/friendship.model.js';
import { unreadByCommunity } from './community.controller.js';

// GET /notifications/summary: lo que muestra el encabezado. Mensajes sin leer en comunidades con avisos
// y solicitudes de amistad recibidas. El encabezado lo consulta cada medio minuto.
export const getSummary = async (req, res) => {
  const me = req.session.userId;
  const [unread, friendRequests] = await Promise.all([
    unreadByCommunity(me, { onlyNotified: true }),
    Friendship.count({ where: { status: 'pending', requesterId: { [Op.ne]: me }, [Op.or]: [{ userLowId: me }, { userHighId: me }] } }),
  ]);
  res.json({ data: { messages: [...unread.values()].reduce((sum, value) => sum + value, 0), friendRequests } });
};
