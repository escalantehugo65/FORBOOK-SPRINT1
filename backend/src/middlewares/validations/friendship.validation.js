import { idParam, onlyTheseFilters, searchQuery } from './common.validation.js';

export const userIdValidation = [idParam('Usuario inválido.')];
export const friendsQueryValidation = [onlyTheseFilters([searchQuery()])];
