import { fn, col } from 'sequelize';
import { HttpError } from '../helpers/http.js';
import { positiveId, validateResolution } from '../middlewares/validation.js';

// Resumen de lo reportado o moderado, para mostrarlo en la cola y en el historial.
// Del contenido se manda solo lo necesario para decidir: nunca datos del autor.
export async function describeTargets(rows, { Question, Answer, Content, Category }) {
  const ids = type => [...new Set(rows.filter(row => row.targetType === type).map(row => row.targetId))];
  const [questions, answers, contents, categories] = await Promise.all([
    ids('question').length ? Question.findAll({ where: { id: ids('question') }, attributes: ['id', 'title', 'status', 'hiddenAt'] }) : [],
    ids('answer').length ? Answer.findAll({ where: { id: ids('answer') }, attributes: ['id', 'body', 'hiddenAt', 'questionId'], include: [{ model: Question, as: 'question', attributes: ['id', 'title', 'hiddenAt'] }] }) : [],
    ids('content').length ? Content.findAll({ where: { id: ids('content') }, attributes: ['id', 'title', 'status', 'hiddenAt'] }) : [],
    ids('category').length ? Category.findAll({ where: { id: ids('category') }, attributes: ['id', 'name'] }) : [],
  ]);
  const targets = new Map();
  for (const item of questions) targets.set(`question:${item.id}`, { title: item.title, hidden: Boolean(item.hiddenAt), closed: item.status === 'closed', link: item.hiddenAt ? null : `/preguntas/${item.id}` });
  for (const item of answers) {
    const hidden = Boolean(item.hiddenAt || item.question?.hiddenAt);
    targets.set(`answer:${item.id}`, { title: item.question?.title || 'Pregunta no disponible', excerpt: item.body.length > 160 ? `${item.body.slice(0, 157)}…` : item.body, hidden, link: hidden ? null : `/preguntas/${item.questionId}` });
  }
  for (const item of contents) targets.set(`content:${item.id}`, { title: item.title, hidden: Boolean(item.hiddenAt), link: item.hiddenAt || item.status !== 'published' ? null : `/conozcamos/${item.id}` });
  for (const item of categories) targets.set(`category:${item.id}`, { title: item.name, hidden: false, link: null });
  return row => ({ type: row.targetType, id: row.targetId, ...(targets.get(`${row.targetType}:${row.targetId}`) || { title: 'Ya no existe', missing: true, hidden: false, link: null }) });
}

// Cola de reportes (FF-36), resolución (FF-37) e historial (FF-38).
export function moderationController(models) {
  const { User, Question, Answer, Content, Report, ModerationLog } = models;
  const people = [{ model: User, as: 'reporter', attributes: ['id', 'name'] }, { model: User, as: 'resolver', attributes: ['id', 'name'] }];
  const pageOf = query => query.page === undefined ? 1 : positiveId(query.page, 'Página');
  return {
    reports: async (req, res) => {
      if (Object.keys(req.query).some(key => !['status', 'page'].includes(key))) throw new HttpError(400, 'Filtro no permitido.');
      const status = req.query.status ?? 'pending';
      if (!['pending', 'dismissed', 'actioned', 'all'].includes(status)) throw new HttpError(400, 'Estado inválido.');
      const page = pageOf(req.query);
      const limit = 20;
      // Los pendientes se atienden por orden de llegada; los resueltos se muestran del más nuevo al más viejo.
      const order = status === 'pending' ? [['createdAt', 'ASC'], ['id', 'ASC']] : [['createdAt', 'DESC'], ['id', 'DESC']];
      const { rows, count } = await Report.findAndCountAll({ where: status === 'all' ? {} : { status }, include: people, order, limit, offset: (page - 1) * limit });
      const target = await describeTargets(rows, models);
      const counts = { pending: 0, dismissed: 0, actioned: 0 };
      for (const row of await Report.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'total']], group: ['status'], raw: true })) counts[row.status] = Number(row.total);
      res.json({
        data: rows.map(row => ({
          id: row.id, reason: row.reason, details: row.details, status: row.status, createdAt: row.createdAt,
          reporter: { name: row.reporter?.name || 'Cuenta eliminada' },
          target: target(row),
          resolution: row.status === 'pending' ? null : { action: row.action, note: row.resolutionNote, resolvedAt: row.resolvedAt, resolver: { name: row.resolver?.name || 'Cuenta eliminada' } },
        })),
        meta: { page, total: count, pages: Math.ceil(count / limit), counts },
      });
    },
    resolve: async (req, res) => {
      const input = validateResolution(req.body);
      const report = await Report.findByPk(positiveId(req.params.id, 'Reporte'));
      if (!report) throw new HttpError(404, 'No encontramos este reporte.');
      if (report.status !== 'pending') throw new HttpError(409, 'Este reporte ya fue resuelto.');
      if (input.decision === 'close' && report.targetType !== 'question') throw new HttpError(400, 'Solo se pueden cerrar preguntas.', { decision: 'Elegí otra decisión.' });
      const model = { question: Question, answer: Answer, content: Content }[report.targetType];
      const target = await model.findByPk(report.targetId);
      if (!target && input.decision !== 'dismiss') throw new HttpError(409, 'El contenido ya no existe: solo se puede desestimar el reporte.');
      const resolution = {
        status: input.decision === 'dismiss' ? 'dismissed' : 'actioned',
        action: input.decision === 'dismiss' ? 'none' : input.decision,
        resolutionNote: input.note, resolvedById: req.session.userId, resolvedAt: new Date(),
      };
      // Todo o nada: la acción, el reporte y el registro del historial se guardan juntos.
      await Report.sequelize.transaction(async transaction => {
        const [updated] = await Report.update(resolution, { where: { id: report.id, status: 'pending' }, transaction });
        if (!updated) throw new HttpError(409, 'Este reporte ya fue resuelto.');
        if (input.decision === 'hide' && !target.hiddenAt) await target.update({ hiddenAt: new Date() }, { transaction });
        if (input.decision === 'close') await target.update({ status: 'closed' }, { transaction });
        // Si se aplicó una acción, los demás reportes pendientes sobre lo mismo quedan resueltos igual.
        if (input.decision !== 'dismiss') await Report.update(resolution, { where: { targetType: report.targetType, targetId: report.targetId, status: 'pending' }, transaction });
        await ModerationLog.create({ moderatorId: req.session.userId, action: input.decision, targetType: report.targetType, targetId: report.targetId, reportId: report.id, note: input.note }, { transaction });
      });
      // La respuesta no incluye datos de quien reportó.
      res.json({ data: { id: report.id, status: resolution.status, action: resolution.action } });
    },
    log: async (req, res) => {
      if (Object.keys(req.query).some(key => key !== 'page')) throw new HttpError(400, 'Filtro no permitido.');
      const page = pageOf(req.query);
      const limit = 25;
      const { rows, count } = await ModerationLog.findAndCountAll({ include: [{ model: User, as: 'moderator', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC'], ['id', 'DESC']], limit, offset: (page - 1) * limit });
      const target = await describeTargets(rows, models);
      res.json({
        data: rows.map(row => ({ id: row.id, action: row.action, reportId: row.reportId, note: row.note, createdAt: row.createdAt, moderator: { name: row.moderator?.name || 'Cuenta eliminada' }, target: target(row) })),
        meta: { page, total: count, pages: Math.ceil(count / limit) },
      });
    },
  };
}
