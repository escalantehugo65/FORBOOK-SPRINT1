import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Career } from '../src/models/career.model.js';
import { Category } from '../src/models/category.model.js';
import { Content } from '../src/models/content.model.js';
import { Institution } from '../src/models/institution.model.js';
import { InstitutionResource } from '../src/models/institution_resource.model.js';
import { Locality } from '../src/models/locality.model.js';
import { Question } from '../src/models/question.model.js';
import { Session } from '../src/models/session.model.js';
import { User } from '../src/models/user.model.js';
import { runMigrations } from '../migrations/runner.js';
import { app } from '../app.js';

test('recorrido real de HU-01/02/03/04/06/11/13 sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let emptyInstitution, foreignUserId, userId, institution, category, emptyCategory, content, draft, cookie, career, otherCareer, otherInstitution, ownContent, otherContent, ownResource, otherResource, otherUser, locality, outOfProvince;
  try {
    await sequelize.authenticate(); await runMigrations();
    locality = await Locality.create({ id: '34999991', name: 'Localidad de prueba', provinceName: 'Formosa', provinceCode: '34', departmentCode: '34999', departmentName: 'Pruebas', sourceUrl: 'https://example.com', reviewedAt: '2026-11-03' });
    outOfProvince = await Locality.create({ id: '22999992', name: 'Localidad de otra provincia', provinceName: 'Chaco', provinceCode: '22', departmentCode: '22999', departmentName: 'Pruebas', sourceUrl: 'https://example.com', reviewedAt: '2026-11-03' });
    institution = await Institution.create({ name: 'Universidad Nacional de Formosa (UNaF)', sourceUrl: 'https://example.com' });
    career = await Career.create({ name: 'Sistemas de prueba', slug: `career-${suffix}`, institutionId: institution.id, sourceUrl: 'https://example.com', reviewedAt: '2026-11-03' });
    otherInstitution = await Institution.create({ name: 'Instituto Politécnico Formosa (IPF)', sourceUrl: 'https://example.com' });
    otherCareer = await Career.create({ name: 'Otra carrera', slug: `other-${suffix}`, institutionId: otherInstitution.id, sourceUrl: 'https://example.com', reviewedAt: '2026-11-03' });
    category = await Category.create({ name: 'Prueba', slug: `test-${suffix}`, description: 'Datos ficticios exclusivos para pruebas' });
    emptyCategory = await Category.create({ name: 'Vacía', slug: `empty-${suffix}`, description: 'Categoría sin publicaciones' });
    const values = { slug: `content-${suffix}`, title: 'Contenido de prueba', summary: 'Dato ficticio', body: 'No es información real.', categoryId: category.id, sourceType: 'experience', authorLabel: 'Pruebas automatizadas', status: 'published' };
    content = await Content.create(values);
    draft = await Content.create({ ...values, slug: `draft-${suffix}`, status: 'draft' });
    ownContent = await Content.create({ ...values, slug: `own-${suffix}`, institutionId: institution.id });
    otherContent = await Content.create({ ...values, slug: `other-${suffix}`, institutionId: otherInstitution.id });
    ownResource = await InstitutionResource.create({ institutionId: institution.id, slug: `resource-${suffix}`, title: 'Acceso propio', description: 'Prueba', url: 'https://example.com/own' });
    otherResource = await InstitutionResource.create({ institutionId: otherInstitution.id, slug: `resource-other-${suffix}`, title: 'Acceso ajeno', description: 'Prueba', url: 'https://example.com/other' });
    const agent = request.agent(app);
    const post = (path, data, client = agent) => client.post(path).set('Origin', config.frontendUrl).send(data);
    const profile = { name: 'Ana Prueba', email: `test-${suffix}@example.com`, password: 'Una-clave-segura-123', originCountryCode: 'AR', originLocalityId: locality.id, institutionId: institution.id, careerId: career.id, arrivalStatus: 'not_arrived' };
    await t.test('rutas privadas bloqueadas y origen de mutaciones comprobado', async () => {
      await request(app).get('/api/categories').expect(401);
      await request(app).post('/api/auth/register').send(profile).expect(403);
      await post('/api/auth/register', { ...profile, role: 'admin' }).expect(400);
      await post('/api/auth/register', { ...profile, origin: 'Texto libre' }).expect(400);
      await post('/api/auth/register', { ...profile, originLocalityId: '34999990' }).expect(400);
      await post('/api/auth/register', { ...profile, originCountryCode: 'PY', originLocalityId: locality.id }).expect(400);
      const locations = await request(app).get('/api/origin-localities').expect(200);
      assert.ok(locations.body.data.some(row => row.id === locality.id));
      assert.ok(locations.body.data.some(row => row.id === outOfProvince.id));
      const countries = await request(app).get('/api/origin-countries').expect(200);
      assert.equal(countries.body.data.length, 249);
      assert.ok(countries.body.data.some(row => row.code === 'PY'));
      await post('/api/auth/register', { ...profile, institutionId: 4294967295 }).expect(400);
      await post('/api/auth/register', { ...profile, password: 'corta' }).expect(400);
      await post('/api/auth/register', { ...profile, careerId: otherCareer.id }).expect(400);
      await post('/api/auth/register', { ...profile, careerId: 4294967295 }).expect(400);
      await post('/api/auth/register', { ...profile, career: 'Texto libre' }).expect(400);
      const catalog = await request(app).get(`/api/institutions/${institution.id}/careers`).expect(200);
      assert.equal(catalog.body.data.length, 1);
      assert.equal(catalog.body.data[0].id, career.id);
    });
    await t.test('registro persistente, cookie HttpOnly y datos públicos', async () => {
      const response = await post('/api/auth/register', profile).expect(201);
      userId = response.body.data.user.id;
      cookie = response.headers['set-cookie'][0].split(';')[0];
      assert.equal(response.body.data.sessionStarted, true);
      assert.match(response.headers['set-cookie'][0], /HttpOnly/);
      assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
      assert.equal(response.body.data.user.passwordHash, undefined);
      const user = await User.scope('withPassword').findByPk(userId);
      assert.equal(await bcrypt.compare(profile.password, user.passwordHash), true);
      assert.equal(user.role, 'student');
      assert.equal(response.body.data.user.role, 'student');
      assert.equal(response.body.data.user.originCountryCode, 'AR');
      assert.equal(user.career, career.name);
      await post('/api/auth/register', profile).expect(409);
    });
    await t.test('perfil y sesión recuperados incluso con otra instancia de Express', async () => {
      const me = await agent.get('/api/auth/me').expect(200);
      assert.equal(me.body.data.user.institution.name, institution.name);
      assert.equal(me.body.data.user.arrivalStatus, 'not_arrived');
      assert.equal(me.body.data.user.origin, `${locality.name}, Formosa`);
      assert.equal(me.body.data.user.originLocalityId, locality.id);
      // Otra instancia de Express, como si el servidor se hubiera reiniciado: la sesión sigue porque vive en MySQL.
      const { app: second } = await import('../app.js?otra-instancia');
      const restored = await request(second).get('/api/auth/me').set('Cookie', cookie).expect(200);
      assert.equal(restored.body.data.user.id, userId);
    });
    await t.test('categorías, filtros, detalle, vacíos y borradores', async () => {
      await agent.get('/api/categories').expect(200);
      const list = await agent.get(`/api/contents?categoryId=${category.id}`).expect(200);
      assert.equal(list.body.data.length, 2); assert.deepEqual(new Set(list.body.data.map(row => row.id)), new Set([content.id, ownContent.id]));
      assert.equal(list.body.meta.total, 2);
      const empty = await agent.get(`/api/contents?categoryId=${emptyCategory.id}`).expect(200); assert.equal(empty.body.data.length, 0);
      const detail = await agent.get(`/api/contents/${content.id}`).expect(200);
      assert.equal(detail.body.data.sourceType, 'experience'); assert.equal(detail.body.data.reviewedAt, null);
      await agent.get(`/api/contents/${draft.id}`).expect(404);
      await agent.get('/api/contents/4294967295').expect(404);
      await agent.get('/api/contents?categoryId=oops').expect(400);
    });
    await t.test('instituciones separadas en accesos, listado, conteo y detalle', async () => {
      const resources = await agent.get('/api/institution-resources').expect(200);
      assert.deepEqual(resources.body.data.resources.map(row => row.id), [ownResource.id]);
      const spoofedResources = await agent.get(`/api/institution-resources?institutionId=${otherInstitution.id}`).expect(200);
      assert.deepEqual(spoofedResources.body.data.resources.map(row => row.id), [ownResource.id]);
      await agent.get(`/api/contents/${ownContent.id}`).expect(200);
      await agent.get(`/api/contents/${otherContent.id}`).expect(404);
      const forbiddenFilter = await agent.get(`/api/contents?institutionId=${otherInstitution.id}`).expect(200);
      assert.equal(forbiddenFilter.body.meta.total, 0);
      otherUser = await User.create({ name: 'Otra prueba', email: `other-${suffix}@example.com`, passwordHash: await bcrypt.hash(profile.password, 12), origin: 'Prueba', institutionId: otherInstitution.id, career: 'Otra carrera', arrivalStatus: 'arrived' });
      const otherAgent = request.agent(app);
      await post('/api/auth/login', { email: otherUser.email, password: profile.password }, otherAgent).expect(200);
      const legacyProfile = await otherAgent.get('/api/auth/me').expect(200);
      assert.equal(legacyProfile.body.data.user.origin, 'Prueba');
      assert.equal(legacyProfile.body.data.user.originLocalityId, null);
      const otherList = await otherAgent.get(`/api/contents?categoryId=${category.id}`).expect(200);
      assert.deepEqual(new Set(otherList.body.data.map(row => row.id)), new Set([content.id, otherContent.id]));
      await otherAgent.get(`/api/contents/${ownContent.id}`).expect(404);
      const otherResources = await otherAgent.get('/api/institution-resources').expect(200);
      assert.deepEqual(otherResources.body.data.resources.map(row => row.id), [otherResource.id]);
      await post('/api/auth/logout', {}, otherAgent).expect(200);
      await request(app).get('/api/institution-resources').expect(401);
    });
    await t.test('preguntas, respuestas y votos conviven con el perfil nacional', async () => {
      const responder = request.agent(app);
      await post('/api/auth/login', {email:otherUser.email, password:profile.password}, responder).expect(200);
      let questionId;
      try {
        await post('/api/questions', {title:'Corta',categoryId:category.id}).expect(400);
        const question = await post('/api/questions', {title:'¿Cómo preparo mi llegada a Formosa?',body:'Consulta de integración',categoryId:category.id,forMyInstitution:true}).expect(201);
        questionId = question.body.data.id;
        assert.equal(question.body.data.institution.id, institution.id);
        assert.equal(question.body.data.author.email, undefined);
        const response = await post(`/api/questions/${questionId}/answers`, {body:'Podés empezar por las fichas verificadas de la ciudad.'}, responder).expect(201);
        const answerId = response.body.data.answer.id;
        const vote = () => agent.put(`/api/answers/${answerId}/helpful`).set('Origin',config.frontendUrl).send({});
        assert.equal((await vote().expect(200)).body.data.helpfulCount,1);
        assert.equal((await vote().expect(200)).body.data.helpfulCount,1);
        await responder.put(`/api/answers/${answerId}/helpful`).set('Origin',config.frontendUrl).send({}).expect(403);
        const detail = (await agent.get(`/api/questions/${questionId}`).expect(200)).body.data;
        assert.equal(detail.status,'answered');
        assert.equal(detail.answers[0].markedByMe,true);
        const list = await agent.get(`/api/questions?institutionId=${institution.id}&categoryId=${category.id}`).expect(200);
        assert.ok(list.body.data.some(item => item.id===questionId));
        assert.equal((await agent.delete(`/api/answers/${answerId}/helpful`).set('Origin',config.frontendUrl).send({}).expect(200)).body.data.helpfulCount,0);
        assert.equal((await agent.get('/api/auth/me').expect(200)).body.data.user.originCountryCode,'AR');
      } finally {
        if(questionId) await Question.destroy({where:{id:questionId}});
        await post('/api/auth/logout',{},responder);
      }
    });
    await t.test('registro de otra provincia y del exterior persiste nombres canónicos', async () => {
      const foreignAgent = request.agent(app);
      const foreign = await post('/api/auth/register', { ...profile, email: `foreign-${suffix}@example.com`, originCountryCode: 'PY', originLocalityId: '' }, foreignAgent).expect(201);
      foreignUserId = foreign.body.data.user.id;
      assert.equal(foreign.body.data.user.origin, 'Paraguay');
      assert.equal(foreign.body.data.user.originLocalityId, null);
      assert.equal((await foreignAgent.get('/api/auth/me').expect(200)).body.data.user.originCountryCode, 'PY');
      await post('/api/auth/logout', {}, foreignAgent).expect(200);
      await post('/api/auth/login', {email: `foreign-${suffix}@example.com`, password: profile.password}, foreignAgent).expect(200);
      assert.equal((await foreignAgent.get('/api/auth/me').expect(200)).body.data.user.origin, 'Paraguay');
      await post('/api/auth/logout', {}, foreignAgent).expect(200);
      await User.destroy({where:{id:foreignUserId}}); foreignUserId = null;
      const national = await post('/api/auth/register', { ...profile, email: `province-${suffix}@example.com`, originLocalityId: outOfProvince.id }, foreignAgent).expect(201);
      foreignUserId = national.body.data.user.id;
      assert.equal(national.body.data.user.origin, `${outOfProvince.name}, Chaco`);
      await post('/api/auth/logout', {}, foreignAgent).expect(200);
    });
    await t.test('solo UNaF/IPF en registro, con cuentas históricas conservadas', async () => {
      await post('/api/auth/register', { ...profile, email: `required-${suffix}@example.com`, careerId: null }).expect(400);
      emptyInstitution = await Institution.create({name: `Instituto anterior ${suffix}`, sourceUrl:'https://example.com'});
      const list = await request(app).get('/api/institutions').expect(200);
      assert.deepEqual(new Set(list.body.data.map(item=>item.name)),new Set([institution.name,otherInstitution.name]));
      await request(app).get(`/api/institutions/${emptyInstitution.id}/careers`).expect(404);
      await post('/api/auth/register', { ...profile, email: `blocked-${suffix}@example.com`, institutionId: emptyInstitution.id, careerId: null }).expect(400);
      const historical = await User.create({name:'Cuenta anterior',email:`legacy-${suffix}@example.com`,passwordHash:await bcrypt.hash(profile.password,4),origin:'Procedencia histórica',institutionId:emptyInstitution.id,career:'Carrera histórica',arrivalStatus:'arrived'});
      try {
        const legacyAgent = request.agent(app);
        await post('/api/auth/login',{email:historical.email,password:profile.password},legacyAgent).expect(200);
        const current=(await legacyAgent.get('/api/auth/me').expect(200)).body.data.user;
        assert.equal(current.institution.id,emptyInstitution.id);
        assert.equal(current.career,'Carrera histórica');
        await post('/api/auth/logout',{},legacyAgent).expect(200);
      } finally {await historical.destroy();}
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
      await User.update({ arrivalStatus: 'arrived' }, { where: { id: userId } });
      assert.equal((await agent.get('/api/auth/me')).body.data.user.arrivalStatus, 'arrived');
    });
    await t.test('sesión vencida rechazada por almacenamiento SQL', async () => {
      const sessions = await Session.findAll();
      for (const row of sessions) if (JSON.parse(row.data).userId === userId) await row.update({ expiresAt: new Date(0) });
      await agent.get('/api/auth/me').expect(401);
    });
  } finally {
    // Solo elimina los datos que creó esta ejecución, nunca las tablas.
    if (foreignUserId) await User.destroy({where:{id:foreignUserId}});
    if (otherUser) await otherUser.destroy();
    if (ownResource) await ownResource.destroy(); if (otherResource) await otherResource.destroy();
    if (ownContent) await ownContent.destroy(); if (otherContent) await otherContent.destroy();
    if (userId) await User.destroy({ where: { id: userId } });
    if (content) await content.destroy(); if (draft) await draft.destroy();
    if (category) await category.destroy(); if (emptyCategory) await emptyCategory.destroy();
    if (career) await career.destroy(); if (otherCareer) await otherCareer.destroy();
    if (emptyInstitution) await emptyInstitution.destroy();
    if (institution) await institution.destroy(); if (otherInstitution) await otherInstitution.destroy();
    if (locality) await locality.destroy(); if (outOfProvince) await outOfProvince.destroy();
    await sequelize.close();
  }
});
