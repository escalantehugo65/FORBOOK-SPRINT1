import { matchedData } from 'express-validator';
import { UserBlock } from '../models/user_block.model.js';
import { User } from '../models/user.model.js';
import { findPair } from '../helpers/friendship.helper.js';
import { HttpError } from '../helpers/error.helper.js';
import { authorAttributes, avatarVersion } from '../helpers/user.helper.js';

// Ocultar y bloquear personas (desde su perfil).
// GET /blocks: a quiénes oculté o bloqueé.
export const getBlocks = async (req, res) => {
  const rows = await UserBlock.findAll({
    where: { userId: req.session.userId },
    attributes: ['kind', 'createdAt'],
    include: [{ model: User, as: 'target', attributes: authorAttributes }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
  });
  res.json({ data: rows.map(row => ({ kind: row.kind, since: row.createdAt, user: { id: row.target.id, name: row.target.name, avatarColor: row.target.avatarColor, avatarVersion: avatarVersion(row.target) } })) });
};

// PUT /users/:id/block { kind: 'hidden' | 'blocked' }
export const setBlock = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { kind } = matchedData(req, { locations: ['body'] });
  if (id === req.session.userId) throw new HttpError(400, 'No podés ocultarte ni bloquearte.');
  if (!await User.findByPk(id, { attributes: ['id'] })) throw new HttpError(404, 'No encontramos ese perfil.');
  await UserBlock.upsert({ userId: req.session.userId, targetId: id, kind });
  // Bloquear corta la amistad y borra las solicitudes pendientes entre las dos.
  if (kind === 'blocked') await (await findPair(req.session.userId, id))?.destroy();
  res.json({ data: { relation: kind }, message: kind === 'blocked' ? 'Bloqueaste a esta persona: no van a verse los mensajes entre ustedes y no puede ver tu perfil.' : 'Ocultaste a esta persona: dejás de ver sus mensajes en las comunidades.' });
};

// DELETE /users/:id/block: deja de estar oculta o bloqueada.
export const removeBlock = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const removed = await UserBlock.destroy({ where: { userId: req.session.userId, targetId: id } });
  if (!removed) throw new HttpError(404, 'Esa persona no estaba oculta ni bloqueada.');
  res.json({ data: { relation: null }, message: 'Listo: volvés a ver a esta persona.' });
};
