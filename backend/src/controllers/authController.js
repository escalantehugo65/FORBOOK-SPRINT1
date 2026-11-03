import bcrypt from 'bcryptjs';
import { HttpError, publicUser, sessionCall } from '../helpers/http.js';
import { validateCredentials } from '../middlewares/validation.js';

export function authController(models, cookieOptions) {
  const { User, Institution, Career } = models;
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
      if (!await Institution.findByPk(input.institutionId)) throw new HttpError(400, 'La institución seleccionada no existe.', { institutionId: 'Elegí una institución del catálogo.' });
      if (await User.findOne({ where: { email: input.email } })) throw new HttpError(409, 'Ese correo ya está registrado.');
      const selectedCareer = await Career.findOne({ where: { id: input.careerId, institutionId: input.institutionId } });
      if (!selectedCareer) throw new HttpError(400, 'La carrera no corresponde a la institución elegida.', { careerId: 'Elegí una carrera del catálogo de tu institución.' });
      const { password, careerId, ...profile } = input;
      // Se guarda el nombre canónico; el estudiante nunca decide este texto.
      profile.career = selectedCareer.name;
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
