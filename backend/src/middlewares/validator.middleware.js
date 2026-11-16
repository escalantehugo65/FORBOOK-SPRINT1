import { validationResult } from 'express-validator';

// Junta los errores de las validaciones (carpeta validations/) y responde con el formato que usa el frontend:
// { error: { message, fields } }, donde fields tiene un mensaje por cada campo del formulario.
export const validator = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Campos que no están permitidos (por ejemplo, alguien que manda "role": "admin" en el registro).
  const unknown = errors.array().find(error => error.type === 'unknown_fields');
  if (unknown) return res.status(400).json({ error: { message: unknown.msg } });

  // Un dato inválido en la URL (/preguntas/abc o ?page=cero) no corresponde a ningún campo del formulario.
  const inUrl = errors.array().find(error => error.location === 'params' || error.location === 'query');
  if (inUrl) return res.status(400).json({ error: { message: inUrl.msg } });

  const fields = {};
  for (const [field, error] of Object.entries(errors.mapped())) fields[field] = error.msg;
  return res.status(400).json({ error: { message: 'Revisá los campos indicados.', fields } });
};
