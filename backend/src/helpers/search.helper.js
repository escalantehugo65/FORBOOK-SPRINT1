import { Op } from 'sequelize';

// "100%_real" no tiene que encontrar "cualquier cosa": % y _ son comodines de LIKE, así que se escapan.
export const likePattern = (text) => `%${text.replace(/[\\%_]/g, character => `\\${character}`)}%`;

// Condición "alguno de estos campos contiene el texto". La comparación de MySQL (utf8mb4_unicode_ci)
// no distingue mayúsculas ni tildes: "tramite" encuentra "Trámite".
export const textSearch = (fields, text) => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: likePattern(text) } })) });
