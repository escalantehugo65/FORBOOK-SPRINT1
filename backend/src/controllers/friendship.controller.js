import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { Friendship } from '../models/friendship.model.js';
import { User } from '../models/user.model.js';
import { Institution } from '../models/institution.model.js';
import { UserBlock } from '../models/user_block.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { decorationsFor } from '../helpers/decoration.helper.js';
import { levelOf } from '../helpers/point.helper.js';
import { likePattern } from '../helpers/search.helper.js';
import { avatarVersion } from '../helpers/user.helper.js';
import { findPair, friendIdsOf, otherOf, pairOf, relationOf } from '../helpers/friendship.helper.js';

export const maxPendingSent = 50;
const personAttributes = ['id', 'name', 'avatarColor', 'avatarUpdatedAt', 'career', 'reputation'];

// Tarjeta de una persona en las listas de amigos y solicitudes. Solo datos públicos del perfil.
const presentPeople = async (users, extra = () => ({})) => {
  const decorations = await decorationsFor(users.map(user => user.id));
  return users.map(user => ({
    id: user.id,
    name: user.name,
    avatarColor: user.avatarColor,
    avatarVersion: avatarVersion(user),
    decorations: decorations.get(user.id),
    institution: user.institution ? { id: user.institution.id, name: user.institution.name } : null,
    career: user.career,
    level: levelOf(user.reputation),
    ...extra(user),
  }));
};
const findPeople = (ids, where = {}) => (ids.length
  ? User.findAll({ where: { id: ids, ...where }, attributes: personAttributes, include: { model: Institution, as: 'institution', attributes: ['id', 'name'] }, order: [['name', 'ASC'], ['id', 'ASC']] })
  : []);

// Si una de las dos bloqueó a la otra, no pueden ser amigas ni mandarse solicitudes.
const blockedBetween = (a, b, transaction) => UserBlock.count({ where: { kind: 'blocked', [Op.or]: [{ userId: a, targetId: b }, { userId: b, targetId: a }] }, transaction });

// POST /users/:id/friendship: mandar una solicitud. Si esa persona ya me había mandado una, quedan como amigos.
export const sendRequest = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const me = req.session.userId;
  if (id === me) throw new HttpError(400, 'No podés mandarte una solicitud a vos.');
  const result = await sequelize.transaction(async transaction => {
    // La fila del usuario se bloquea: dos clics a la vez no crean dos solicitudes ni pasan el límite.
    await User.findByPk(me, { attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE });
    const person = await User.findByPk(id, { attributes: ['id', 'name', 'deletedAt'], transaction });
    if (!person || person.deletedAt) throw new HttpError(404, 'No encontramos ese perfil.');
    if (await blockedBetween(me, id, transaction)) throw new HttpError(403, 'No podés mandarle una solicitud a esta persona.');
    const row = await findPair(me, id, { transaction, lock: transaction.LOCK.UPDATE });
    const relation = relationOf(row, me);
    if (relation === 'friends') throw new HttpError(409, 'Ya son amigos.');
    if (relation === 'sent') throw new HttpError(409, 'Ya le mandaste una solicitud.');
    if (relation === 'received') {
      await row.update({ status: 'accepted', acceptedAt: new Date() }, { transaction });
      return { relation: 'friends', message: `Ahora sos amigo de ${person.name.split(' ')[0]}.` };
    }
    const pending = await Friendship.count({ where: { requesterId: me, status: 'pending' }, transaction });
    if (pending >= maxPendingSent) throw new HttpError(429, `Tenés ${maxPendingSent} solicitudes sin respuesta. Esperá a que te respondan o cancelá alguna.`);
    await Friendship.create({ ...pairOf(me, id), requesterId: me }, { transaction });
    return { relation: 'sent', message: `Le mandaste una solicitud a ${person.name.split(' ')[0]}.` };
  });
  res.status(result.relation === 'sent' ? 201 : 200).json({ data: { relation: result.relation }, message: result.message });
};

// POST /users/:id/friendship/accept: aceptar una solicitud recibida.
export const acceptRequest = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const me = req.session.userId;
  await sequelize.transaction(async transaction => {
    const row = await findPair(me, id, { transaction, lock: transaction.LOCK.UPDATE });
    if (relationOf(row, me) !== 'received') throw new HttpError(404, 'No tenés una solicitud de esta persona.');
    await row.update({ status: 'accepted', acceptedAt: new Date() }, { transaction });
  });
  res.json({ data: { relation: 'friends' }, message: 'Aceptaste la solicitud. Ya son amigos.' });
};

// DELETE /users/:id/friendship: cancelar una solicitud enviada, rechazar una recibida o dejar de ser amigos.
export const removeFriendship = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const me = req.session.userId;
  const row = await findPair(me, id);
  const relation = relationOf(row, me);
  if (relation === 'none') throw new HttpError(404, 'No tenés una amistad ni una solicitud con esta persona.');
  await row.destroy();
  const message = { friends: 'Ya no son amigos.', sent: 'Cancelaste la solicitud.', received: 'Rechazaste la solicitud.' }[relation];
  res.json({ data: { relation: 'none' }, message });
};

// GET /friends?search=ana: mis amigos, por nombre.
export const getMyFriends = async (req, res) => {
  const { search } = matchedData(req, { locations: ['query'] });
  const ids = await friendIdsOf(req.session.userId);
  const people = await findPeople(ids, search ? { name: { [Op.like]: likePattern(search) } } : {});
  res.json({ data: await presentPeople(people, () => ({ relation: 'friends' })), meta: { total: ids.length } });
};

// GET /friends/requests: solicitudes recibidas y enviadas, de la más nueva a la más vieja.
export const getRequests = async (req, res) => {
  const me = req.session.userId;
  const rows = await Friendship.findAll({ where: { status: 'pending', [Op.or]: [{ userLowId: me }, { userHighId: me }] }, order: [['createdAt', 'DESC'], ['id', 'DESC']], raw: true });
  const since = new Map(rows.map(row => [otherOf(row, me), row.createdAt]));
  const people = new Map((await findPeople([...since.keys()])).map(person => [person.id, person]));
  const pick = (received) => rows.filter(row => (row.requesterId !== me) === received).map(row => people.get(otherOf(row, me))).filter(Boolean);
  const extra = relation => person => ({ relation, since: since.get(person.id) });
  res.json({ data: { received: await presentPeople(pick(true), extra('received')), sent: await presentPeople(pick(false), extra('sent')) } });
};

// GET /users/:id/friends: los amigos de un perfil (lo ve cualquier persona con sesión, salvo si la bloqueó).
export const getUserFriends = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const me = req.session.userId;
  const person = await User.findByPk(id, { attributes: ['id', 'deletedAt'] });
  if (!person || person.deletedAt) throw new HttpError(404, 'No encontramos ese perfil.');
  if (id !== me && await UserBlock.count({ where: { userId: id, targetId: me, kind: 'blocked' } })) throw new HttpError(403, 'No podés ver este perfil.');
  const ids = await friendIdsOf(id);
  const people = await findPeople(ids);
  // Para cada amigo, la relación que tiene conmigo (para mostrar el botón que corresponde).
  const mine = people.length ? await Friendship.findAll({ where: { [Op.or]: people.map(person => pairOf(me, person.id)) } }) : [];
  const relations = new Map(mine.map(row => [otherOf(row, me), relationOf(row, me)]));
  res.json({ data: await presentPeople(people, person => ({ relation: person.id === me ? 'self' : relations.get(person.id) ?? 'none' })), meta: { total: ids.length } });
};
