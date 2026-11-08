import { Op } from 'sequelize';
import { HttpError } from '../helpers/http.js';
import { validateReport } from '../middlewares/validation.js';

// Reportar contenido (FF-34) o avisar que una ficha puede estar desactualizada (FF-35).
// El reporte no cambia nada del contenido: solo queda pendiente para moderación.
export function reportController({ User, Question, Answer, Content, Report }) {
  const confirmation = 'Gracias. Recibimos tu aviso y lo va a revisar el equipo de moderación.';

  // Solo se puede reportar lo que la persona realmente puede ver, y nunca algo propio.
  async function findTarget(targetType, targetId, student) {
    if (targetType === 'question') {
      const question = await Question.findOne({ where: { id: targetId, hiddenAt: null }, attributes: ['id', 'userId'] });
      return question && { ownerId: question.userId };
    }
    if (targetType === 'answer') {
      const answer = await Answer.findOne({ where: { id: targetId, hiddenAt: null }, attributes: ['id', 'userId'], include: [{ model: Question, as: 'question', attributes: ['id', 'hiddenAt'] }] });
      return answer && !answer.question?.hiddenAt && { ownerId: answer.userId };
    }
    const content = await Content.findOne({ where: { id: targetId, status: 'published', hiddenAt: null, [Op.or]: [{ institutionId: null }, { institutionId: student.institutionId }] }, attributes: ['id'] });
    return content && { ownerId: null };
  }

  return {
    create: async (req, res) => {
      const input = validateReport(req.body);
      const student = await User.findByPk(req.session.userId, { attributes: ['id', 'institutionId'] });
      if (!student) throw new HttpError(401, 'Tu sesión ya no es válida.');
      const target = await findTarget(input.targetType, input.targetId, student);
      if (!target) throw new HttpError(404, 'No encontramos ese contenido.');
      if (target.ownerId === student.id) throw new HttpError(400, 'No podés reportar algo que publicaste vos.');
      // Si ya hay un reporte pendiente de esta persona sobre lo mismo, no se duplica.
      const pending = await Report.findOne({ where: { reporterId: student.id, targetType: input.targetType, targetId: input.targetId, status: 'pending' } });
      if (!pending) await Report.create({ reporterId: student.id, ...input, details: input.details || null });
      // La respuesta no muestra el id, el estado ni nada interno de moderación.
      res.status(pending ? 200 : 201).json({ data: { message: confirmation } });
    },
  };
}
