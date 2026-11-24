import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Institution } from '../src/models/institution.model.js';
import { Category } from '../src/models/category.model.js';
import { Content } from '../src/models/content.model.js';
import { User } from '../src/models/user.model.js';
import { Question } from '../src/models/question.model.js';
import { Answer } from '../src/models/answer.model.js';
import { Place } from '../src/models/place.model.js';
import { TravelRoute } from '../src/models/travel_route.model.js';
import { RouteStop } from '../src/models/route_stop.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { runMigrations } from '../migrations/runner.js';
import { app } from '../app.js';

// Búsqueda (fichas, preguntas y perfiles), pregunta relevante del inicio (FF-15), filtro por institución (FF-18)
// y administración de fichas y rutas (FF-22) sobre MySQL.
test('búsqueda, inicio y administración de fichas y rutas sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tag = suffix.replace(/[^a-z0-9]/g, '').slice(-8);
  const institutions = [];
  const users = {};
  let category, place;
  try {
    await sequelize.authenticate();
    await runMigrations();
    for (const name of [`Instituto A ${suffix}`, `Instituto B ${suffix}`]) institutions.push(await Institution.create({ name, sourceUrl: 'https://example.com' }));
    const [mine, other] = institutions;
    category = await Category.create({ name: `Búsqueda ${suffix}`, slug: `search-${suffix}`, description: 'Datos ficticios para pruebas' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const [key, role, institution, name] of [['zoe', 'student', mine, `Zoe Quirós ${tag}`], ['zara', 'student', other, `Zara Quiroga ${tag}`], ['admin', 'admin', mine, `Admin Búsqueda ${tag}`]]) {
      users[key] = await User.create({ name, email: `${key}-search-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: institution.id, career: 'Carrera de prueba', arrivalStatus: 'arrived', role });
    }
    const agents = {};
    for (const key of Object.keys(users)) {
      agents[key] = request.agent(app);
      await agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users[key].email, password: 'Una-clave-segura-123' }).expect(200);
    }
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);
    const base = { categoryId: category.id, sourceType: 'experience', authorLabel: 'Pruebas', status: 'published', body: 'Texto de prueba.' };
    const general = await Content.create({ ...base, slug: `g-${suffix}`, title: `Trámite general ${tag}`, summary: 'Descuento del 100% para estudiantes' });
    const similar = await Content.create({ ...base, slug: `s-${suffix}`, title: `Otra ficha ${tag}`, summary: 'Hay 1000 cupos' });
    const ownInstitution = await Content.create({ ...base, slug: `m-${suffix}`, title: `Ficha de mi instituto ${tag}`, summary: 'Solo para el instituto A', institutionId: mine.id });
    await Content.create({ ...base, slug: `o-${suffix}`, title: `Ficha del otro instituto ${tag}`, summary: 'Solo para el instituto B', institutionId: other.id });
    await Content.create({ ...base, slug: `d-${suffix}`, title: `Borrador oculto ${tag}`, summary: 'No se publica', status: 'draft' });

    await t.test('buscar fichas: sin tildes, sin comodines y sin las de otra institución', async () => {
      const titles = async query => (await send('zoe', 'get', `/api/contents?${query}`).expect(200)).body.data.map(row => row.title);
      assert.deepEqual(await titles(`search=${encodeURIComponent(`tramite general ${tag}`)}`), [general.title]);
      assert.deepEqual(await titles(`search=${encodeURIComponent('100%')}&categoryId=${category.id}`), [general.title]);
      assert.ok(!(await titles(`search=${tag}`)).some(title => title.includes('otro instituto') || title.includes('Borrador')));
      assert.equal((await titles(`search=${tag}`)).length, 3);
      await send('zoe', 'get', '/api/contents?search=a').expect(400);
      assert.ok((await titles(`search=${encodeURIComponent('1000 cupos')}`)).includes(similar.title));
    });

    await t.test('FF-18: generales o de mi institución, nunca de otra', async () => {
      const ids = async query => (await send('zoe', 'get', `/api/contents?categoryId=${category.id}&${query}`).expect(200)).body.data.map(row => row.id);
      assert.deepEqual(new Set(await ids('scope=institution')), new Set([ownInstitution.id]));
      assert.deepEqual(new Set(await ids('scope=general')), new Set([general.id, similar.id]));
      assert.equal((await ids(`institutionId=${other.id}`)).length, 0);
      assert.equal((await send('zara', 'get', `/api/contents?categoryId=${category.id}&scope=institution`).expect(200)).body.data[0].title, `Ficha del otro instituto ${tag}`);
      await send('zoe', 'get', '/api/contents?scope=todas').expect(400);
    });

    await t.test('buscar preguntas y FF-15: pregunta relevante para el inicio', async () => {
      const ask = (key, title, forMyInstitution) => send(key, 'post', '/api/questions', { title, categoryId: category.id, forMyInstitution }).expect(201).then(response => response.body.data);
      assert.notEqual((await send('zoe', 'get', '/api/questions/relevant').expect(200)).body.meta.reason, 'institution', 'su institución todavía no tiene preguntas');
      const questions = {
        zaraGeneral: await ask('zara', `¿Pregunta general de Zara ${tag}?`, false),
        zoeGeneral: await ask('zoe', `¿Pregunta general de Zoe ${tag}?`, false),
        mineOlder: await ask('admin', `¿Primera pregunta del instituto A ${tag}?`, true),
        mineNewer: await ask('admin', `¿Segunda pregunta del instituto A ${tag}?`, true),
        zoeOwn: await ask('zoe', `¿Pregunta propia de Zoe del instituto A ${tag}?`, true),
      };
      const relevantFor = async key => (await send(key, 'get', '/api/questions/relevant').expect(200)).body;
      let relevant = await relevantFor('zoe');
      assert.equal(relevant.meta.reason, 'institution');
      assert.equal(relevant.data.id, questions.mineNewer.id, 'sin respondidas, la abierta más nueva de su institución que no es propia');
      await send('zara', 'post', `/api/questions/${questions.mineOlder.id}/answers`, { body: 'Respuesta para resolver la duda.' }).expect(201);
      relevant = await relevantFor('zoe');
      assert.equal(relevant.data.id, questions.mineOlder.id, 'prioriza la ya respondida de su institución');
      assert.equal(relevant.data.status, 'answered');
      assert.equal(relevant.data.answersCount, 1);
      assert.equal(relevant.data.author.name, 'Admin');
      assert.equal(relevant.data.author.email, undefined);
      // Su institución no tiene preguntas: recibe una general y nunca la propia.
      const forZara = await relevantFor('zara');
      assert.equal(forZara.meta.reason, 'general');
      assert.notEqual(forZara.data.author.id, users.zara.id);
      await send('zoe', 'get', '/api/questions/relevant?x=1').expect(400);
      const found = (await send('zoe', 'get', `/api/questions?search=${encodeURIComponent(`instituto A ${tag}`)}`).expect(200)).body.data.map(row => row.id);
      assert.deepEqual(new Set(found), new Set([questions.mineOlder.id, questions.mineNewer.id, questions.zoeOwn.id]));
      const underscore = (await send('zoe', 'get', `/api/questions?search=${encodeURIComponent('_e Zoe')}`).expect(200)).body.data;
      assert.equal(underscore.length, 0, 'el guion bajo no funciona como comodín');
    });

    await t.test('buscar perfiles: solo datos públicos', async () => {
      await request(app).get(`/api/users?search=${tag}`).expect(401);
      await send('zoe', 'get', '/api/users').expect(400);
      await send('zoe', 'get', '/api/users?search=z').expect(400);
      await send('zoe', 'get', `/api/users?search=${tag}&role=admin`).expect(400);
      const names = async text => (await send('zoe', 'get', `/api/users?search=${encodeURIComponent(text)}`).expect(200)).body.data.filter(row => row.name.endsWith(tag)).map(row => row.name);
      assert.deepEqual(await names('quiros'), [`Zoe Quirós ${tag}`], 'sin tildes ni mayúsculas');
      assert.deepEqual(await names('QUIROGA'), [`Zara Quiroga ${tag}`]);
      assert.deepEqual(await names(`Quir`), [`Zara Quiroga ${tag}`, `Zoe Quirós ${tag}`], 'ordenados por nombre');
      const [person] = (await send('zoe', 'get', `/api/users?search=${encodeURIComponent(`Zara Quiroga ${tag}`)}`).expect(200)).body.data;
      assert.deepEqual(Object.keys(person).sort(), ['avatarColor', 'avatarVersion', 'career', 'decorations', 'id', 'institution', 'level', 'name', 'relation']);
      assert.equal(person.institution.name, other.name);
      assert.equal(person.level, 'nuevo');
      assert.deepEqual(person.decorations, { frame: null, banner: null, effect: null, nameColor: null });
    });

    let contentId;
    await t.test('administración de fichas completas', async () => {
      const valid = { title: `Ficha nueva ${tag}`, summary: 'Resumen de la ficha nueva.', body: 'Primer párrafo de la ficha.\n\nSegundo párrafo con más datos.', categoryId: category.id, institutionId: null, status: 'published', sourceType: 'official', sourceLabel: 'Organismo de prueba', sourceUrl: 'https://example.com/ficha', reviewedAt: '2026-11-10' };
      await send('zoe', 'post', '/api/admin/contents', valid).expect(403);
      const bad = async (changes, field) => assert.ok((await send('admin', 'post', '/api/admin/contents', { ...valid, ...changes }).expect(400)).body.error.fields[field], field);
      await bad({ title: 'Hola' }, 'title');
      await bad({ body: 'corto' }, 'body');
      await bad({ sourceUrl: '' }, 'sourceUrl');
      await bad({ sourceType: 'experience', authorLabel: '' }, 'authorLabel');
      await bad({ categoryId: 999999999 }, 'categoryId');
      await bad({ institutionId: 999999999 }, 'institutionId');
      await bad({ reviewedAt: '2099-01-01' }, 'reviewedAt');
      await send('admin', 'post', '/api/admin/contents', { ...valid, slug: 'otra' }).expect(400);
      const created = (await send('admin', 'post', '/api/admin/contents', valid).expect(201)).body.data;
      contentId = created.id;
      assert.ok(created.slug.startsWith('ficha-nueva'));
      assert.equal(created.body, valid.body);
      assert.equal((await send('zoe', 'get', `/api/contents/${created.id}`).expect(200)).body.data.title, valid.title);
      const draft = (await send('admin', 'put', `/api/admin/contents/${created.id}`, { ...valid, status: 'draft', institutionId: mine.id }).expect(200)).body.data;
      assert.equal(draft.status, 'draft');
      await send('zoe', 'get', `/api/contents/${created.id}`).expect(404);
      assert.equal((await send('admin', 'get', `/api/admin/contents/${created.id}`).expect(200)).body.data.body, valid.body);
      const log = await ModerationLog.findOne({ where: { action: 'content_update', targetId: created.id } });
      assert.match(log.note, /estado/);
      assert.match(log.note, /institución/);
      const before = await ModerationLog.count({ where: { targetType: 'content', targetId: created.id } });
      await send('admin', 'put', `/api/admin/contents/${created.id}`, { ...valid, status: 'draft', institutionId: mine.id }).expect(200);
      assert.equal(await ModerationLog.count({ where: { targetType: 'content', targetId: created.id } }), before, 'sin cambios no registra');
      await send('admin', 'put', '/api/admin/contents/999999999', valid).expect(404);
    });

    let routeId;
    await t.test('FF-22: administración de rutas orientativas', async () => {
      place = await Place.create({ slug: `route-place-${suffix}`, name: 'Destino de prueba', kind: 'institution', institutionId: mine.id, addressLabel: 'Calle de prueba 1', sourceType: 'official', sourceUrl: 'https://example.com', reviewedAt: '2026-11-08', status: 'published', latitude: -26.18, longitude: -58.17 });
      const valid = { title: `Desde la terminal ${tag}`, institutionId: mine.id, destinationPlaceId: place.id, originLabel: 'Terminal de ómnibus', mode: 'bus', steps: 'Salí por la puerta principal.\r\n\r\n  Tomá el colectivo en la parada de enfrente.  \nBajate frente al instituto.', durationLabel: 'unos 25 minutos', status: 'published', sourceType: 'community', sourceLabel: 'Recorrido hecho por el equipo', sourceUrl: '', reviewedAt: '2026-11-10' };
      await send('zoe', 'post', '/api/admin/routes', valid).expect(403);
      const bad = async (changes, field) => assert.ok((await send('admin', 'post', '/api/admin/routes', { ...valid, ...changes }).expect(400)).body.error.fields[field], field);
      await bad({ steps: '\n \n' }, 'steps');
      await bad({ steps: Array.from({ length: 21 }, (_, index) => `Paso ${index + 1}`).join('\n') }, 'steps');
      await bad({ steps: 'x'.repeat(301) }, 'steps');
      await bad({ reviewedAt: '' }, 'reviewedAt');
      await bad({ sourceLabel: '' }, 'sourceLabel');
      await bad({ mode: 'avion' }, 'mode');
      await bad({ institutionId: 999999999 }, 'institutionId');
      await bad({ destinationPlaceId: 999999999 }, 'destinationPlaceId');
      await bad({ sourceType: 'experience' }, 'sourceType');
      const created = (await send('admin', 'post', '/api/admin/routes', valid).expect(201)).body.data;
      routeId = created.id;
      assert.equal(created.steps, 'Salí por la puerta principal.\nTomá el colectivo en la parada de enfrente.\nBajate frente al instituto.');
      const list = (await send('zoe', 'get', '/api/routes').expect(200)).body.data;
      assert.equal(list.find(route => route.id === created.id).stopsCount, 0);
      const detail = (await send('zoe', 'get', `/api/routes/${created.id}`).expect(200)).body.data;
      assert.equal(detail.steps.length, 3);
      assert.equal(detail.destination.name, 'Destino de prueba');
      assert.equal(detail.sourceType, 'community');
      await send('zara', 'get', '/api/routes').expect(200).then(response => assert.ok(!response.body.data.some(route => route.id === created.id)));
      await send('admin', 'put', `/api/admin/routes/${created.id}`, { ...valid, status: 'draft' }).expect(200);
      await send('zoe', 'get', `/api/routes/${created.id}`).expect(404);
      assert.ok((await send('admin', 'get', '/api/admin/routes').expect(200)).body.data.some(route => route.id === created.id && route.status === 'draft'));
      const history = (await send('admin', 'get', '/api/moderation/log').expect(200)).body.data.find(row => row.target.type === 'route' && row.target.id === created.id);
      assert.equal(history.target.title, valid.title);
      await send('admin', 'put', '/api/admin/routes/999999999', valid).expect(404);
    });

    let stopsRouteId;
    await t.test('FF-22: paradas de una ruta (colectivo del IPF)', async () => {
      const stops = [
        { name: '  Plaza San Martín ', reference: 'Frente al Correo Argentino', latitude: -26.186308, longitude: -58.173568 },
        { name: 'La Virgen', reference: '', latitude: -26.155857478439273, longitude: -58.18570582851414 },
      ];
      const valid = { title: `Colectivo de prueba ${tag}`, institutionId: mine.id, destinationPlaceId: null, originLabel: 'Plaza San Martín', mode: 'bus', steps: 'Sale a las 8:00.', durationLabel: null, status: 'published', sourceType: 'community', sourceLabel: 'Comprobado por un estudiante', sourceUrl: '', reviewedAt: '2026-11-16', stops };
      const bad = async (changes, message) => {
        const { fields } = (await send('admin', 'post', '/api/admin/routes', { ...valid, ...changes }).expect(400)).body.error;
        assert.match(fields.stops, message);
      };
      await bad({ stops: 'Plaza' }, /hasta 30/);
      await bad({ stops: Array.from({ length: 31 }, () => stops[1]) }, /hasta 30/);
      await bad({ stops: [stops[0], { ...stops[1], name: 'x' }] }, /^Parada 2: el nombre/);
      await bad({ stops: [{ ...stops[0], latitude: '-26.1' }] }, /latitud/);
      await bad({ stops: [{ ...stops[0], longitude: undefined }] }, /latitud/);
      await bad({ stops: [{ ...stops[0], latitude: -58.173568, longitude: -26.186308 }] }, /fuera de la provincia/);
      await bad({ stops: [{ ...stops[0], color: 'rojo' }] }, /no permitidos/);
      await bad({ stops: [null] }, /formato/);
      await bad({ stops: [{ ...stops[0], reference: 'x'.repeat(251) }] }, /referencia/);
      const created = (await send('admin', 'post', '/api/admin/routes', valid).expect(201)).body.data;
      stopsRouteId = created.id;
      assert.deepEqual(created.stops.map(({ id, ...stop }) => stop), [
        { name: 'Plaza San Martín', reference: 'Frente al Correo Argentino', latitude: -26.186308, longitude: -58.173568 },
        { name: 'La Virgen', reference: null, latitude: -26.155857, longitude: -58.185706 },
      ], 'se guardan limpias, en orden y con 6 decimales');
      const detail = (await send('zoe', 'get', `/api/routes/${created.id}`).expect(200)).body.data;
      assert.deepEqual(detail.stops.map(stop => stop.name), ['Plaza San Martín', 'La Virgen']);
      assert.equal(typeof detail.stops[0].latitude, 'number');
      assert.equal(detail.destination, null);
      assert.equal((await send('zoe', 'get', '/api/routes').expect(200)).body.data.find(route => route.id === created.id).stopsCount, 2);
      assert.match((await ModerationLog.findOne({ where: { action: 'route_create', targetId: created.id } })).note, /con 2 paradas/);

      // Sin "stops" se conservan; con la misma lista no se registra nada; una lista nueva las reemplaza en ese orden.
      const { stops: _omit, ...withoutStops } = valid;
      assert.equal((await send('admin', 'put', `/api/admin/routes/${created.id}`, withoutStops).expect(200)).body.data.stops.length, 2);
      const logs = () => ModerationLog.count({ where: { targetType: 'route', targetId: created.id } });
      const before = await logs();
      await send('admin', 'put', `/api/admin/routes/${created.id}`, valid).expect(200);
      assert.equal(await logs(), before, 'mismas paradas: sin cambios');
      const reordered = (await send('admin', 'put', `/api/admin/routes/${created.id}`, { ...valid, stops: [stops[1], stops[0], { name: 'Circuito', reference: 'Sobre la Ruta Nacional 11', latitude: -26.141242, longitude: -58.193193 }] }).expect(200)).body.data;
      assert.deepEqual(reordered.stops.map(stop => stop.name), ['La Virgen', 'Plaza San Martín', 'Circuito']);
      assert.match((await ModerationLog.findOne({ where: { action: 'route_update', targetId: created.id }, order: [['id', 'DESC']] })).note, /paradas \(ahora 3 paradas\)/);
      assert.equal((await send('admin', 'put', `/api/admin/routes/${created.id}`, { ...valid, stops: [] }).expect(200)).body.data.stops.length, 0);
      assert.deepEqual((await send('zoe', 'get', `/api/routes/${created.id}`).expect(200)).body.data.stops, []);
      assert.equal(await RouteStop.count({ where: { routeId: created.id } }), 0);
      await send('admin', 'put', `/api/admin/routes/${created.id}`, valid).expect(200);
    });

    // Limpieza de lo creado por las pruebas de administración.
    if (routeId) await TravelRoute.destroy({ where: { id: routeId } });
    // Al borrar la ruta, la base borra sus paradas (ON DELETE CASCADE).
    if (stopsRouteId) {
      await TravelRoute.destroy({ where: { id: stopsRouteId } });
      assert.equal(await RouteStop.count({ where: { routeId: stopsRouteId } }), 0);
    }
    if (contentId) await Content.destroy({ where: { id: contentId } });
  } finally {
    const userIds = Object.values(users).map(user => user.id);
    await ModerationLog.destroy({ where: { moderatorId: userIds } });
    await TravelRoute.destroy({ where: { institutionId: institutions.map(item => item.id) } });
    if (place) await place.destroy();
    const questions = await Question.findAll({ where: { userId: userIds }, attributes: ['id'] });
    await Answer.destroy({ where: { questionId: questions.map(row => row.id) } });
    await Question.destroy({ where: { id: questions.map(row => row.id) } });
    if (category) await Content.destroy({ where: { categoryId: category.id } });
    await User.destroy({ where: { id: userIds } });
    if (category) await category.destroy();
    for (const institution of institutions) await institution.destroy();
    await sequelize.close();
  }
});
