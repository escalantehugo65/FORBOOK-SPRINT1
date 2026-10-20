import { UniqueConstraintError } from 'sequelize';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof UniqueConstraintError) return res.status(409).json({ error: { message: 'Ese correo ya está registrado.' } });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'El JSON recibido no es válido.' } });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: { message: 'La petición es demasiado grande.' } });
  const status = error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error('Error de solicitud:', error.name);
  res.status(status).json({ error: { message: status >= 500 ? 'No pudimos completar la operación. Intentá nuevamente.' : error.message, ...(error.fields ? { fields: error.fields } : {}) } });
}
