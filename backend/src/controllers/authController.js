import { registrationInstitutionNames } from '../helpers/registrationInstitutions.js';
import bcrypt from 'bcryptjs';
import { countriesByCode } from '../helpers/countries.js';
import { HttpError, publicUser, sessionCall } from '../helpers/http.js';
import { validateCredentials } from '../middlewares/validation.js';

export function authController(models, cookieOptions) {
  const { User, Institution, Career, Locality } = models;
  // Hash de trabajo equivalente para que un correo inexistente también verifique un hash.
  const dummyHash = bcrypt.hashSync('forbook-dummy-password', 12);
  const findUser = id => User.findByPk(id, { include: { model: Institution, as: 'institution' } });
  async function beginSession(req, userId) {
    await sessionCall(req, 'regenerate');
    req.session.userId = userId;
    await sessionCall(req, 'save');
  }
  return {
    register: async (req, res) => {
      const input = validateCredentials(req.body, true);
      const targetInstitution = await Institution.findByPk(input.institutionId);
      if (!targetInstitution || !registrationInstitutionNames.includes(targetInstitution.name)) throw new HttpError(400, 'La institución seleccionada no existe.', { institutionId: 'Elegí una institución del catálogo.' });
      if (await User.findOne({ where: { email: input.email } })) throw new HttpError(409, 'Ese correo ya está registrado.');
      const selectedCareer = input.careerId ? await Career.findOne({ where: { id: input.careerId, institutionId: input.institutionId } }) : null;
      const catalogHasCareers = await Career.count({ where: { institutionId: input.institutionId } });
      if ((input.careerId && !selectedCareer) || (!input.careerId && catalogHasCareers > 0)) throw new HttpError(400, 'La carrera no corresponde a la institución elegida.', { careerId: 'Elegí una carrera del catálogo de tu institución.' });
      const locality = input.originCountryCode === 'AR' ? await Locality.findByPk(input.originLocalityId) : null;
      if (input.originCountryCode === 'AR' && !locality) throw new HttpError(400, 'La localidad seleccionada no está disponible.', { originLocalityId: 'Elegí una localidad del catálogo de Argentina.' });
      const { password, careerId, ...profile } = input;
      profile.originLocalityId = locality?.id ?? null;
      profile.origin = locality ? `${locality.name}, ${locality.provinceName || 'Formosa'}` : countriesByCode.get(input.originCountryCode).name;
      // Se guarda el nombre canónico; el estudiante nunca decide este texto.
      profile.career = selectedCareer?.name || 'Carrera pendiente de catálogo';
      const user = await User.create({ ...profile, passwordHash: await bcrypt.hash(password, 12), role: 'student' });
      try { await beginSession(req, user.id); }
      catch (error) {
        // La cuenta ya es persistente: no engañamos al usuario con un error de registro genérico.
        console.error('No se pudo iniciar la sesión después del registro:', error.name);
        return res.status(201).json({ data: { user: publicUser(await findUser(user.id)), sessionStarted: false }, message: 'La cuenta fue creada. Iniciá sesión para continuar.' });
      }
      res.status(201).json({ data: { user: publicUser(await findUser(user.id)), sessionStarted: true } });
    },
    login: async (req, res) => {
      const { email, password } = validateCredentials(req.body);
      const user = await User.scope('withPassword').findOne({ where: { email }, include: { model: Institution, as: 'institution' } });
      const valid = await bcrypt.compare(password, user?.passwordHash || dummyHash);
      if (!user || !valid) throw new HttpError(401, 'El correo o la contraseña no son correctos.');
      await beginSession(req, user.id);
      res.json({ data: { user: publicUser(user) } });
    },
    me: async (req, res) => {
      const user = await findUser(req.session.userId);
      if (!user) { await sessionCall(req, 'destroy'); throw new HttpError(401, 'Tu sesión ya no es válida.'); }
      res.json({ data: { user: publicUser(user) } });
    },
    logout: async (req, res) => {
      await sessionCall(req, 'destroy');
      res.clearCookie('forbook.sid', cookieOptions);
      res.json({ data: { message: 'Sesión cerrada.' } });
    },
  };
}
