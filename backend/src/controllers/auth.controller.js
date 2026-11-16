import { matchedData } from 'express-validator';
import { User } from '../models/user.model.js';
import { Institution } from '../models/institution.model.js';
import { Career } from '../models/career.model.js';
import { Locality } from '../models/locality.model.js';
import { cookieOptions, sessionCookieName } from '../config/session.js';
import { HttpError } from '../helpers/error.helper.js';
import { comparePassword, fakeHash, hashPassword } from '../helpers/bcrypt.helper.js';
import { sessionCall, startSession } from '../helpers/session.helper.js';
import { publicUser } from '../helpers/user.helper.js';
import { countriesByCode } from '../helpers/country.helper.js';
import { registrationInstitutionNames } from '../helpers/institution.helper.js';

const findUser = (id) => User.findByPk(id, { include: { model: Institution, as: 'institution' } });

// POST /auth/register
export const register = async (req, res) => {
  const input = matchedData(req, { locations: ['body'] });
  const institution = await Institution.findByPk(input.institutionId);
  if (!institution || !registrationInstitutionNames.includes(institution.name)) {
    throw new HttpError(400, 'La institución seleccionada no existe.', { institutionId: 'Elegí una institución del catálogo.' });
  }
  if (await User.findOne({ where: { email: input.email } })) throw new HttpError(409, 'Ese correo ya está registrado.');

  const career = input.careerId ? await Career.findOne({ where: { id: input.careerId, institutionId: input.institutionId } }) : null;
  const catalogHasCareers = await Career.count({ where: { institutionId: input.institutionId } });
  if ((input.careerId && !career) || (!input.careerId && catalogHasCareers > 0)) {
    throw new HttpError(400, 'La carrera no corresponde a la institución elegida.', { careerId: 'Elegí una carrera del catálogo de tu institución.' });
  }

  const fromArgentina = input.originCountryCode === 'AR';
  const locality = fromArgentina ? await Locality.findByPk(input.originLocalityId) : null;
  if (fromArgentina && !locality) {
    throw new HttpError(400, 'La localidad seleccionada no está disponible.', { originLocalityId: 'Elegí una localidad del catálogo de Argentina.' });
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    origin: locality ? `${locality.name}, ${locality.provinceName || 'Formosa'}` : countriesByCode.get(input.originCountryCode).name,
    originLocalityId: locality?.id ?? null,
    originCountryCode: input.originCountryCode,
    institutionId: input.institutionId,
    // Se guarda el nombre canónico de la carrera; el estudiante nunca escribe este texto.
    career: career?.name || 'Carrera pendiente de catálogo',
    arrivalStatus: input.arrivalStatus,
    role: 'student',
  });

  try {
    await startSession(req, user.id);
  } catch (error) {
    // La cuenta ya quedó guardada: no se responde con un error de registro.
    console.error('No se pudo iniciar la sesión después del registro:', error.name);
    return res.status(201).json({ data: { user: publicUser(await findUser(user.id)), sessionStarted: false }, message: 'La cuenta fue creada. Iniciá sesión para continuar.' });
  }
  res.status(201).json({ data: { user: publicUser(await findUser(user.id)), sessionStarted: true } });
};

// POST /auth/login
export const login = async (req, res) => {
  const { email, password } = matchedData(req, { locations: ['body'] });
  const user = await User.scope('withPassword').findOne({ where: { email }, include: { model: Institution, as: 'institution' } });
  // Si el correo no existe se compara igual contra un hash de relleno: así no se nota cuáles correos existen.
  const valid = await comparePassword(password, user?.passwordHash || fakeHash);
  if (!user || !valid) throw new HttpError(401, 'El correo o la contraseña no son correctos.');
  await startSession(req, user.id);
  res.json({ data: { user: publicUser(user) } });
};

// GET /auth/me
export const getMe = async (req, res) => {
  const user = await findUser(req.session.userId);
  if (!user) {
    await sessionCall(req, 'destroy');
    throw new HttpError(401, 'Tu sesión ya no es válida.');
  }
  res.json({ data: { user: publicUser(user) } });
};

// POST /auth/logout
export const logout = async (req, res) => {
  await sessionCall(req, 'destroy');
  res.clearCookie(sessionCookieName, cookieOptions);
  res.json({ data: { message: 'Sesión cerrada.' } });
};
