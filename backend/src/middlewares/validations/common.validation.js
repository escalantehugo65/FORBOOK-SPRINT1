import { body, checkExact, param, query } from 'express-validator';

// Ids de la URL o del cuerpo: enteros positivos, sin trucos ("1 OR 1=1", "1.5", "-1" o ["1"] no pasan).
export const isId = (value) => (typeof value === 'number' || typeof value === 'string')
  && /^\d+$/.test(String(value)) && Number(value) >= 1 && Number(value) <= 4294967295;

// null y undefined cuentan como "no vino".
export const isPresent = (value) => value !== undefined && value !== null;
export const hasText = (value) => typeof value === 'string' && value.trim() !== '';
export const isBoolean = (value) => typeof value === 'boolean';

// El cuerpo tiene que ser un objeto JSON { ... }, no una lista [ ... ].
export const jsonBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: { message: 'Enviá un objeto JSON válido.' } });
  }
  next();
};

// Solo se aceptan los campos que se validan: si llega otro (por ejemplo "role"), el pedido se rechaza.
export const onlyTheseFields = (chains) => [
  jsonBody,
  checkExact(chains, { locations: ['body'], message: 'La petición contiene campos no permitidos.' }),
];

// Lo mismo para los filtros de la URL (?categoryId=2&page=3).
export const onlyTheseFilters = (chains) => checkExact(chains, { locations: ['query'], message: 'Filtro no permitido.' });

export const idParam = (message = 'Identificador inválido.') => param('id', message).custom(isId).toInt();

export const pageQuery = () => query('page', 'Página inválida.').optional().custom(isId).toInt();

// Nota interna de moderación: revocar una advertencia u ocultar/mostrar una descripción.
export const moderationNote = () => onlyTheseFields([
  body('note', 'Escribí el motivo en 5 a 500 caracteres.').isString().trim().isLength({ min: 5, max: 500 }),
]);
