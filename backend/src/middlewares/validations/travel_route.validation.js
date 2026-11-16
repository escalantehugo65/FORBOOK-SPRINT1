import { query } from 'express-validator';
import { idParam, isId, onlyTheseFilters } from './common.validation.js';

// FF-22: GET /routes?institutionId=2 (sin filtro, las de la institución del estudiante).
export const getRoutesValidation = [
  onlyTheseFilters([
    query('institutionId', 'Institución inválida.').optional().custom(isId).toInt(),
  ]),
];

export const routeIdValidation = [idParam()];
