import { idParam, onlyTheseFilters } from './common.validation.js';

// Las sugerencias dependen del perfil del estudiante: no se aceptan filtros en la URL.
export const getGroupsValidation = [onlyTheseFilters([])];

export const groupIdValidation = [idParam()];
