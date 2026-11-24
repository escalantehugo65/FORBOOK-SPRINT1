import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Institution } from '../src/models/institution.model.js';
import { Category } from '../src/models/category.model.js';
import { User } from '../src/models/user.model.js';
import { Question } from '../src/models/question.model.js';
import { Friendship } from '../src/models/friendship.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';
import { runMigrations } from '../migrations/runner.js';
import { app } from '../app.js';

// Cambiar el correo, dar de baja la propia cuenta y borrar una cuenta desde el panel.
test('correo y bajas de cuenta sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const users = {};
  let institution, category;
  const password = 'Una-clave-segura-123';
  try {
    await sequelize.authenticate();
    await runMigrations();
    institution = await Institution.create({ name: `Instituto cuentas ${suffix}`, sourceUrl: 'https://example.com' });
    category = await Category.create({ name: `Cuentas ${suffix}`, slug: `cue-${suffix}`, description: 'Datos ficticios para pruebas' });
    const passwordHash = await bcrypt.hash(password, 4);
    for (const [key, role] of [['ana', 'student'], ['beto', 'student'], ['caro', 'student'], ['boss', 'admin'], ['boss2', 'admin']]) {
      users[key] = await User.create({ name: `${key} Cuenta ${suffix}`, email: `${key}-cuenta-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: institution.id, career: 'Carrera', arrivalStatus: 'arrived', role, points: 100 });
    }
    const agents = {};
    const login = async (key, email = users[key].email) => {
      agents[key] = request.agent(app);
      return agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email, password });
    };
    for (const key of Object.keys(users)) (await login(key)).status === 200 || assert.fail(key);
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);

    await t.test('cambiar el correo', async () => {
      const email = `ana-nueva-${suffix}@example.com`;
      assert.ok((await send('ana', 'put', '/api/profile/email', { email, currentPassword: 'otra-clave-123' }).expect(400)).body.error.fields.currentPassword);
      assert.ok((await send('ana', 'put', '/api/profile/email', { email: 'no-es-correo', currentPassword: password }).expect(400)).body.error.fields.email);
      assert.ok((await send('ana', 'put', '/api/profile/email', { email: users.beto.email, currentPassword: password }).expect(409)).body.error.fields.email);
      assert.ok((await send('ana', 'put', '/api/profile/email', { email: users.ana.email, currentPassword: password }).expect(400)).body.error.fields.email);
      await send('ana', 'put', '/api/profile/email', { email: email.toUpperCase(), currentPassword: password }).expect(200);
      assert.equal((await User.findByPk(users.ana.id)).email, email);
      assert.equal((await login('ana', users.ana.email)).status, 401);
      assert.equal((await login('ana', email)).status, 200);
    });

    await t.test('dar de baja la propia cuenta', async () => {
      await send('beto', 'post', '/api/questions', { title: `¿Dónde queda la terminal ${suffix}?`, categoryId: category.id, forMyInstitution: false }).expect(201);
      await send('beto', 'post', `/api/users/${users.ana.id}/friendship`).expect(201);
      await send('ana', 'post', `/api/users/${users.beto.id}/friendship/accept`).expect(200);
      await send('beto', 'delete', '/api/profile', { currentPassword: 'otra-clave-123' }).expect(400);
      await send('boss', 'delete', '/api/profile', { currentPassword: password }).expect(403);
      await send('beto', 'delete', '/api/profile', { currentPassword: password }).expect(200);
      await send('beto', 'get', '/api/auth/me').expect(401);
      assert.equal((await login('beto')).status, 401);
      const stored = await User.findByPk(users.beto.id);
      assert.ok(stored.deletedAt);
      assert.equal(stored.name, 'Cuenta eliminada');
      assert.match(stored.email, /@forbook\.invalid$/);
      // Lo que publicó queda, sin su nombre; el perfil y la búsqueda ya no la muestran; la amistad se fue.
      const question = await Question.findOne({ where: { userId: users.beto.id } });
      assert.ok(question);
      await send('ana', 'get', `/api/users/${users.beto.id}`).expect(404);
      assert.equal((await send('ana', 'get', `/api/users?search=${encodeURIComponent(`beto Cuenta ${suffix}`)}`).expect(200)).body.data.length, 0);
      assert.equal(await Friendship.count({ where: { userLowId: Math.min(users.ana.id, users.beto.id), userHighId: Math.max(users.ana.id, users.beto.id) } }), 0);
      await send('ana', 'post', `/api/users/${users.beto.id}/friendship`).expect(404);
    });

    await t.test('borrar una cuenta desde el panel', async () => {
      await send('ana', 'delete', `/api/admin/users/${users.caro.id}`, { note: 'Cuenta de prueba duplicada.' }).expect(403);
      await send('boss', 'delete', `/api/admin/users/${users.boss.id}`, { note: 'Intento borrarme a mí.' }).expect(400);
      await send('boss', 'delete', `/api/admin/users/${users.boss2.id}`, { note: 'Intento borrar a un admin.' }).expect(403);
      await send('boss', 'delete', `/api/admin/users/${users.caro.id}`, { note: '' }).expect(400);
      await send('boss', 'delete', `/api/admin/users/${users.caro.id}`, { note: 'Cuenta de prueba duplicada.' }).expect(200);
      await send('boss', 'delete', `/api/admin/users/${users.caro.id}`, { note: 'Otra vez.' }).expect(404);
      // La sesión que tenía abierta deja de servir.
      await send('caro', 'get', '/api/questions').expect(401);
      await send('boss', 'get', `/api/admin/users/${users.caro.id}`).expect(404);
      assert.ok(!(await send('boss', 'get', `/api/admin/users?search=${encodeURIComponent(suffix)}`).expect(200)).body.data.some(row => row.id === users.caro.id));
      const log = await ModerationLog.findOne({ where: { action: 'account_delete', targetId: users.caro.id } });
      assert.match(log.note, new RegExp(`caro Cuenta ${suffix}: Cuenta de prueba duplicada`));
    });
  } finally {
    const userIds = Object.values(users).map(user => user.id);
    if (userIds.length) {
      await ModerationLog.destroy({ where: { moderatorId: userIds } });
      await Question.destroy({ where: { userId: userIds } });
      await PointTransaction.destroy({ where: { userId: userIds } });
      await sequelize.query('DELETE FROM friendships WHERE user_low_id IN (:userIds) OR user_high_id IN (:userIds)', { replacements: { userIds } });
      await User.destroy({ where: { id: userIds } });
    }
    if (category) await category.destroy();
    if (institution) await institution.destroy();
    await sequelize.close();
  }
});
