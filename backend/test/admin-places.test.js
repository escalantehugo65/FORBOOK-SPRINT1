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
import { up as localities } from '../migrations/004-origin-localities.js';
import { up as questions } from '../migrations/005-questions.js';
import { up as answers } from '../migrations/006-answers.js';
import { up as votes } from '../migrations/007-answer-votes.js';
import { up as moderation } from '../migrations/008-moderation.js';
import { up as places } from '../migrations/009-places.js';
import { up as groups } from '../migrations/010-groups.js';
import { up as placeAdmin } from '../migrations/011-place-admin.js';

// Lugares cargados desde la página por administración, con historial.
test('administración de lugares del mapa sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
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
  let institution;
  const placeIds = [];
  try {
    await db.authenticate();
    for (const migration of [initial, careers, resources, localities, questions, answers, votes, moderation, places, groups, placeAdmin]) await migration(db, models);
    await placeAdmin(db, models);
    institution = await models.Institution.create({ name: `Institución admin mapa ${suffix}`, sourceUrl: 'https://example.com' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const role of ['student', 'moderator', 'admin']) users[role] = await models.User.create({ name: `${role} Mapa`, email: `${role}-map-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: institution.id, career: 'Carrera', arrivalStatus: 'arrived', role });
    const app = createApp({ models, store: new MysqlSessionStore(models.Session, config.sessionTtl), config, db });
    const agents = {};
    for (const role of Object.keys(users)) {
      agents[role] = request.agent(app);
      await agents[role].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users[role].email, password: 'Una-clave-segura-123' }).expect(200);
    }
    const send = (role, method, path, data = {}) => agents[role][method](path).set('Origin', config.frontendUrl).send(data);
    const valid = { name: `Hospital de prueba ${suffix}`, kind: 'health', institutionId: null, addressLabel: 'Calle de prueba 1', studentNote: '', latitude: -26.18, longitude: -58.17, sourceType: 'official', sourceLabel: 'Ministerio de prueba', sourceUrl: 'https://example.com/hospital', reviewedAt: '2026-11-08', status: 'published' };

    await t.test('solo administración', async () => {
      await request(app).get('/api/admin/places').expect(401);
      await send('student', 'get', '/api/admin/places').expect(403);
      await send('moderator', 'post', '/api/admin/places', valid).expect(403);
    });

    let created;
    await t.test('crear con ubicación y verlo en el mapa', async () => {
      const response = await send('admin', 'post', '/api/admin/places', valid).expect(201);
      created = response.body.data; placeIds.push(created.id);
      assert.equal(created.latitude, -26.18);
      assert.equal(created.kind, 'health');
      assert.equal(created.studentNote, null);
      assert.ok(created.slug.startsWith('hospital-de-prueba'));
      const again = await send('admin', 'post', '/api/admin/places', valid).expect(201); placeIds.push(again.body.data.id);
      assert.notEqual(again.body.data.slug, created.slug);
      const map = (await send('student', 'get', `/api/places/${created.id}`).expect(200)).body.data;
      assert.deepEqual(map.location, { latitude: -26.18, longitude: -58.17 });
      const log = await models.ModerationLog.findOne({ where: { targetType: 'place', targetId: created.id, action: 'place_create' } });
      assert.ok(log && log.note.includes('con ubicación'));
    });

    await t.test('validaciones', async () => {
      const bad = async (changes, field) => { const response = await send('admin', 'post', '/api/admin/places', { ...valid, ...changes }).expect(400); assert.ok(response.body.error.fields[field], JSON.stringify(response.body)); };
      await bad({ latitude: -58.17, longitude: -26.18 }, 'latitude');
      await bad({ latitude: -26.18, longitude: null }, 'latitude');
      await bad({ latitude: '-26.18' }, 'latitude');
      await bad({ kind: 'bar' }, 'kind');
      await bad({ name: 'ab' }, 'name');
      await bad({ sourceType: 'experience' }, 'sourceType');
      await bad({ sourceUrl: 'http://example.com' }, 'sourceUrl');
      await bad({ sourceType: 'community', sourceLabel: '' }, 'sourceLabel');
      await bad({ reviewedAt: '' }, 'reviewedAt');
      await bad({ institutionId: 999999999 }, 'institutionId');
      await bad({ status: 'oculto' }, 'status');
      await send('admin', 'post', '/api/admin/places', { ...valid, extra: 1 }).expect(400);
    });

    await t.test('editar: quitar ubicación, pasar a borrador y registrar', async () => {
      const response = await send('admin', 'put', `/api/admin/places/${created.id}`, { ...valid, latitude: null, longitude: null, institutionId: institution.id, status: 'draft' }).expect(200);
      assert.equal(response.body.data.latitude, null);
      assert.equal(response.body.data.institution.id, institution.id);
      await send('student', 'get', `/api/places/${created.id}`).expect(404);
      const log = await models.ModerationLog.findOne({ where: { targetType: 'place', targetId: created.id, action: 'place_update' } });
      assert.match(log.note, /ubicación/);
      assert.equal((log.note.match(/ubicación/g) || []).length, 1);
      const before = await models.ModerationLog.count({ where: { targetId: created.id, targetType: 'place' } });
      await send('admin', 'put', `/api/admin/places/${created.id}`, { ...valid, latitude: null, longitude: null, institutionId: institution.id, status: 'draft' }).expect(200);
      assert.equal(await models.ModerationLog.count({ where: { targetId: created.id, targetType: 'place' } }), before);
      const history = (await send('admin', 'get', '/api/moderation/log').expect(200)).body.data.find(row => row.target.type === 'place' && row.target.id === created.id);
      assert.equal(history.target.title, valid.name);
      assert.ok((await send('admin', 'get', '/api/admin/places').expect(200)).body.data.some(row => row.id === created.id && row.status === 'draft'));
      await send('admin', 'put', '/api/admin/places/999999999', valid).expect(404);
    });
  } finally {
    await models.ModerationLog.destroy({ where: { targetType: 'place', targetId: placeIds } });
    await models.Place.destroy({ where: { id: placeIds } });
    await models.User.destroy({ where: { id: Object.values(users).map(user => user.id) } });
    if (institution) await institution.destroy();
    await db.close();
  }
});
