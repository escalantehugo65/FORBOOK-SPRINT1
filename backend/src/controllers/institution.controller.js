import { Op } from 'sequelize';
import { matchedData } from 'express-validator';
import { Institution } from '../models/institution.model.js';
import { Career } from '../models/career.model.js';
import { InstitutionResource } from '../models/institution_resource.model.js';
import { HttpError } from '../helpers/error.helper.js';
import { findSessionUser } from '../helpers/user.helper.js';
import { registrationInstitutionNames } from '../helpers/institution.helper.js';

// GET /institutions: catálogo del registro (solo UNaF e IPF).
export const getInstitutions = async (req, res) => {
  const institutions = await Institution.findAll({
    where: { name: { [Op.in]: registrationInstitutionNames } },
    attributes: ['id', 'name', 'sourceUrl'],
    order: [['name', 'ASC']],
  });
  res.json({ data: institutions });
};

// GET /institutions/:id/careers
export const getCareers = async (req, res) => {
  const { id } = matchedData(req, { locations: ['params'] });
  const institution = await Institution.findOne({ where: { id, name: { [Op.in]: registrationInstitutionNames } } });
  if (!institution) throw new HttpError(404, 'La institución no existe.');
  const careers = await Career.findAll({
    where: { institutionId: id },
    attributes: ['id', 'name', 'institutionId', 'sourceUrl', 'reviewedAt'],
    order: [['name', 'ASC']],
  });
  res.json({ data: careers });
};

// GET /institution-resources: accesos de la institución del estudiante. No se puede pedir la de otra.
export const getInstitutionResources = async (req, res) => {
  const student = await findSessionUser(req);
  const institution = await Institution.findByPk(student.institutionId, { attributes: ['id', 'name'] });
  const resources = await InstitutionResource.findAll({
    where: { institutionId: student.institutionId },
    attributes: ['id', 'title', 'description', 'url', 'availabilityNote'],
    order: [['position', 'ASC'], ['id', 'ASC']],
  });
  res.json({ data: { institution, resources } });
};
