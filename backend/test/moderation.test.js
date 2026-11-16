import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Answer } from '../src/models/answer.model.js';
import { Category } from '../src/models/category.model.js';
import { Content } from '../src/models/content.model.js';
import { Institution } from '../src/models/institution.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { Question } from '../src/models/question.model.js';
import { Report } from '../src/models/report.model.js';
import { User } from '../src/models/user.model.js';
import { runMigrations } from '../migrations/runner.js';
import { app } from '../app.js';

// Épica 7 sobre MySQL real: reportes, permisos por rol, resolución, historial y catálogo.
test('moderación FF-34 a FF-39 sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const users = {};
  let institution, category, content;
  try {
    await sequelize.authenticate();
    await runMigrations();
    institution = await Institution.create({ name: `Institución moderación ${suffix}`, sourceUrl: 'https://example.com' });
    category = await Category.create({ name: `Moderación ${suffix}`, slug: `mod-${suffix}`, description: 'Datos ficticios exclusivos para pruebas' });
    content = await Content.create({ slug: `mod-content-${suffix}`, title: 'Ficha de prueba', summary: 'Dato ficticio', body: 'No es información real.', categoryId: category.id, sourceType: 'official', sourceLabel: 'Organismo de prueba', sourceUrl: 'https://example.com', reviewedAt: '2026-10-20', status: 'published' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const [key, role] of [['author', 'student'], ['reader', 'student'], ['moderator', 'moderator'], ['admin', 'admin']]) {
      users[key] = await User.create({ name: `${key} Prueba`, email: `${key}-${suffix}@example.com`, passwordHash, origin: 'Pruebas, Formosa', institutionId: institution.id, career: 'Carrera de prueba', arrivalStatus: 'arrived', role });
    }
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
      assert.equal(await Report.count({ where: { reporterId: users.reader.id } }), 2);
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
      assert.ok((await Answer.findByPk(answer.id)).hiddenAt);
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
      await ModerationLog.destroy({ where: { moderatorId: ids } });
      await Report.destroy({ where: { reporterId: ids } });
      await Question.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
    }
    if (content) await content.destroy();
    if (category) await category.destroy();
    if (institution) await institution.destroy();
    await sequelize.close();
  }
});
