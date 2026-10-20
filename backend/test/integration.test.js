import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { MysqlSessionStore } from '../src/config/sessionStore.js';
import { createApp } from '../src/app.js';
import { up } from '../migrations/001-initial.js';

test('recorrido real de HU-01/02/03/04/06/11/13 sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  if (!process.env.TEST_DB_NAME.endsWith('_test')) throw new Error('TEST_DB_NAME debe terminar en _test.');
  const config = {
    db: { host: process.env.TEST_DB_HOST || '127.0.0.1', port: Number(process.env.TEST_DB_PORT || 3306), database: process.env.TEST_DB_NAME, username: process.env.TEST_DB_USER || 'root', password: process.env.TEST_DB_PASSWORD || '' },
    sessionSecret: 'test-only-secret-at-least-32-characters-long', sessionTtl: 3600000,
    frontendUrl: 'http://localhost:5173', production: false, trustProxy: false,
  };
  const db = createDatabase(config);
  const models = defineModels(db);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let userId, institution, category, emptyCategory, content, draft, cookie;
  try {
    await db.authenticate(); await up(db, models);
    institution = await models.Institution.create({ name: `Institución de prueba ${suffix}`, sourceUrl: 'https://example.com' });
    category = await models.Category.create({ name: 'Prueba', slug: `test-${suffix}`, description: 'Datos ficticios exclusivos para pruebas' });
    emptyCategory = await models.Category.create({ name: 'Vacía', slug: `empty-${suffix}`, description: 'Categoría sin publicaciones' });
    const values = { slug: `content-${suffix}`, title: 'Contenido de prueba', summary: 'Dato ficticio', body: 'No es información real.', categoryId: category.id, sourceType: 'experience', authorLabel: 'Pruebas automatizadas', status: 'published' };
    content = await models.Content.create(values);
    draft = await models.Content.create({ ...values, slug: `draft-${suffix}`, status: 'draft' });
    const store = new MysqlSessionStore(models.Session, config.sessionTtl);
    const app = createApp({ models, store, config, db });
    const agent = request.agent(app);
    const post = (path, data, client = agent) => client.post(path).set('Origin', config.frontendUrl).send(data);
    const profile = { name: 'Ana Prueba', email: `test-${suffix}@example.com`, password: 'Una-clave-segura-123', origin: 'Chaco', institutionId: institution.id, career: 'Sistemas', arrivalStatus: 'not_arrived' };
    await t.test('rutas privadas bloqueadas y origen de mutaciones comprobado', async () => {
      await request(app).get('/api/categories').expect(401);
      await request(app).post('/api/auth/register').send(profile).expect(403);
      await post('/api/auth/register', { ...profile, role: 'admin' }).expect(400);
      await post('/api/auth/register', { ...profile, institutionId: 4294967295 }).expect(400);
      await post('/api/auth/register', { ...profile, password: 'corta' }).expect(400);
    });
    await t.test('registro persistente, cookie HttpOnly y datos públicos', async () => {
      const response = await post('/api/auth/register', profile).expect(201);
      userId = response.body.data.user.id;
      cookie = response.headers['set-cookie'][0].split(';')[0];
      assert.equal(response.body.data.sessionStarted, true);
      assert.match(response.headers['set-cookie'][0], /HttpOnly/);
      assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
      assert.equal(response.body.data.user.passwordHash, undefined);
      const user = await models.User.scope('withPassword').findByPk(userId);
      assert.equal(await bcrypt.compare(profile.password, user.passwordHash), true);
      assert.equal(user.role, 'student');
      await post('/api/auth/register', profile).expect(409);
    });
    await t.test('perfil y sesión recuperados incluso con otra instancia de Express', async () => {
      const me = await agent.get('/api/auth/me').expect(200);
      assert.equal(me.body.data.user.institution.name, institution.name);
      assert.equal(me.body.data.user.arrivalStatus, 'not_arrived');
      assert.equal(me.body.data.user.origin, 'Chaco');
      const second = createApp({ models, store: new MysqlSessionStore(models.Session, config.sessionTtl), config, db });
      const restored = await request(second).get('/api/auth/me').set('Cookie', cookie).expect(200);
      assert.equal(restored.body.data.user.id, userId);
    });
    await t.test('categorías, filtros, detalle, vacíos y borradores', async () => {
      await agent.get('/api/categories').expect(200);
      const list = await agent.get(`/api/contents?categoryId=${category.id}`).expect(200);
      assert.equal(list.body.data.length, 1); assert.equal(list.body.data[0].id, content.id);
      const empty = await agent.get(`/api/contents?categoryId=${emptyCategory.id}`).expect(200); assert.equal(empty.body.data.length, 0);
      const detail = await agent.get(`/api/contents/${content.id}`).expect(200);
      assert.equal(detail.body.data.sourceType, 'experience'); assert.equal(detail.body.data.reviewedAt, null);
      await agent.get(`/api/contents/${draft.id}`).expect(404);
      await agent.get('/api/contents/4294967295').expect(404);
      await agent.get('/api/contents?categoryId=oops').expect(400);
    });
    await t.test('logout invalida el servidor y login valida credenciales', async () => {
      await post('/api/auth/logout', {}).expect(200);
      await agent.get('/api/auth/me').expect(401);
      await agent.get('/api/contents').expect(401);
      const wrong = await post('/api/auth/login', { email: profile.email, password: 'incorrecta' }).expect(401);
      const missing = await post('/api/auth/login', { email: 'no-existe@example.com', password: 'incorrecta' }).expect(401);
      assert.equal(wrong.body.error.message, missing.body.error.message);
      await post('/api/auth/login', { email: profile.email, password: profile.password }).expect(200);
      await agent.get('/api/auth/me').expect(200);
      await models.User.update({ arrivalStatus: 'arrived' }, { where: { id: userId } });
      assert.equal((await agent.get('/api/auth/me')).body.data.user.arrivalStatus, 'arrived');
    });
    await t.test('sesión vencida rechazada por almacenamiento SQL', async () => {
      const sessions = await models.Session.findAll();
      for (const row of sessions) if (JSON.parse(row.data).userId === userId) await row.update({ expiresAt: new Date(0) });
      await agent.get('/api/auth/me').expect(401);
    });
  } finally {
    // Solo elimina los datos que creó esta ejecución, nunca las tablas.
    if (userId) await models.User.destroy({ where: { id: userId } });
    if (content) await content.destroy(); if (draft) await draft.destroy();
    if (category) await category.destroy(); if (emptyCategory) await emptyCategory.destroy();
    if (institution) await institution.destroy();
    await db.close();
  }
});
