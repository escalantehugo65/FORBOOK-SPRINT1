import { User } from '../models/user.model.js';

// El rol se lee de la base en cada pedido: si alguien cambia de rol, vale desde el próximo pedido.
// Va siempre después de authMiddleware.
const roleMiddleware = (roles) => async (req, res, next) => {
  const user = await User.findByPk(req.session.userId, { attributes: ['id', 'role'] });
  if (!user) {
    return res.status(401).json({ error: { message: 'Tu sesión ya no es válida.' } });
  }
  if (!roles.includes(user.role)) {
    return res.status(403).json({ error: { message: 'No tenés permiso para entrar a esta sección.' } });
  }
  next();
};

// Épica 7: moderadores y administradores atienden reportes; solo administración ve el historial y el catálogo.
export const moderatorMiddleware = roleMiddleware(['moderator', 'admin']);
export const adminMiddleware = roleMiddleware(['admin']);
