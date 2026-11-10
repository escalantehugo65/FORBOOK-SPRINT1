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

// Épicas 4 y 6 sobre MySQL real: lugares (FF-21/23), rutas (FF-22) y espacios de integración (FF-30/31).
test('lugares, rutas y espacios de integración sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  if (!process.env.TEST_DB_NAME.endsWith('_test')) throw new Error('TEST_DB_NAME debe terminar en _test.');
  const config = {
    db: { host: process.env.TEST_DB_HOST || '127.0.0.1', port: Number(process.env.TEST_DB_PORT || 3306), database: process.env.TEST_DB_NAME, username: process.env.TEST_DB_USER || 'root', password: process.env.TEST_DB_PASSWORD || '' },
    sessionSecret: 'test-only-secret-at-least-32-characters-long', sessionTtl: 3600000,
    frontendUrl: 'http://localhost:5173', production: false, trustProxy: false,
  };
  const db = createDatabase(config);
  const models = defineModels(db);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let institution, otherInstitution, user, locality;
  const created = [];
  try {
    await db.authenticate();
    for (const migration of [initial, careers, resources, localities, nationalOrigin, questions, answers, votes, moderation, places, groups, placeAdmin]) await migration(db, models);
    await places(db, models); await groups(db, models); // se pueden repetir sin romper nada
    institution = await models.Institution.create({ name: `Institución mapa ${suffix}`, sourceUrl: 'https://example.com' });
    otherInstitution = await models.Institution.create({ name: `Otra institución mapa ${suffix}`, sourceUrl: 'https://example.com' });
    const base = { sourceType: 'official', sourceLabel: 'Organismo de prueba', sourceUrl: 'https://example.com', reviewedAt: '2026-11-08', status: 'published' };
    const make = async (model, values) => { const row = await model.create(values); created.unshift(row); return row; };
    const place = values => make(models.Place, { ...base, kind: 'services', ...values });
    const located = await place({ slug: `located-${suffix}`, name: 'Lugar con ubicación', addressLabel: 'Calle de prueba 123', studentNote: 'Nota de prueba', latitude: '-26.100000', longitude: '-58.200000', institutionId: institution.id });
    const textOnly = await place({ slug: `text-${suffix}`, name: 'Lugar sin ubicación', kind: 'health', sourceType: 'community', addressLabel: 'Frente a la plaza de prueba' });
    const half = await place({ slug: `half-${suffix}`, name: 'Lugar con media coordenada', latitude: '-26.100000', institutionId: otherInstitution.id });
    const draft = await place({ slug: `draft-${suffix}`, name: 'Borrador', status: 'draft' });
    const hidden = await place({ slug: `hidden-${suffix}`, name: 'Oculto', hiddenAt: new Date() });
    const route = await make(models.TravelRoute, { ...base, sourceType: 'community', durationLabel: 'unos 20 minutos', slug: `route-${suffix}`, institutionId: institution.id, destinationPlaceId: located.id, title: 'Ruta de prueba', originLabel: 'Plaza de prueba', mode: 'walk', steps: 'Primer paso\n\n  Segundo paso  ' });
    const otherRoute = await make(models.TravelRoute, { ...base, slug: `route-other-${suffix}`, institutionId: otherInstitution.id, title: 'Ruta ajena', originLabel: 'Otra plaza', mode: 'bus', steps: 'Paso' });
    const hiddenRoute = await make(models.TravelRoute, { ...base, slug: `route-hidden-${suffix}`, institutionId: institution.id, title: 'Ruta oculta', originLabel: 'X', mode: 'bus', steps: 'Paso', hiddenAt: new Date() });
    const group = values => make(models.Group, { kind: 'general', audience: 'Prueba', summary: 'Prueba', purpose: 'Propósito de prueba', status: 'published', ...values });
    const general = await group({ slug: `general-${suffix}`, name: 'General de prueba', linkPath: '/preguntas', linkLabel: 'Ir' });
    const own = await group({ slug: `own-${suffix}`, name: 'De mi institución', kind: 'institution', institutionId: institution.id });
    const foreign = await group({ slug: `foreign-${suffix}`, name: 'De otra institución', kind: 'institution', institutionId: otherInstitution.id });
    const outside = await group({ slug: `outside-${suffix}`, name: 'De afuera', kind: 'origin', originScope: 'outside' });
    const local = await group({ slug: `local-${suffix}`, name: 'De la provincia', kind: 'origin', originScope: 'formosa' });
    const arrived = await group({ slug: `arrived-${suffix}`, name: 'Ya llegaron', kind: 'arrival', arrivalScope: 'arrived' });
    const notArrived = await group({ slug: `not-arrived-${suffix}`, name: 'Todavía no llegaron', kind: 'arrival', arrivalScope: 'not_arrived' });
    const hiddenGroup = await group({ slug: `hidden-group-${suffix}`, name: 'Oculto', hiddenAt: new Date() });
    // Sin localidad de Formosa en el perfil: cuenta como "de afuera".
    user = await models.User.create({ name: 'Mapa Prueba', email: `map-${suffix}@example.com`, passwordHash: await bcrypt.hash('Una-clave-segura-123', 4), origin: 'Corrientes', institutionId: institution.id, career: 'Carrera de prueba', arrivalStatus: 'not_arrived' });
    const app = createApp({ models, store: new MysqlSessionStore(models.Session, config.sessionTtl), config, db });
    const agent = request.agent(app);

    await t.test('todo es privado', async () => {
      for (const path of ['/api/places', `/api/places/${located.id}`, '/api/routes', `/api/routes/${route.id}`, '/api/groups', `/api/groups/${general.id}`]) await request(app).get(path).expect(401);
    });
    await agent.post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: user.email, password: 'Una-clave-segura-123' }).expect(200);
    const ids = rows => rows.map(row => row.id);
    const ours = (rows, list) => rows.filter(row => list.some(item => item.id === row.id));

    await t.test('FF-21: lugares con y sin ubicación, sin romper', async () => {
      const response = await agent.get('/api/places').expect(200);
      const rows = ours(response.body.data, [located, textOnly, half, draft, hidden]);
      const byId = Object.fromEntries(rows.map(row => [row.id, row]));
      assert.deepEqual(ids(rows).sort(), [located.id, textOnly.id, half.id].sort());
      assert.deepEqual(byId[located.id].location, { latitude: -26.1, longitude: -58.2 });
      assert.equal(byId[textOnly.id].location, null);
      assert.equal(byId[half.id].location, null);
      assert.ok(!('latitude' in byId[located.id]) && !('status' in byId[located.id]));
      assert.equal(response.body.meta.total, response.body.data.length);
      assert.ok(response.body.meta.institutions.some(item => item.id === institution.id));
      assert.equal((await agent.get(`/api/places/${textOnly.id}`).expect(200)).body.data.addressLabel, 'Frente a la plaza de prueba');
      for (const row of [draft, hidden]) await agent.get(`/api/places/${row.id}`).expect(404);
      await agent.get('/api/places/abc').expect(400);
    });

    await t.test('FF-23: filtros por tipo e institución, nota y fuente', async () => {
      const health = (await agent.get('/api/places?kind=health').expect(200)).body.data;
      assert.ok(health.every(row => row.kind === 'health'));
      assert.equal(ours(health, [textOnly])[0].sourceType, 'community');
      const byInstitution = (await agent.get(`/api/places?institutionId=${institution.id}`).expect(200)).body.data;
      assert.deepEqual(ids(byInstitution), [located.id]);
      assert.equal(byInstitution[0].studentNote, 'Nota de prueba');
      assert.equal(byInstitution[0].institution.id, institution.id);
      await agent.get('/api/places?kind=bar').expect(400);
      await agent.get('/api/places?institutionId=0').expect(400);
      await agent.get('/api/places?orden=1').expect(400);
    });

    await t.test('FF-22: rutas de la institución con pasos, fuente y destino', async () => {
      const list = await agent.get('/api/routes').expect(200);
      assert.equal(list.body.meta.institution.id, institution.id);
      assert.deepEqual(ids(list.body.data), [route.id]);
      assert.ok(!('steps' in list.body.data[0]));
      assert.deepEqual(ids((await agent.get(`/api/routes?institutionId=${otherInstitution.id}`).expect(200)).body.data), [otherRoute.id]);
      const detail = (await agent.get(`/api/routes/${route.id}`).expect(200)).body.data;
      assert.deepEqual(detail.steps, ['Primer paso', 'Segundo paso']);
      assert.equal(detail.durationLabel, 'unos 20 minutos');
      assert.equal(detail.sourceType, 'community');
      assert.equal(detail.reviewedAt, '2026-11-08');
      assert.deepEqual(detail.destination.location, { latitude: -26.1, longitude: -58.2 });
      await agent.get(`/api/routes/${hiddenRoute.id}`).expect(404);
      await agent.get('/api/routes?institutionId=999999999').expect(404);
    });

    await t.test('FF-30: sugerencias por institución, procedencia y llegada', async () => {
      const { specific, general: generals } = (await agent.get('/api/groups').expect(200)).body.data;
      assert.deepEqual(ids(ours(specific, created)).sort(), [own.id, outside.id, notArrived.id].sort());
      assert.deepEqual(ids(ours(generals, created)), [general.id]);
      assert.deepEqual(ours(specific, [own])[0].reasons, ['institution']);
      assert.ok(!ours([...specific, ...generals], [foreign, local, arrived, hiddenGroup]).length);
      locality = await models.Locality.create({ id: '34999993', name: 'Localidad de prueba mapa', provinceCode: '34', departmentCode: '34999', departmentName: 'Pruebas', sourceUrl: 'https://example.com', reviewedAt: '2026-11-08' });
    await user.update({ arrivalStatus: 'arrived', originLocalityId: locality.id });
      const after = (await agent.get('/api/groups').expect(200)).body.data.specific;
      assert.deepEqual(ids(ours(after, created)).sort(), [own.id, local.id, arrived.id].sort());
    });

    await t.test('procedencia nacional: otra provincia no se considera Formosa', async () => {
      const chaco = await models.Locality.create({id:'22999994',name:'Localidad de prueba Chaco',provinceCode:'22',provinceName:'Chaco',departmentCode:'22999',departmentName:'Pruebas',sourceUrl:'https://example.com',reviewedAt:'2026-11-10'});
      try {
        await user.update({originCountryCode:'AR',originLocalityId:chaco.id});
        const national = (await agent.get('/api/groups').expect(200)).body.data.specific;
        assert.ok(national.some(item=>item.id===outside.id));
        assert.ok(!national.some(item=>item.id===local.id));
        await user.update({originCountryCode:'PY',originLocalityId:null});
        const abroad = (await agent.get('/api/groups').expect(200)).body.data.specific;
        assert.ok(abroad.some(item=>item.id===outside.id));
        assert.ok(!abroad.some(item=>item.id===local.id));
      } finally { await user.update({originCountryCode:'AR',originLocalityId:locality.id}); await chaco.destroy(); }
    });
    await t.test('FF-31: detalle con propósito, sin membresía simulada', async () => {
      const detail = (await agent.get(`/api/groups/${general.id}`).expect(200)).body.data;
      assert.equal(detail.purpose, 'Propósito de prueba');
      assert.equal(detail.linkPath, '/preguntas');
      assert.ok(!('members' in detail) && !('joined' in detail));
      await agent.get(`/api/groups/${foreign.id}`).expect(200);
      await agent.get(`/api/groups/${hiddenGroup.id}`).expect(404);
    });
  } finally {
    for (const row of created) await row.destroy();
    if (user) await user.destroy();
    if (locality) await locality.destroy();
    if (institution) await institution.destroy();
    if (otherInstitution) await otherInstitution.destroy();
    await db.close();
  }
});
