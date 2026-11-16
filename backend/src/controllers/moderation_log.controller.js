import { matchedData } from 'express-validator';
import { ModerationLog } from '../models/moderation_log.model.js';
import { User } from '../models/user.model.js';
import { describeTargets } from '../helpers/moderation.helper.js';

// GET /moderation/log?page=2 (FF-38): del más nuevo al más viejo, 25 por página.
export const getModerationLog = async (req, res) => {
  const { page = 1 } = matchedData(req, { locations: ['query'] });
  const limit = 25;
  const { rows, count } = await ModerationLog.findAndCountAll({
    include: [{ model: User, as: 'moderator', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  const target = await describeTargets(rows);
  res.json({
    data: rows.map(row => ({
      id: row.id,
      action: row.action,
      reportId: row.reportId,
      note: row.note,
      createdAt: row.createdAt,
      moderator: { name: row.moderator?.name || 'Cuenta eliminada' },
      target: target(row),
    })),
    meta: { page, total: count, pages: Math.ceil(count / limit) },
  });
};
