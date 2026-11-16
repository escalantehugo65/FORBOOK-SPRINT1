import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { Group } from '../models/group.model.js';
import { Institution } from '../models/institution.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';

const visible = { status: 'published', hiddenAt: null };
const listAttributes = ['id', 'name', 'kind', 'audience', 'summary', 'institutionId', 'originScope', 'arrivalScope'];
const institutionInclude = { model: Institution, as: 'institution', attributes: ['id', 'name'] };

// Por qué se le sugiere este espacio, para mostrarlo en pantalla.
const reasons = (group) => {
  const list = [];
  if (group.institutionId) list.push('institution');
  if (group.originScope !== 'any') list.push('origin');
  if (group.arrivalScope !== 'any') list.push('arrival');
  return list;
};

// GET /groups (FF-30). Épica 6: se sugieren según la institución, la procedencia
// (de la provincia o de afuera) y si el estudiante ya llegó a Formosa.
export const getGroups = async (req, res) => {
  const student = await findSessionUser(req, ['id', 'institutionId', 'originLocalityId', 'arrivalStatus']);
  // El catálogo de localidades es nacional: solo el código provincial 34 corresponde a Formosa.
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
    attributes: listAttributes,
    include: [institutionInclude],
    order: [['name', 'ASC'], ['id', 'ASC']],
  });
  const groups = rows.map(row => ({ ...row.toJSON(), reasons: reasons(row) }));
  res.json({ data: { specific: groups.filter(group => group.reasons.length), general: groups.filter(group => !group.reasons.length) } });
};

// GET /groups/:id (FF-31)
export const getGroupById = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const group = await Group.findOne({ where: { ...visible, id }, attributes: [...listAttributes, 'purpose', 'linkPath', 'linkLabel'], include: [institutionInclude] });
  if (!group) throw new HttpError(404, 'No encontramos ese espacio.');
  res.json({ data: { ...group.toJSON(), reasons: reasons(group) } });
};
