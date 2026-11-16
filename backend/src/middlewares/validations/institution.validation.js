import { idParam } from './common.validation.js';

// GET /institutions/:id/careers
export const institutionIdValidation = [idParam('Institución inválida.')];
