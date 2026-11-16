import { UniqueConstraintError } from 'sequelize';

// Va después de todas las rutas: ninguna coincidió.
export const notFound = (req, res) => {
  res.status(404).json({ error: { message: 'La ruta solicitada no existe.' } });
};

// Express 5 manda acá cualquier error de un controlador async (también los HttpError).
// Los errores 500 no muestran detalles internos.
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  // Dos pedidos iguales al mismo tiempo: la base frena el duplicado (por ejemplo, el mismo correo).
  if (error instanceof UniqueConstraintError) {
    const email = Object.keys(error.fields || {}).some(key => key.includes('email'));
    return res.status(409).json({ error: { message: email ? 'Ese correo ya está registrado.' : 'Eso ya estaba guardado.' } });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'El JSON recibido no es válido.' } });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: { message: 'La petición es demasiado grande.' } });
  const status = error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error('Error de solicitud:', error.name);
  res.status(status).json({
    error: {
      message: status >= 500 ? 'No pudimos completar la operación. Intentá nuevamente.' : error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    },
  });
};
