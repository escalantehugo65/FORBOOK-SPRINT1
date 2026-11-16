import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Institution } from '../src/models/institution.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { Place } from '../src/models/place.model.js';
import { User } from '../src/models/user.model.js';
import { runMigrations } from '../migrations/runner.js';
import { up as placeAdmin } from '../migrations/011-place-admin.js';
import { app } from '../app.js';

// Lugares cargados desde la página por administración, con historial.
test('administración de lugares del mapa sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const users = {};
  let institution;
  const placeIds = [];
  try {
    await sequelize.authenticate();
    await runMigrations();
    await placeAdmin();
    institution = await Institution.create({ name: `Institución admin mapa ${suffix}`, sourceUrl: 'https://example.com' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const role of ['student', 'moderator', 'admin']) users[role] = await User.create({ name: `${role} Mapa`, email: `${role}-map-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: institution.id, career: 'Carrera', arrivalStatus: 'arrived', role });
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
      const log = await ModerationLog.findOne({ where: { targetType: 'place', targetId: created.id, action: 'place_create' } });
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
      const log = await ModerationLog.findOne({ where: { targetType: 'place', targetId: created.id, action: 'place_update' } });
      assert.match(log.note, /ubicación/);
      assert.equal((log.note.match(/ubicación/g) || []).length, 1);
      const before = await ModerationLog.count({ where: { targetId: created.id, targetType: 'place' } });
      await send('admin', 'put', `/api/admin/places/${created.id}`, { ...valid, latitude: null, longitude: null, institutionId: institution.id, status: 'draft' }).expect(200);
      assert.equal(await ModerationLog.count({ where: { targetId: created.id, targetType: 'place' } }), before);
      const history = (await send('admin', 'get', '/api/moderation/log').expect(200)).body.data.find(row => row.target.type === 'place' && row.target.id === created.id);
      assert.equal(history.target.title, valid.name);
      assert.ok((await send('admin', 'get', '/api/admin/places').expect(200)).body.data.some(row => row.id === created.id && row.status === 'draft'));
      await send('admin', 'put', '/api/admin/places/999999999', valid).expect(404);
    });
  } finally {
    await ModerationLog.destroy({ where: { targetType: 'place', targetId: placeIds } });
    await Place.destroy({ where: { id: placeIds } });
    await User.destroy({ where: { id: Object.values(users).map(user => user.id) } });
    if (institution) await institution.destroy();
    await sequelize.close();
  }
});
