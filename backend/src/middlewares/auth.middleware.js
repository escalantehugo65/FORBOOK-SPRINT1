// Deja pasar solo si hay una sesión iniciada. La sesión vive en MySQL (tabla sessions),
// así que no hay token en el navegador: alcanza con la cookie forbook.sid.
export const authMiddleware = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: { message: 'Iniciá sesión para continuar.' } });
  }
  next();
};
