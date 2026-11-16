import { User } from '../models/user.model.js';
import { HttpError } from './error.helper.js';

// Usuario de la sesión actual. Si la cuenta ya no existe, la sesión deja de valer.
export const findSessionUser = async (req, attributes = ['id', 'institutionId']) => {
  const user = await User.findByPk(req.session.userId, { attributes });
  if (!user) throw new HttpError(401, 'Tu sesión ya no es válida.');
  return user;
};

// Datos de la propia cuenta que recibe el frontend. Lista explícita: nunca sale el hash.
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  origin: user.origin,
  originLocalityId: user.originLocalityId ?? null,
  originCountryCode: user.originCountryCode ?? null,
  career: user.career,
  arrivalStatus: user.arrivalStatus,
  institutionId: user.institutionId,
  role: user.role,
  avatarColor: user.avatarColor ?? 'azul',
  institution: user.institution ? { id: user.institution.id, name: user.institution.name } : null,
});

// Autor de una pregunta o respuesta: solo el nombre de pila y el id del perfil, nunca el correo.
export const publicAuthor = (author) => (author
  ? { id: author.id, name: author.name.trim().split(/\s+/)[0], avatarColor: author.avatarColor }
  : { id: null, name: 'Usuario de Forbook', avatarColor: 'azul' });
