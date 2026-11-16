import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import { Institution } from '../src/models/institution.model.js';
import { Career } from '../src/models/career.model.js';
import { Locality } from '../src/models/locality.model.js';
import { Category } from '../src/models/category.model.js';
import { User } from '../src/models/user.model.js';
import { Question } from '../src/models/question.model.js';
import { Answer } from '../src/models/answer.model.js';
import { AnswerVote } from '../src/models/answer_vote.model.js';
import { Report } from '../src/models/report.model.js';
import { UserWarning } from '../src/models/user_warning.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';
import { UserItem } from '../src/models/user_item.model.js';
import { ShopItem } from '../src/models/shop_item.model.js';
import { runMigrations } from '../migrations/runner.js';
import { seedShopItems, shopItems } from '../seeders/shop.js';
import { addPoints } from '../src/helpers/point.helper.js';
import { app } from '../app.js';
import { notSquare, png, progressive, tiny, withExif } from './fixtures/images.js';

// Economía de puntos, tienda de decoraciones y foto de perfil sobre MySQL.
test('puntos, tienda y foto de perfil sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userIds = [];
  const created = { institution: null, career: null, locality: null };
  let category;
  try {
    await sequelize.authenticate();
    await runMigrations();
    await sequelize.transaction(transaction => seedShopItems(transaction));
    // El registro solo acepta UNaF o IPF: se usa la que exista o se crea para la prueba.
    const [institution, institutionCreated] = await Institution.findOrCreate({ where: { name: 'Universidad Nacional de Formosa (UNaF)' }, defaults: { sourceUrl: 'https://example.com' } });
    if (institutionCreated) created.institution = institution;
    created.career = await Career.create({ name: 'Carrera de la tienda', slug: `shop-career-${suffix}`, institutionId: institution.id, sourceUrl: 'https://example.com', reviewedAt: '2026-11-03' });
    created.locality = await Locality.create({ id: '34999981', name: 'Localidad de la tienda', provinceName: 'Formosa', provinceCode: '34', departmentCode: '34999', departmentName: 'Pruebas', sourceUrl: 'https://example.com', reviewedAt: '2026-11-03' });
    category = await Category.create({ name: `Tienda ${suffix}`, slug: `shop-${suffix}`, description: 'Datos ficticios para pruebas' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    const people = {};
    for (const [key, role] of [['beto', 'student'], ['caro', 'moderator']]) {
      people[key] = await User.create({ name: `${key} Tienda`, email: `${key}-shop-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: institution.id, career: 'Carrera', arrivalStatus: 'arrived', role });
      userIds.push(people[key].id);
    }
    const agents = { ana: request.agent(app), beto: request.agent(app), caro: request.agent(app) };
    for (const key of ['beto', 'caro']) await agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: people[key].email, password: 'Una-clave-segura-123' }).expect(200);
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);
    const balanceOf = async id => (await User.findByPk(id, { attributes: ['points'] })).points;

    let ana;
    await t.test('el registro da el bono de bienvenida', async () => {
      const response = await send('ana', 'post', '/api/auth/register', { name: 'Ana Tienda', email: `ana-shop-${suffix}@example.com`, password: 'Una-clave-segura-123', originCountryCode: 'AR', originLocalityId: created.locality.id, institutionId: institution.id, careerId: created.career.id, arrivalStatus: 'arrived' }).expect(201);
      ana = response.body.data.user;
      userIds.push(ana.id);
      assert.equal(ana.points, 100);
      assert.equal(ana.level, 'nuevo');
      assert.deepEqual(ana.decorations, { frame: null, banner: null, effect: null, nameColor: null });
      assert.equal(await PointTransaction.count({ where: { userId: ana.id, reason: 'welcome' } }), 1);
    });

    await t.test('catálogo, compra, saldo insuficiente y compra repetida', async () => {
      await request(app).get('/api/shop').expect(401);
      const shop = (await send('ana', 'get', '/api/shop').expect(200)).body;
      assert.equal(shop.data.length, shopItems.length);
      assert.equal(shop.meta.balance, 100);
      assert.ok(shop.data.every(item => item.owned === false && item.equipped === false));
      assert.equal(shop.meta.collections.length, 4);
      const terere = shop.data.find(item => item.slug === 'marco-terere');
      const sol = shop.data.find(item => item.slug === 'marco-sol');
      const bought = (await send('ana', 'post', `/api/shop/items/${terere.id}/purchase`).expect(201)).body;
      assert.equal(bought.data.balance, 0);
      assert.equal(bought.data.item.owned, true);
      assert.match((await send('ana', 'post', `/api/shop/items/${terere.id}/purchase`).expect(409)).body.error.message, /Ya tenés/);
      assert.match((await send('ana', 'post', `/api/shop/items/${sol.id}/purchase`).expect(409)).body.error.message, /Te faltan 120 puntos/);
      await send('ana', 'post', '/api/shop/items/999999/purchase').expect(404);
      await send('ana', 'post', '/api/shop/items/abc/purchase').expect(400);
      // Una decoración fuera de la venta no se puede comprar, pero quien la tiene la sigue viendo.
      await ShopItem.update({ available: false }, { where: { slug: 'marco-terere' } });
      try {
        assert.ok((await send('ana', 'get', '/api/shop').expect(200)).body.data.some(item => item.slug === 'marco-terere' && item.owned));
        assert.ok(!(await send('beto', 'get', '/api/shop').expect(200)).body.data.some(item => item.slug === 'marco-terere'));
      } finally { await ShopItem.update({ available: true }, { where: { slug: 'marco-terere' } }); }
    });

    await t.test('ponerse y sacarse decoraciones', async () => {
      const shop = (await send('ana', 'get', '/api/shop').expect(200)).body.data;
      const terere = shop.find(item => item.slug === 'marco-terere');
      const sol = shop.find(item => item.slug === 'marco-sol');
      assert.equal((await send('ana', 'put', `/api/shop/items/${terere.id}/equip`).expect(200)).body.data.decorations.frame, 'marco-terere');
      assert.equal((await send('ana', 'get', '/api/auth/me').expect(200)).body.data.user.decorations.frame, 'marco-terere');
      assert.equal((await send('beto', 'get', `/api/users/${ana.id}`).expect(200)).body.data.decorations.frame, 'marco-terere');
      await send('ana', 'put', `/api/shop/items/${sol.id}/equip`).expect(404);
      assert.equal((await send('ana', 'delete', `/api/shop/items/${terere.id}/equip`).expect(200)).body.data.decorations.frame, null);
      await send('ana', 'put', `/api/shop/items/${terere.id}/equip`).expect(200);
      // Ponerse otra vez lo que ya tiene puesto no se lo saca.
      assert.equal((await send('ana', 'put', `/api/shop/items/${terere.id}/equip`).expect(200)).body.data.decorations.frame, 'marco-terere');
      assert.equal((await send('ana', 'get', '/api/auth/me').expect(200)).body.data.user.decorations.frame, 'marco-terere');
    });

    let anaQuestion, betoAnswer;
    await t.test('preguntar y responder suman puntos con tope diario', async () => {
      const ask = title => send('ana', 'post', '/api/questions', { title, categoryId: category.id });
      const first = (await ask('¿Primera pregunta de la tienda?').expect(201)).body.data;
      anaQuestion = first;
      assert.equal(first.pointsEarned, 2);
      assert.equal(first.author.decorations.frame, 'marco-terere');
      assert.equal((await ask('¿Segunda pregunta de la tienda?').expect(201)).body.data.pointsEarned, 2);
      assert.equal((await ask('¿Tercera pregunta de la tienda?').expect(201)).body.data.pointsEarned, 0);
      assert.equal(await balanceOf(ana.id), 4);
      const answer = (id, body = 'Respuesta de prueba para la tienda.') => send('beto', 'post', `/api/questions/${id}/answers`, { body });
      betoAnswer = (await answer(first.id).expect(201)).body.data.answer;
      const earned = [];
      for (let i = 0; i < 3; i += 1) earned.push((await answer(first.id).expect(201)).body.data.pointsEarned);
      assert.deepEqual(earned, [5, 5, 0]);
      const own = (await send('beto', 'post', '/api/questions', { title: '¿Pregunta propia de Beto?', categoryId: category.id }).expect(201)).body.data;
      assert.equal((await send('beto', 'post', `/api/questions/${own.id}/answers`, { body: 'Me respondo a mí mismo.' }).expect(201)).body.data.pointsEarned, 0);
      assert.equal(await balanceOf(people.beto.id), 17);
    });

    await t.test('"me fue útil" suma una vez por persona y se descuenta al desmarcar', async () => {
      const mark = method => send('ana', method, `/api/answers/${betoAnswer.id}/helpful`);
      await mark('put').expect(200);
      assert.equal(await balanceOf(people.beto.id), 27);
      await mark('put').expect(200);
      assert.equal(await balanceOf(people.beto.id), 27);
      await mark('delete').expect(200);
      assert.equal(await balanceOf(people.beto.id), 17);
      await mark('put').expect(200);
      assert.equal(await balanceOf(people.beto.id), 17, 'volver a marcar no vuelve a sumar');
      await mark('delete').expect(200);
      assert.equal(await balanceOf(people.beto.id), 17, 'ni vuelve a descontar');
      const reputation = (await User.findByPk(people.beto.id)).reputation;
      assert.equal(reputation, 17);
    });

    await t.test('dos compras al mismo tiempo no gastan dos veces', async () => {
      await sequelize.transaction(transaction => addPoints({ userId: ana.id, amount: 150, reason: 'welcome' }, transaction));
      const balance = await balanceOf(ana.id);
      assert.equal(balance, 154);
      const items = (await send('ana', 'get', '/api/shop').expect(200)).body.data;
      const sol = items.find(item => item.slug === 'marco-sol');
      const rio = items.find(item => item.slug === 'nombre-rio');
      const results = await Promise.all([sol, rio].map(item => send('ana', 'post', `/api/shop/items/${item.id}/purchase`)));
      const statuses = results.map(result => result.status).sort();
      assert.deepEqual(statuses, [201, 409]);
      const bought = results.find(result => result.status === 201).body.data.item;
      assert.equal(await balanceOf(ana.id), balance - bought.price);
      assert.equal(await UserItem.count({ where: { userId: ana.id } }), 2);
    });

    await t.test('advertencias y contenido ocultado restan; revocar devuelve exacto', async () => {
      const before = await balanceOf(people.beto.id);
      await send('caro', 'post', `/api/moderation/users/${people.beto.id}/warnings`, { reason: 'spam', note: 'Respuestas repetidas para sumar puntos.' }).expect(201);
      assert.equal(await balanceOf(people.beto.id), Math.max(before - 30, 0));
      const warning = await UserWarning.findOne({ where: { userId: people.beto.id }, order: [['id', 'DESC']] });
      await send('caro', 'post', `/api/moderation/warnings/${warning.id}/revoke`, { note: 'Fue un error.' }).expect(200);
      assert.equal(await balanceOf(people.beto.id), before);
      assert.equal((await User.findByPk(people.beto.id)).reputation, 17);
      // Reporte resuelto con "ocultar": resta a quien publicó.
      await send('ana', 'post', '/api/reports', { targetType: 'answer', targetId: betoAnswer.id, reason: 'false' }).expect(201);
      const report = await Report.findOne({ where: { targetType: 'answer', targetId: betoAnswer.id } });
      await send('caro', 'post', `/api/moderation/reports/${report.id}/resolve`, { decision: 'hide', note: 'Información falsa.' }).expect(200);
      assert.equal(await balanceOf(people.beto.id), before - 15);
      // El saldo nunca queda negativo.
      await User.update({ points: 5 }, { where: { id: people.beto.id } });
      await send('caro', 'post', `/api/moderation/users/${people.beto.id}/warnings`, { reason: 'other', note: 'Otra advertencia de prueba.' }).expect(201);
      assert.equal(await balanceOf(people.beto.id), 0);
      const penalty = await PointTransaction.findOne({ where: { userId: people.beto.id, reason: 'warning' }, order: [['id', 'DESC']] });
      assert.equal(penalty.amount, -5);
    });

    await t.test('mis puntos: saldo, nivel, reglas, hoy y movimientos', async () => {
      const points = (await send('ana', 'get', '/api/points').expect(200)).body;
      assert.equal(points.data.balance, await balanceOf(ana.id));
      assert.ok(points.data.levels.length === 3 && points.data.rules.welcome === 100);
      assert.equal(points.data.today.question, 2);
      assert.ok(points.data.transactions.some(row => row.reason === 'purchase' && row.itemName === 'Tereré'));
      assert.ok(points.data.transactions.some(row => row.reason === 'welcome' && row.amount === 100));
      await send('ana', 'get', '/api/points?page=0').expect(400);
      await send('ana', 'get', '/api/points?otra=1').expect(400);
    });

    await t.test('foto de perfil: se guarda sin metadatos y se puede quitar', async () => {
      const uploaded = (await send('ana', 'put', '/api/profile/avatar', { image: withExif }).expect(200)).body.data;
      assert.ok(uploaded.avatarVersion > 0);
      const image = await agents.beto.get(`/api/users/${ana.id}/avatar?v=${uploaded.avatarVersion}`).buffer(true).parse((res, done) => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => done(null, Buffer.concat(chunks))); }).expect(200);
      assert.equal(image.headers['content-type'], 'image/jpeg');
      assert.match(image.headers['cache-control'], /private/);
      assert.equal(image.body.includes(Buffer.from('Exif')), false, 'sin EXIF');
      assert.equal(image.body.includes(Buffer.from('comentario')), false, 'sin comentarios');
      await request(app).get(`/api/users/${ana.id}/avatar`).expect(401);
      await send('beto', 'get', `/api/users/${people.beto.id}/avatar`).expect(404);
      assert.equal((await send('ana', 'get', '/api/auth/me').expect(200)).body.data.user.avatarVersion, uploaded.avatarVersion);
      const detail = (await send('beto', 'get', `/api/questions/${anaQuestion.id}`).expect(200)).body.data;
      assert.equal(detail.author.avatarVersion, uploaded.avatarVersion);
      await send('ana', 'put', '/api/profile/avatar', { image: progressive }).expect(200);
      for (const [image, message] of [[notSquare, /cuadrada/], [tiny, /entre 64/], [png, /JPG/], [`data:image/jpeg;base64,${'!'.repeat(40)}`, /JPG/]]) {
        const response = await send('ana', 'put', '/api/profile/avatar', { image }).expect(400);
        assert.match(response.body.error.fields.image, message);
      }
      await send('ana', 'put', '/api/profile/avatar', { image: withExif, extra: 1 }).expect(400);
      await send('ana', 'put', '/api/profile/avatar', { image: `data:image/jpeg;base64,${'A'.repeat(500000)}` }).expect(413);
      // Moderación puede quitar una foto que no corresponde, con motivo y en el historial.
      await send('beto', 'post', `/api/moderation/users/${ana.id}/avatar/remove`, { note: 'Foto con datos personales.' }).expect(403);
      await send('caro', 'post', `/api/moderation/users/${ana.id}/avatar/remove`, { note: 'no' }).expect(400);
      await send('caro', 'post', `/api/moderation/users/${ana.id}/avatar/remove`, { note: 'Foto con datos personales.' }).expect(200);
      assert.equal((await send('ana', 'get', '/api/auth/me').expect(200)).body.data.user.avatarVersion, null);
      assert.ok(await ModerationLog.findOne({ where: { action: 'avatar_remove', targetId: ana.id } }));
      await send('caro', 'post', `/api/moderation/users/${ana.id}/avatar/remove`, { note: 'Foto con datos personales.' }).expect(409);
      await send('ana', 'put', '/api/profile/avatar', { image: withExif }).expect(200);
      await send('ana', 'delete', '/api/profile/avatar').expect(200);
      assert.equal((await User.findByPk(ana.id)).avatarUpdatedAt, null);
    });
  } finally {
    const questions = await Question.findAll({ where: { userId: userIds }, attributes: ['id'] });
    const questionIds = questions.map(row => row.id);
    const answers = await Answer.findAll({ where: { questionId: questionIds }, attributes: ['id'] });
    await AnswerVote.destroy({ where: { answerId: answers.map(row => row.id) } });
    await Report.destroy({ where: { reporterId: userIds } });
    await ModerationLog.destroy({ where: { moderatorId: userIds } });
    await UserWarning.destroy({ where: { userId: userIds } });
    await Answer.destroy({ where: { questionId: questionIds } });
    await Question.destroy({ where: { id: questionIds } });
    await User.destroy({ where: { id: userIds } });
    if (category) await category.destroy();
    if (created.career) await created.career.destroy();
    if (created.locality) await created.locality.destroy();
    if (created.institution) await created.institution.destroy();
    await sequelize.close();
  }
});
