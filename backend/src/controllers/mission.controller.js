import { matchedData } from 'express-validator';
import { sequelize } from '../config/database.js';
import { MissionClaim } from '../models/mission_claim.model.js';
import { User } from '../models/user.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { missionStatus, missions, periodsAt } from '../helpers/mission.helper.js';
import { addPoints } from '../helpers/point.helper.js';

// GET /missions: las misiones con mi avance, y cuáles puedo cobrar.
export const getMissions = async (req, res) => {
  const list = await missionStatus(req.session.userId);
  res.json({ data: list, meta: { claimable: list.filter(mission => mission.claimable).length } });
};

// POST /missions/:key/claim: cobra los puntos de una misión cumplida. Una sola vez por período.
export const claimMission = async (req, res) => {
  const { key } = matchedData(req, { locations: ['params'] });
  const mission = missions.find(item => item.key === key);
  if (!mission) throw new HttpError(404, 'No encontramos esa misión.');
  const balance = await sequelize.transaction(async transaction => {
    // La fila del usuario queda bloqueada: dos clics a la vez no cobran dos veces.
    const user = await User.findByPk(req.session.userId, { attributes: ['id'], transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new HttpError(401, 'Tu sesión ya no es válida.');
    const status = (await missionStatus(user.id, new Date(), transaction)).find(item => item.key === key);
    if (status.claimed) throw new HttpError(409, 'Ya cobraste esta misión.');
    if (!status.claimable) throw new HttpError(409, `Todavía te falta: llevás ${status.progress} de ${status.goal}.`);
    await MissionClaim.create({ userId: user.id, missionKey: key, period: periodsAt()[mission.period].key, amount: mission.reward }, { transaction });
    const movement = await addPoints({ userId: user.id, amount: mission.reward, reason: 'mission', reputation: 0, targetType: 'mission' }, transaction);
    return movement.balance;
  });
  res.json({ data: { key, reward: mission.reward, balance }, message: `¡Misión cumplida! Sumaste ${mission.reward} puntos.` });
};
