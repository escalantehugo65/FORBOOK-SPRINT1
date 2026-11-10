import { Op } from 'sequelize';
import { HttpError } from '../helpers/http.js';
import { positiveId } from '../middlewares/validation.js';

const visible = { status: 'published', hiddenAt: null };
const listAttributes = ['id', 'name', 'kind', 'audience', 'summary', 'institutionId', 'originScope', 'arrivalScope'];

// Épica 6: espacios de integración. Se sugieren según la institución, la procedencia
// (de la provincia o de afuera) y si el estudiante ya llegó a Formosa (FF-30).
export function groupController({ User, Institution, Group }) {
  const institution = { model: Institution, as: 'institution', attributes: ['id', 'name'] };
  async function currentStudent(req) {
    const student = await User.findByPk(req.session.userId, { attributes: ['id', 'institutionId', 'originLocalityId', 'arrivalStatus'] });
    if (!student) throw new HttpError(401, 'Tu sesión ya no es válida.');
    return student;
  }
  // Por qué se le sugiere este espacio, para mostrarlo en pantalla.
  function reasons(group) {
    const list = [];
    if (group.institutionId) list.push('institution');
    if (group.originScope !== 'any') list.push('origin');
    if (group.arrivalScope !== 'any') list.push('arrival');
    return list;
  }
  return {
    suggestions: async (req, res) => {
      if (Object.keys(req.query).length) throw new HttpError(400, 'Filtro no permitido.');
      const student = await currentStudent(req);
      // El catálogo ahora es nacional: solo el código provincial 34 corresponde a Formosa.
      const origin = /^34\d{6}$/.test(student.originLocalityId || '') ? 'formosa' : 'outside';
      const rows = await Group.findAll({
        where: {
          ...visible,
          [Op.and]: [
            { [Op.or]: [{ institutionId: null }, { institutionId: student.institutionId }] },
            { originScope: { [Op.in]: ['any', origin] } },
            { arrivalScope: { [Op.in]: ['any', student.arrivalStatus] } },
          ],
        },
        attributes: listAttributes, include: [institution], order: [['name', 'ASC'], ['id', 'ASC']],
      });
      const groups = rows.map(row => ({ ...row.toJSON(), reasons: reasons(row) }));
      res.json({ data: { specific: groups.filter(group => group.reasons.length), general: groups.filter(group => !group.reasons.length) } });
    },
    detail: async (req, res) => {
      const group = await Group.findOne({ where: { ...visible, id: positiveId(req.params.id) }, attributes: [...listAttributes, 'purpose', 'linkPath', 'linkLabel'], include: [institution] });
      if (!group) throw new HttpError(404, 'No encontramos ese espacio.');
      res.json({ data: { ...group.toJSON(), reasons: reasons(group) } });
    },
  };
}
