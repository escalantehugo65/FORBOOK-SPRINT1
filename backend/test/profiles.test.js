import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Answer } from '../src/models/answer.model.js';
import { AnswerVote } from '../src/models/answer_vote.model.js';
import { Category } from '../src/models/category.model.js';
import { Institution } from '../src/models/institution.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { Question } from '../src/models/question.model.js';
import { Report } from '../src/models/report.model.js';
import { User } from '../src/models/user.model.js';
import { UserWarning } from '../src/models/user_warning.model.js';
import { runMigrations } from '../migrations/runner.js';
import { up as profiles } from '../migrations/012-profiles.js';
import { app } from '../app.js';

// Perfiles: ver, editar, privacidad, contraseña, reportes y advertencias de moderación.
test('perfiles de usuario sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const users = {};
  let institution, category;
  try {
    await sequelize.authenticate();
    await runMigrations();
    await profiles(); // se puede repetir sin romper nada
    institution = await Institution.create({ name: `Institución perfiles ${suffix}`, sourceUrl: 'https://example.com' });
    category = await Category.create({ name: `Perfiles ${suffix}`, slug: `perfiles-${suffix}`, description: 'Datos ficticios para pruebas' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const [key, role] of [['owner', 'student'], ['other', 'student'], ['moderator', 'moderator']]) users[key] = await User.create({ name: `${key} Perfil Prueba`, email: `${key}-perfil-${suffix}@example.com`, passwordHash, origin: 'Clorinda, Formosa', institutionId: institution.id, career: 'Carrera de prueba', arrivalStatus: 'arrived', role });
    const agents = {};
    const login = async (key, password = 'Una-clave-segura-123') => {
      agents[key] = request.agent(app);
      return agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users[key].email, password });
    };
    for (const key of Object.keys(users)) (await login(key)).status === 200 || assert.fail(`login ${key}`);
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);
    const valid = { bio: 'Vengo de Clorinda y estudio en Formosa.', avatarColor: 'coral', bannerStyle: 'atardecer', interests: ['musica', 'juegos', 'musica'], cohortYear: 2026, showOrigin: false, showArrival: true };

    await t.test('privado y sin correo', async () => {
      await request(app).get('/api/profile').expect(401);
      await request(app).get(`/api/users/${users.owner.id}`).expect(401);
      const own = (await send('owner', 'get', '/api/profile').expect(200)).body.data;
      assert.equal(own.own, true);
      assert.equal(own.email, undefined);
      assert.equal(own.avatarColor, 'azul');
      assert.deepEqual(own.stats, { questions: 0, answers: 0, helpful: 0 });
    });

    await t.test('editar perfil y respetar la privacidad', async () => {
      const saved = (await send('owner', 'put', '/api/profile', valid).expect(200)).body.data;
      assert.deepEqual(saved.interests, ['musica', 'juegos']);
      assert.equal(saved.origin, 'Clorinda, Formosa');
      assert.equal(saved.settings.showOrigin, false);
      const seen = (await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data;
      assert.equal(seen.own, false);
      assert.equal(seen.origin, null);
      assert.equal(seen.arrivalStatus, 'arrived');
      assert.equal(seen.bio, valid.bio);
      assert.equal(seen.settings, undefined);
      assert.equal(seen.canModerate, false);
      assert.equal(seen.email, undefined);
      const bad = async (changes, field) => assert.ok((await send('owner', 'put', '/api/profile', { ...valid, ...changes }).expect(400)).body.error.fields[field]);
      await bad({ bio: 'x'.repeat(281) }, 'bio');
      await bad({ avatarColor: 'red; background:url(x)' }, 'avatarColor');
      await bad({ bannerStyle: 'otro' }, 'bannerStyle');
      await bad({ interests: ['hackear'] }, 'interests');
      await bad({ interests: ['deportes', 'musica', 'juegos', 'lectura', 'arte', 'tecnologia', 'cine'] }, 'interests');
      await bad({ cohortYear: 1800 }, 'cohortYear');
      await bad({ showOrigin: 'si' }, 'showOrigin');
      await send('owner', 'put', '/api/profile', { ...valid, role: 'admin' }).expect(400);
      assert.equal((await User.findByPk(users.owner.id)).role, 'student');
      await send('other', 'get', '/api/users/999999999').expect(404);
    });

    await t.test('actividad e insignias', async () => {
      const question = (await send('owner', 'post', '/api/questions', { title: '¿Dónde cargo la SUBE cerca del centro?', categoryId: category.id }).expect(201)).body.data;
      const answer = (await send('owner', 'post', `/api/questions/${question.id}/answers`, { body: 'Respuesta propia de prueba para el perfil.' }).expect(201)).body.data.answer;
      await send('other', 'put', `/api/answers/${answer.id}/helpful`).expect(200);
      assert.equal(answer.author.id, users.owner.id);
      const seen = (await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data;
      assert.deepEqual(seen.stats, { questions: 1, answers: 1, helpful: 1 });
      assert.equal(seen.recentQuestions[0].id, question.id);
      assert.equal(seen.recentAnswers[0].questionId, question.id);
      assert.ok(seen.badges.includes('helpful'));
      assert.ok((await send('other', 'get', `/api/users/${users.moderator.id}`).expect(200)).body.data.badges.includes('moderation'));
      await Question.update({ hiddenAt: new Date() }, { where: { id: question.id } });
      assert.deepEqual((await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data.stats, { questions: 0, answers: 0, helpful: 0 });
    });

    await t.test('reportar un perfil y ocultar la descripción', async () => {
      await send('owner', 'post', '/api/reports', { targetType: 'profile', targetId: users.owner.id, reason: 'offensive' }).expect(400);
      await send('other', 'post', '/api/reports', { targetType: 'profile', targetId: users.owner.id, reason: 'personal_data', details: 'Publica un teléfono' }).expect(201);
      const queue = (await send('moderator', 'get', '/api/moderation/reports').expect(200)).body.data.find(row => row.target.type === 'profile' && row.target.id === users.owner.id);
      assert.equal(queue.target.link, `/usuarios/${users.owner.id}`);
      assert.match(queue.target.excerpt, /Clorinda/);
      await send('moderator', 'post', `/api/moderation/reports/${queue.id}/resolve`, { decision: 'hide', note: 'Descripción con datos personales.' }).expect(200);
      assert.equal((await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data.bio, null);
      const own = (await send('owner', 'get', '/api/profile').expect(200)).body.data;
      assert.equal(own.bioHidden, true);
      assert.equal(own.bio, valid.bio);
      await send('moderator', 'post', `/api/moderation/users/${users.owner.id}/bio/hide`, { note: 'Otra vez' }).expect(409);
      await send('other', 'post', `/api/moderation/users/${users.owner.id}/bio/show`, { note: 'Intento' }).expect(403);
      await send('moderator', 'post', `/api/moderation/users/${users.owner.id}/bio/show`, { note: 'Ya la corrigió.' }).expect(200);
      assert.equal((await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data.bio, valid.bio);
    });

    await t.test('advertencias visibles en el perfil', async () => {
      await send('other', 'post', `/api/moderation/users/${users.owner.id}/warnings`, { reason: 'false', note: 'Intento sin permiso de moderación.' }).expect(403);
      await send('moderator', 'post', `/api/moderation/users/${users.owner.id}/warnings`, { reason: 'false', note: 'corta' }).expect(400);
      await send('moderator', 'post', `/api/moderation/users/${users.moderator.id}/warnings`, { reason: 'false', note: 'No se puede advertir a sí mismo.' }).expect(400);
      await send('moderator', 'post', `/api/moderation/users/${users.owner.id}/warnings`, { reason: 'false', note: 'Publicó un dato falso sobre horarios.' }).expect(201);
      const seen = (await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data;
      assert.equal(seen.warnings.length, 1);
      assert.equal(seen.warnings[0].reason, 'false');
      assert.equal(seen.warnings[0].note, undefined);
      const own = (await send('owner', 'get', '/api/profile').expect(200)).body.data;
      assert.equal(own.warnings[0].note, 'Publicó un dato falso sobre horarios.');
      const staffView = (await send('moderator', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data;
      assert.equal(staffView.canModerate, true);
      await send('moderator', 'post', `/api/moderation/warnings/${seen.warnings[0].id}/revoke`, { note: 'Se comprobó que el dato era correcto.' }).expect(200);
      await send('moderator', 'post', `/api/moderation/warnings/${seen.warnings[0].id}/revoke`, { note: 'De nuevo' }).expect(404);
      assert.equal((await send('other', 'get', `/api/users/${users.owner.id}`).expect(200)).body.data.warnings.length, 0);
      const actions = (await ModerationLog.findAll({ where: { targetType: 'profile', targetId: users.owner.id } })).map(row => row.action).sort();
      assert.deepEqual(actions, ['bio_show', 'hide', 'warn', 'warning_revoke']);
    });

    await t.test('cambiar la contraseña', async () => {
      assert.ok((await send('owner', 'put', '/api/profile/password', { currentPassword: 'mal', newPassword: 'Otra-clave-segura-456' }).expect(400)).body.error.fields.currentPassword);
      assert.ok((await send('owner', 'put', '/api/profile/password', { currentPassword: 'Una-clave-segura-123', newPassword: 'corta' }).expect(400)).body.error.fields.newPassword);
      await send('owner', 'put', '/api/profile/password', { currentPassword: 'Una-clave-segura-123', newPassword: 'Otra-clave-segura-456' }).expect(200);
      await send('owner', 'get', '/api/profile').expect(200);
      assert.equal((await login('owner')).status, 401);
      assert.equal((await login('owner', 'Otra-clave-segura-456')).status, 200);
    });
  } finally {
    const ids = Object.values(users).map(user => user.id);
    if (ids.length) {
      await ModerationLog.destroy({ where: { targetType: 'profile', targetId: ids } });
      await Report.destroy({ where: { reporterId: ids } });
      await UserWarning.destroy({ where: { userId: ids } });
      await AnswerVote.destroy({ where: { userId: ids } });
      await Answer.destroy({ where: { userId: ids } });
      await Question.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
    }
    if (category) await category.destroy();
    if (institution) await institution.destroy();
    await sequelize.close();
  }
});
