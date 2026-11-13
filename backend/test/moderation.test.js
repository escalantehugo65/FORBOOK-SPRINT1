import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { MysqlSessionStore } from '../src/config/sessionStore.js';
import { createApp } from '../src/app.js';
import { up as initial } from '../migrations/001-initial.js';
import { up as careers } from '../migrations/002-careers.js';
import { up as resources } from '../migrations/003-institution-resources.js';
import { up as nationalOrigin } from '../migrations/005-national-origin.js';
import { up as localities } from '../migrations/004-origin-localities.js';
import { up as questions } from '../migrations/005-questions.js';
import { up as answers } from '../migrations/006-answers.js';
import { up as votes } from '../migrations/007-answer-votes.js';
import { up as moderation } from '../migrations/008-moderation.js';
import { up as places } from '../migrations/009-places.js';
import { up as groups } from '../migrations/010-groups.js';
import { up as placeAdmin } from '../migrations/011-place-admin.js';

// Épica 7 sobre MySQL real: reportes, permisos por rol, resolución, historial y catálogo.
test('moderación FF-34 a FF-39 sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  if (!process.env.TEST_DB_NAME.endsWith('_test')) throw new Error('TEST_DB_NAME debe terminar en _test.');
  const config = {
    db: { host: process.env.TEST_DB_HOST || '127.0.0.1', port: Number(process.env.TEST_DB_PORT || 3306), database: process.env.TEST_DB_NAME, username: process.env.TEST_DB_USER || 'root', password: process.env.TEST_DB_PASSWORD || '' },
    sessionSecret: 'test-only-secret-at-least-32-characters-long', sessionTtl: 3600000,
    frontendUrl: 'http://localhost:5173', production: false, trustProxy: false,
  };
  const db = createDatabase(config);
  const models = defineModels(db);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const users = {};
  let institution, category, content;
  try {
    await db.authenticate();
    for (const migration of [initial, careers, resources, localities, nationalOrigin, questions, answers, votes, moderation, places, groups, placeAdmin]) await migration(db, models);
    institution = await models.Institution.create({ name: `Institución moderación ${suffix}`, sourceUrl: 'https://example.com' });
    category = await models.Category.create({ name: `Moderación ${suffix}`, slug: `mod-${suffix}`, description: 'Datos ficticios exclusivos para pruebas' });
    content = await models.Content.create({ slug: `mod-content-${suffix}`, title: 'Ficha de prueba', summary: 'Dato ficticio', body: 'No es información real.', categoryId: category.id, sourceType: 'official', sourceLabel: 'Organismo de prueba', sourceUrl: 'https://example.com', reviewedAt: '2026-10-20', status: 'published' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const [key, role] of [['author', 'student'], ['reader', 'student'], ['moderator', 'moderator'], ['admin', 'admin']]) {
      users[key] = await models.User.create({ name: `${key} Prueba`, email: `${key}-${suffix}@example.com`, passwordHash, origin: 'Pruebas, Formosa', institutionId: institution.id, career: 'Carrera de prueba', arrivalStatus: 'arrived', role });
    }
    const app = createApp({ models, store: new MysqlSessionStore(models.Session, config.sessionTtl), config, db });
    const agents = {};
    for (const key of Object.keys(users)) {
      agents[key] = request.agent(app);
      await agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users[key].email, password: 'Una-clave-segura-123' }).expect(200);
    }
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);
    const question = (await send('author', 'post', '/api/questions', { title: '¿Dónde saco la SUBE en Formosa?', categoryId: category.id }).expect(201)).body.data;
    const answer = (await send('author', 'post', `/api/questions/${question.id}/answers`, { body: 'Respuesta engañosa de prueba.' }).expect(201)).body.data.answer;

    await t.test('FF-34 y FF-35: reportar sin borrar nada', async () => {
      await request(app).post('/api/reports').set('Origin', config.frontendUrl).send({ targetType: 'answer', targetId: answer.id, reason: 'false' }).expect(401);
      await send('author', 'post', '/api/reports', { targetType: 'answer', targetId: answer.id, reason: 'false' }).expect(400);
      await send('reader', 'post', '/api/reports', { targetType: 'answer', targetId: answer.id, reason: 'outdated' }).expect(400);
      const created = await send('reader', 'post', '/api/reports', { targetType: 'answer', targetId: answer.id, reason: 'false', details: 'Es falsa.' }).expect(201);
      assert.deepEqual(Object.keys(created.body.data), ['message']);
      await send('reader', 'post', '/api/reports', { targetType: 'answer', targetId: answer.id, reason: 'false' }).expect(200);
      await send('reader', 'post', '/api/reports', { targetType: 'content', targetId: content.id, reason: 'outdated' }).expect(201);
      assert.equal(await models.Report.count({ where: { reporterId: users.reader.id } }), 2);
      const detail = await send('reader', 'get', `/api/contents/${content.id}`).expect(200);
      assert.equal(detail.body.data.reviewedAt, '2026-10-20');
      assert.equal((await send('reader', 'get', `/api/questions/${question.id}`).expect(200)).body.data.answers.length, 1);
    });

    let reportId;
    await t.test('FF-36: solo moderación ve la cola, sin correos', async () => {
      await send('reader', 'get', '/api/moderation/reports').expect(403);
      const queue = await send('moderator', 'get', '/api/moderation/reports').expect(200);
      const mine = queue.body.data.filter(row => row.target.type === 'answer' && row.target.id === answer.id);
      assert.equal(mine.length, 1);
      assert.equal(mine[0].reporter.name, 'reader Prueba');
      assert.ok(!JSON.stringify(queue.body).includes('@example.com'));
      reportId = mine[0].id;
      await send('moderator', 'get', '/api/moderation/reports?status=otro').expect(400);
    });

    await t.test('FF-37: decisión con motivo, ocultar sin borrar y no resolver dos veces', async () => {
      await send('reader', 'post', `/api/moderation/reports/${reportId}/resolve`, { decision: 'hide', note: 'Motivo de prueba' }).expect(403);
      await send('moderator', 'post', `/api/moderation/reports/${reportId}/resolve`, { decision: 'hide' }).expect(400);
      await send('moderator', 'post', `/api/moderation/reports/${reportId}/resolve`, { decision: 'close', note: 'Motivo de prueba' }).expect(400);
      const done = await send('moderator', 'post', `/api/moderation/reports/${reportId}/resolve`, { decision: 'hide', note: 'Motivo de prueba' }).expect(200);
      assert.equal(done.body.data.status, 'actioned');
      await send('moderator', 'post', `/api/moderation/reports/${reportId}/resolve`, { decision: 'hide', note: 'Motivo de prueba' }).expect(409);
      assert.equal((await send('reader', 'get', `/api/questions/${question.id}`).expect(200)).body.data.answers.length, 0);
      assert.ok((await models.Answer.findByPk(answer.id)).hiddenAt);
      await send('reader', 'put', `/api/answers/${answer.id}/helpful`).expect(404);
    });

    await t.test('FF-38: historial solo para administración', async () => {
      await send('moderator', 'get', '/api/moderation/log').expect(403);
      const log = await send('admin', 'get', '/api/moderation/log').expect(200);
      const entry = log.body.data.find(row => row.reportId === reportId);
      assert.equal(entry.action, 'hide');
      assert.equal(entry.note, 'Motivo de prueba');
    });

    await t.test('FF-39: categorías y fuentes con validación', async () => {
      await send('moderator', 'get', '/api/admin/categories').expect(403);
      await send('admin', 'delete', `/api/admin/categories/${category.id}`).expect(409);
      const created = await send('admin', 'post', '/api/admin/categories', { name: `Nueva ${suffix}`, description: 'Categoría creada en una prueba.' }).expect(201);
      await send('admin', 'post', '/api/admin/categories', { name: `nueva ${suffix}`, description: 'Duplicada en una prueba.' }).expect(409);
      await send('admin', 'delete', `/api/admin/categories/${created.body.data.id}`).expect(200);
      await send('admin', 'put', `/api/admin/contents/${content.id}/source`, { sourceType: 'official', sourceLabel: 'Organismo de prueba' }).expect(400);
      await send('admin', 'put', `/api/admin/contents/${content.id}/source`, { sourceType: 'experience', authorLabel: 'Estudiante de prueba', reviewedAt: '2026-10-21' }).expect(200);
      const actions = (await send('admin', 'get', '/api/moderation/log').expect(200)).body.data.map(row => row.action);
      for (const action of ['category_create', 'category_delete', 'source_update']) assert.ok(actions.includes(action));
    });
  } finally {
    // Solo elimina los datos que creó esta ejecución, nunca las tablas.
    const ids = Object.values(users).map(user => user.id);
    if (ids.length) {
      await models.ModerationLog.destroy({ where: { moderatorId: ids } });
      await models.Report.destroy({ where: { reporterId: ids } });
      await models.Question.destroy({ where: { userId: ids } });
      await models.User.destroy({ where: { id: ids } });
    }
    if (content) await content.destroy();
    if (category) await category.destroy();
    if (institution) await institution.destroy();
    await db.close();
  }
});
