import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User } from '../models/user.model.js';
import { UserAvatar } from '../models/user_avatar.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { readAvatar } from '../helpers/image.helper.js';
import { saveModerationLog } from '../helpers/moderation.helper.js';

// MySQL guarda la fecha con segundos: la versión de la foto se redondea igual para que coincida.
const now = () => new Date(Math.floor(Date.now() / 1000) * 1000);

// PUT /profile/avatar { image: "data:image/jpeg;base64,..." }. El frontend ya la manda recortada.
export const uploadAvatar = async (req, res) => {
  const { image } = matchedData(req, { locations: ['body'] });
  const data = readAvatar(image);
  const updatedAt = now();
  await sequelize.transaction(async transaction => {
    const user = await User.findByPk(req.session.userId, { attributes: ['id'], transaction });
    if (!user) throw new HttpError(401, 'Tu sesión ya no es válida.');
    await UserAvatar.upsert({ userId: user.id, mimeType: 'image/jpeg', data }, { transaction });
    await user.update({ avatarUpdatedAt: updatedAt }, { transaction });
  });
  res.json({ data: { avatarVersion: updatedAt.getTime() }, message: 'Listo, actualizamos tu foto.' });
};

// DELETE /profile/avatar: vuelven a verse las iniciales con el color elegido.
export const deleteAvatar = async (req, res) => {
  await sequelize.transaction(async transaction => {
    await UserAvatar.destroy({ where: { userId: req.session.userId }, transaction });
    await User.update({ avatarUpdatedAt: null }, { where: { id: req.session.userId }, transaction });
  });
  res.json({ data: { avatarVersion: null }, message: 'Quitamos tu foto.' });
};

// GET /users/:id/avatar: la imagen. Solo con sesión, igual que los perfiles.
// La dirección lleva ?v=versión, así el navegador la guarda y pide la nueva cuando cambia.
export const getAvatar = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const avatar = await UserAvatar.findByPk(id);
  if (!avatar) throw new HttpError(404, 'Esta persona no tiene foto de perfil.');
  res.set({ 'Content-Type': avatar.mimeType, 'Cache-Control': 'private, max-age=31536000, immutable' });
  res.send(avatar.data);
};

// POST /moderation/users/:id/avatar/remove: moderación quita una foto que no corresponde.
export const removeAvatarByModeration = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const { note } = matchedData(req, { locations: ['body'] });
  const person = await User.findByPk(id, { attributes: ['id', 'avatarUpdatedAt'] });
  if (!person) throw new HttpError(404, 'No encontramos ese perfil.');
  if (!person.avatarUpdatedAt) throw new HttpError(409, 'Este perfil no tiene foto.');
  await sequelize.transaction(async transaction => {
    await UserAvatar.destroy({ where: { userId: person.id }, transaction });
    await person.update({ avatarUpdatedAt: null }, { transaction });
    await saveModerationLog(req, { action: 'avatar_remove', targetType: 'profile', targetId: person.id, note }, transaction);
  });
  res.json({ data: { message: 'Quitamos la foto de perfil.' } });
};
