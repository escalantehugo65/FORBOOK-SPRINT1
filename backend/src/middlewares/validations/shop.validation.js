import { idParam, onlyTheseFilters, pageQuery } from './common.validation.js';

// /shop/items/:id/purchase y /shop/items/:id/equip
export const shopItemIdValidation = [idParam('Decoración inválida.')];

// GET /points?page=2
export const getPointsValidation = [onlyTheseFilters([pageQuery()])];
