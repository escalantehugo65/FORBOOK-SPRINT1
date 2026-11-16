import { User } from '../models/user.model.js';
import { HttpError } from './error.helper.js';
import { levelOf } from './point.helper.js';

// Usuario de la sesión actual. Si la cuenta ya no existe, la sesión deja de valer.
export const findSessionUser = async (req, attributes = ['id', 'institutionId']) => {
  const user = await User.findByPk(req.session.userId, { attributes });
  if (!user) throw new HttpError(401, 'Tu sesión ya no es válida.');
  return user;
};

// Versión de la foto: el frontend arma /api/users/:id/avatar?v=... y el navegador la puede guardar en caché.
export const avatarVersion = (user) => (user.avatarUpdatedAt ? new Date(user.avatarUpdatedAt).getTime() : null);

// Datos de la propia cuenta que recibe el frontend. Lista explícita: nunca sale el hash.
export const publicUser = (user, decorations) => ({
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
  bannerStyle: user.bannerStyle ?? 'rio',
  avatarVersion: avatarVersion(user),
  points: user.points ?? 0,
  reputation: user.reputation ?? 0,
  level: levelOf(user.reputation ?? 0),
  decorations: decorations || { frame: null, banner: null, effect: null, nameColor: null },
  institution: user.institution ? { id: user.institution.id, name: user.institution.name } : null,
});

// Autor de una pregunta o respuesta: nombre de pila, foto, marco y color del nombre. Nunca el correo.
export const publicAuthor = (author, decorations) => (author
  ? {
    id: author.id,
    name: author.name.trim().split(/\s+/)[0],
    avatarColor: author.avatarColor,
    avatarVersion: avatarVersion(author),
    decorations: { frame: decorations?.frame ?? null, nameColor: decorations?.nameColor ?? null },
  }
  : { id: null, name: 'Usuario de Forbook', avatarColor: 'azul', avatarVersion: null, decorations: { frame: null, nameColor: null } });

// Atributos de un autor que hacen falta para publicAuthor.
export const authorAttributes = ['id', 'name', 'avatarColor', 'avatarUpdatedAt'];
