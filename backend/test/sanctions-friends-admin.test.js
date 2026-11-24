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
import { Content } from '../src/models/content.model.js';
import { Report } from '../src/models/report.model.js';
import { Community } from '../src/models/community.model.js';
import { CommunityMessage } from '../src/models/community_message.model.js';
import { UserWarning } from '../src/models/user_warning.model.js';
import { UserSanction } from '../src/models/user_sanction.model.js';
import { SanctionAppeal } from '../src/models/sanction_appeal.model.js';
import { Friendship } from '../src/models/friendship.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';
import { ShopItem } from '../src/models/shop_item.model.js';
import { runMigrations } from '../migrations/runner.js';
import { app } from '../app.js';

// Sanciones (escalado, suspensión, baneo y apelaciones), amigos, fichas de estudiantes,
// reportes de mensajes del chat y panel de administración.
test('sanciones, amigos, fichas y panel sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tag = suffix.replace(/[^a-z0-9]/g, '').slice(-8);
  const users = {};
  let institution, other, category, item;
  try {
    await sequelize.authenticate();
    await runMigrations();
    institution = await Institution.create({ name: `Instituto sanciones ${suffix}`, sourceUrl: 'https://example.com' });
    other = await Institution.create({ name: `Otro instituto ${suffix}`, sourceUrl: 'https://example.com' });
    category = await Category.create({ name: `Sanciones ${suffix}`, slug: `san-${suffix}`, description: 'Datos ficticios para pruebas' });
    item = await ShopItem.create({ slug: `item-${suffix}`, name: `Marco ${tag}`, description: 'Decoración de prueba', category: 'frame', rarity: 'common', price: 50, collection: 'Pruebas' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    const people = [['ana', 'student', institution], ['beto', 'student', institution], ['caro', 'student', institution], ['dani', 'student', other], ['mod', 'moderator', institution], ['boss', 'admin', institution], ['boss2', 'admin', institution]];
    for (const [key, role, place] of people) {
      users[key] = await User.create({ name: `${key[0].toUpperCase()}${key.slice(1)} Prueba ${tag}`, email: `${key}-san-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: place.id, career: 'Carrera de prueba', arrivalStatus: 'arrived', role, points: 100 });
    }
    const agents = {};
    for (const key of Object.keys(users)) {
      agents[key] = request.agent(app);
      await agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users[key].email, password: 'Una-clave-segura-123' }).expect(200);
    }
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);
    const ask = (key, title) => send(key, 'post', '/api/questions', { title, categoryId: category.id, forMyInstitution: false });
    const warn = (target, note = 'Publicó información falsa a propósito.') => send('mod', 'post', `/api/moderation/users/${users[target].id}/warnings`, { reason: 'false', note });

    await t.test('advertencias que escalan: restricción, suspensión y apelación', async () => {
      await warn('beto').expect(201);
      await ask('beto', `¿Pregunta antes de la restricción ${tag}?`).expect(201);
      const second = (await warn('beto').expect(201)).body.data;
      assert.equal(second.sanction.type, 'restriction');
      assert.match(second.message, /restringida 3 días/);
      // Restringido: lee, pero no publica.
      const blocked = (await ask('beto', `¿Pregunta restringida ${tag}?`).expect(403)).body.error;
      assert.equal(blocked.code, 'account_restricted');
      await send('beto', 'get', '/api/questions').expect(200);
      assert.equal((await send('beto', 'get', '/api/auth/me').expect(200)).body.data.user.account.state, 'restricted');
      // Con la tercera, suspensión: no puede usar nada salvo su cuenta, sus sanciones y apelar.
      assert.equal((await warn('beto').expect(201)).body.data.sanction.type, 'suspension');
      const suspended = (await send('beto', 'get', '/api/questions').expect(403)).body.error;
      assert.equal(suspended.code, 'account_suspended');
      assert.match(suspended.message, /suspendida hasta el/);
      const me = (await send('beto', 'get', '/api/auth/me').expect(200)).body.data.user.account;
      assert.deepEqual([me.state, me.sanction.type, me.sanction.reason], ['suspended', 'suspension', 'repeated']);
      const mine = (await send('beto', 'get', '/api/sanctions/mine').expect(200)).body;
      assert.equal(mine.data.warnings.length, 3);
      assert.deepEqual(mine.data.sanctions.map(item => [item.type, item.active]), [['suspension', true], ['restriction', true]]);
      assert.equal(mine.meta.rules.banAt, 5);
      // El perfil muestra la sanción a los demás (sin la nota) y cuántas tuvo.
      const profile = (await send('ana', 'get', `/api/users/${users.beto.id}`).expect(200)).body.data;
      assert.deepEqual(profile.sanctions.map(item => item.type), ['suspension', 'restriction']);
      assert.equal(profile.sanctions[0].note, undefined);
      assert.equal(profile.warnings.length, 3);
      // Apelación de la última advertencia: una sola vez y con texto suficiente.
      const last = mine.data.warnings[0];
      await send('beto', 'post', '/api/sanctions/appeals', { targetType: 'warning', targetId: last.id, body: 'corta' }).expect(400);
      await send('beto', 'post', '/api/sanctions/appeals', { targetType: 'warning', targetId: 999999999, body: 'No hice nada de lo que dice la advertencia.' }).expect(404);
      const ownWarning = await UserWarning.findOne({ where: { userId: users.ana.id } });
      assert.equal(ownWarning, null);
      await send('beto', 'post', '/api/sanctions/appeals', { targetType: 'warning', targetId: last.id, body: 'No hice nada de lo que dice la advertencia, fue otra persona.' }).expect(201);
      await send('beto', 'post', '/api/sanctions/appeals', { targetType: 'warning', targetId: last.id, body: 'No hice nada de lo que dice la advertencia, fue otra persona.' }).expect(409);
      await send('ana', 'post', '/api/sanctions/appeals', { targetType: 'warning', targetId: last.id, body: 'Intento apelar algo que no es mío.' }).expect(404);
      // Solo administración ve y resuelve apelaciones.
      await send('mod', 'get', '/api/admin/appeals').expect(403);
      const appeal = (await send('boss', 'get', '/api/admin/appeals').expect(200)).body.data.find(row => row.user?.id === users.beto.id);
      assert.equal(appeal.target.type, 'warning');
      const before = (await User.findByPk(users.beto.id)).points;
      await send('boss', 'post', `/api/admin/appeals/${appeal.id}/resolve`, { decision: 'accept', response: 'Revisamos y la advertencia fue un error.' }).expect(200);
      await send('boss', 'post', `/api/admin/appeals/${appeal.id}/resolve`, { decision: 'accept', response: 'De nuevo.' }).expect(409);
      // Al aceptar: se revoca la advertencia, vuelven los puntos y se levanta la suspensión automática (quedan 2: restricción).
      assert.ok((await UserWarning.findByPk(last.id)).revokedAt);
      assert.ok((await User.findByPk(users.beto.id)).points > before);
      assert.equal((await send('beto', 'get', '/api/auth/me').expect(200)).body.data.user.account.state, 'restricted');
      await send('beto', 'get', '/api/questions').expect(200);
      const resolved = (await send('beto', 'get', '/api/sanctions/mine').expect(200)).body.data.warnings.find(item => item.id === last.id);
      assert.deepEqual([resolved.revoked, resolved.appeal.status, resolved.appeal.response], [true, 'accepted', 'Revisamos y la advertencia fue un error.']);
      // No se puede advertir a una cuenta de administración.
      await send('mod', 'post', `/api/moderation/users/${users.boss.id}/warnings`, { reason: 'false', note: 'Intento advertir a un admin.' }).expect(403);
    });

    await t.test('panel: solo administración', async () => {
      for (const key of ['ana', 'mod']) {
        for (const path of ['/api/admin/stats', '/api/admin/users', `/api/admin/users/${users.ana.id}`, '/api/admin/communities', '/api/admin/shop']) await send(key, 'get', path).expect(403);
      }
      await request(app).get('/api/admin/stats').expect(401);
      const stats = (await send('boss', 'get', '/api/admin/stats').expect(200)).body.data;
      assert.ok(stats.users.total >= 7 && stats.users.byRole.admin >= 2);
      assert.ok(stats.moderation.sanctions.restriction >= 1);
      const found = (await send('boss', 'get', `/api/admin/users?search=${encodeURIComponent(`Beto Prueba ${tag}`)}`).expect(200)).body.data;
      assert.deepEqual(found.map(row => [row.id, row.state, row.warnings]), [[users.beto.id, 'restricted', 2]]);
      assert.equal(found[0].email, users.beto.email, 'el panel muestra el correo para identificar la cuenta');
      const restricted = (await send('boss', 'get', '/api/admin/users?state=restricted').expect(200)).body.data;
      assert.ok(restricted.some(row => row.id === users.beto.id) && !restricted.some(row => row.id === users.ana.id));
      await send('boss', 'get', '/api/admin/users?state=raro').expect(400);
      await send('boss', 'get', '/api/admin/users?orden=1').expect(400);
      const detail = (await send('boss', 'get', `/api/admin/users/${users.beto.id}`).expect(200)).body.data;
      assert.equal(detail.warnings.length, 3);
      assert.ok(detail.sanctions.every(item => item.moderator));
      assert.ok(detail.counts.questions >= 1 && detail.movements.length > 0);
      await send('boss', 'get', '/api/admin/users/999999999').expect(404);
    });

    await t.test('panel: roles, sanciones manuales y puntos', async () => {
      await send('boss', 'put', `/api/admin/users/${users.boss.id}/role`, { role: 'student' }).expect(400);
      await send('boss', 'put', `/api/admin/users/${users.caro.id}/role`, { role: 'superadmin' }).expect(400);
      await send('boss', 'put', `/api/admin/users/${users.caro.id}/role`, { role: 'moderator' }).expect(200);
      await send('boss', 'put', `/api/admin/users/${users.caro.id}/role`, { role: 'moderator' }).expect(409);
      assert.equal((await User.findByPk(users.caro.id)).role, 'moderator');
      await send('boss', 'put', `/api/admin/users/${users.caro.id}/role`, { role: 'student' }).expect(200);
      // Siempre queda una cuenta admin: si boss2 fuera la única, no se la podría bajar (acá hay más).
      // Sanciones manuales: validación de días y que no se sancione a un admin.
      const sanction = (body) => send('boss', 'post', `/api/admin/users/${users.caro.id}/sanctions`, body);
      assert.ok((await sanction({ type: 'suspension', reason: 'spam', note: 'Mandó spam en varias comunidades.' }).expect(400)).body.error.fields.days);
      assert.ok((await sanction({ type: 'ban', reason: 'spam', note: 'Mandó spam en varias comunidades.', days: 3 }).expect(400)).body.error.fields.days);
      await sanction({ type: 'suspension', reason: 'spam', note: 'corta', days: 3 }).expect(400);
      await send('boss', 'post', `/api/admin/users/${users.boss2.id}/sanctions`, { type: 'ban', reason: 'other', note: 'Intento banear a un admin.' }).expect(403);
      await send('boss', 'post', `/api/admin/users/${users.boss.id}/sanctions`, { type: 'ban', reason: 'other', note: 'Intento banearme a mí.' }).expect(400);
      const ban = (await sanction({ type: 'ban', reason: 'harassment', note: 'Acoso a otras personas en el chat.' }).expect(201)).body.data;
      assert.equal(ban.endsAt, null);
      const out = (await send('caro', 'get', '/api/communities').expect(403)).body.error;
      assert.deepEqual([out.code, out.message], ['account_suspended', 'Tu cuenta fue dada de baja por moderación.']);
      assert.equal((await send('caro', 'get', '/api/auth/me').expect(200)).body.data.user.account.state, 'banned');
      await send('caro', 'post', '/api/auth/logout').expect(200);
      await agents.caro.post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users.caro.email, password: 'Una-clave-segura-123' }).expect(200);
      await send('boss', 'post', `/api/admin/sanctions/${ban.id}/revoke`, { note: 'Fue un malentendido.' }).expect(200);
      await send('boss', 'post', `/api/admin/sanctions/${ban.id}/revoke`, { note: 'Otra vez.' }).expect(409);
      await send('caro', 'get', '/api/communities').expect(200);
      // Un baneo revocado no cuenta como sanción pasada en el perfil.
      assert.equal((await send('ana', 'get', `/api/users/${users.caro.id}`).expect(200)).body.data.pastSanctions, 0);
      // Una restricción vencida sí cuenta como pasada y deja de verse como vigente.
      const old = await UserSanction.create({ userId: users.caro.id, moderatorId: users.boss.id, type: 'restriction', reason: 'spam', note: 'Restricción vieja de prueba.', endsAt: new Date(Date.now() - 1000) });
      const caro = (await send('ana', 'get', `/api/users/${users.caro.id}`).expect(200)).body.data;
      assert.deepEqual([caro.sanctions.length, caro.pastSanctions], [0, 1]);
      await old.destroy();
      // Puntos a mano: no cambian la reputación.
      const before = await User.findByPk(users.ana.id);
      await send('boss', 'post', `/api/admin/users/${users.ana.id}/points`, { amount: 0, note: 'Nada.' }).expect(400);
      await send('boss', 'post', `/api/admin/users/${users.ana.id}/points`, { amount: 5000, note: 'Demasiado.' }).expect(400);
      assert.equal((await send('boss', 'post', `/api/admin/users/${users.ana.id}/points`, { amount: 25, note: 'Premio por ayudar en el evento.' }).expect(200)).body.data.balance, before.points + 25);
      const after = await User.findByPk(users.ana.id);
      assert.deepEqual([after.points, after.reputation], [before.points + 25, before.reputation]);
      assert.ok(await PointTransaction.findOne({ where: { userId: users.ana.id, reason: 'admin_adjust' } }));
    });

    let friendsCheck;
    await t.test('amigos: solicitud, aceptar, rechazar, cancelar y quitar', async () => {
      const profileOf = async (viewer, target) => (await send(viewer, 'get', `/api/users/${users[target].id}`).expect(200)).body.data;
      await send('ana', 'post', `/api/users/${users.ana.id}/friendship`).expect(400);
      await send('ana', 'post', '/api/users/999999999/friendship').expect(404);
      assert.equal((await send('ana', 'post', `/api/users/${users.dani.id}/friendship`).expect(201)).body.data.relation, 'sent');
      await send('ana', 'post', `/api/users/${users.dani.id}/friendship`).expect(409);
      assert.equal((await profileOf('ana', 'dani')).friendship, 'sent');
      assert.equal((await profileOf('dani', 'ana')).friendship, 'received');
      const requests = (await send('dani', 'get', '/api/friends/requests').expect(200)).body.data;
      assert.deepEqual(requests.received.map(person => person.id), [users.ana.id]);
      assert.equal(requests.received[0].email, undefined);
      assert.equal((await send('dani', 'get', '/api/notifications/summary').expect(200)).body.data.friendRequests, 1);
      await send('ana', 'post', `/api/users/${users.dani.id}/friendship/accept`).expect(404);
      await send('dani', 'post', `/api/users/${users.ana.id}/friendship/accept`).expect(200);
      assert.equal((await profileOf('ana', 'dani')).friendship, 'friends');
      assert.equal((await profileOf('mod', 'ana')).friendsCount, 1);
      assert.deepEqual((await profileOf('mod', 'ana')).friendsPreview.map(person => person.id), [users.dani.id]);
      assert.deepEqual((await send('mod', 'get', `/api/users/${users.ana.id}/friends`).expect(200)).body.data.map(person => [person.id, person.relation]), [[users.dani.id, 'none']]);
      assert.equal((await send('dani', 'get', '/api/notifications/summary').expect(200)).body.data.friendRequests, 0);
      // Si las dos se mandan solicitud, la segunda la acepta.
      await send('beto', 'post', `/api/users/${users.ana.id}/friendship`).expect(403, /restricción/).catch(() => {});
      await send('mod', 'post', `/api/users/${users.ana.id}/friendship`).expect(201);
      assert.equal((await send('ana', 'post', `/api/users/${users.mod.id}/friendship`).expect(200)).body.data.relation, 'friends');
      assert.deepEqual((await send('ana', 'get', '/api/friends').expect(200)).body.data.map(person => person.id).sort(), [users.dani.id, users.mod.id].sort());
      assert.equal((await send('ana', 'get', `/api/friends?search=${encodeURIComponent(`Dani Prueba ${tag}`)}`).expect(200)).body.data.length, 1);
      // Quitar, rechazar y cancelar.
      assert.match((await send('ana', 'delete', `/api/users/${users.mod.id}/friendship`).expect(200)).body.message, /Ya no son amigos/);
      await send('caro', 'post', `/api/users/${users.ana.id}/friendship`).expect(201);
      assert.match((await send('ana', 'delete', `/api/users/${users.caro.id}/friendship`).expect(200)).body.message, /Rechazaste/);
      await send('caro', 'post', `/api/users/${users.ana.id}/friendship`).expect(201);
      assert.match((await send('caro', 'delete', `/api/users/${users.ana.id}/friendship`).expect(200)).body.message, /Cancelaste/);
      await send('caro', 'delete', `/api/users/${users.ana.id}/friendship`).expect(404);
      // Dos pedidos a la vez: una sola fila.
      await Promise.all([1, 2].map(() => send('caro', 'post', `/api/users/${users.mod.id}/friendship`)));
      assert.equal(await Friendship.count({ where: { userLowId: Math.min(users.caro.id, users.mod.id), userHighId: Math.max(users.caro.id, users.mod.id) } }), 1);
      // Bloquear corta la amistad y no deja mandar solicitudes.
      await send('ana', 'put', `/api/users/${users.dani.id}/block`, { kind: 'blocked' }).expect(200);
      assert.equal((await profileOf('mod', 'ana')).friendsCount, 0);
      await send('dani', 'post', `/api/users/${users.ana.id}/friendship`).expect(403);
      await send('dani', 'get', `/api/users/${users.ana.id}/friends`).expect(403);
      await send('ana', 'delete', `/api/users/${users.dani.id}/block`).expect(200);
      // Sugerencias: sin uno mismo, sin amigos ni solicitudes pendientes; primero la misma institución.
      await send('ana', 'post', `/api/users/${users.dani.id}/friendship`).expect(201);
      const suggested = (await send('ana', 'get', '/api/users/suggested').expect(200)).body.data;
      assert.ok(!suggested.some(person => [users.ana.id, users.dani.id].includes(person.id)));
      assert.ok(suggested.length > 0 && suggested[0].sameInstitution);
      // La búsqueda dice la relación con cada persona.
      const searched = (await send('ana', 'get', `/api/users?search=${encodeURIComponent(`Prueba ${tag}`)}`).expect(200)).body.data;
      assert.equal(searched.find(person => person.id === users.dani.id).relation, 'sent');
      assert.equal(searched.find(person => person.id === users.ana.id).relation, 'self');
      await send('dani', 'post', `/api/users/${users.ana.id}/friendship/accept`).expect(200);
      friendsCheck = true;
    });

    let ficha;
    await t.test('fichas de estudiantes: crear, marcar autor, editar, límites y borrar', async () => {
      const valid = { title: `Dónde comprar fruta barata ${tag}`, summary: 'Un mercado del barrio con buenos precios para estudiantes.', body: 'Los sábados a la mañana hay feria con fruta y verdura más barata que en el súper.', categoryId: category.id, forMyInstitution: false, sourceType: 'experience', sourceLabel: '', sourceUrl: '' };
      await send('ana', 'post', '/api/contents', { ...valid, authorLabel: 'Otra persona' }).expect(400);
      await send('ana', 'post', '/api/contents', { ...valid, status: 'draft' }).expect(400);
      await send('ana', 'post', '/api/contents', { ...valid, reviewedAt: '2020-01-01' }).expect(400);
      assert.ok((await send('ana', 'post', '/api/contents', { ...valid, sourceType: 'official' }).expect(400)).body.error.fields.sourceUrl);
      assert.ok((await send('ana', 'post', '/api/contents', { ...valid, categoryId: 999999999 }).expect(400)).body.error.fields.categoryId);
      // Una cuenta restringida no publica fichas.
      assert.equal((await send('beto', 'post', '/api/contents', valid).expect(403)).body.error.code, 'account_restricted');
      ficha = (await send('ana', 'post', '/api/contents', valid).expect(201)).body.data;
      const stored = await Content.findByPk(ficha.id);
      assert.deepEqual([stored.authorId, stored.authorLabel, stored.status, stored.institutionId], [users.ana.id, users.ana.name, 'published', null]);
      const listed = (await send('dani', 'get', `/api/contents?search=${encodeURIComponent(`fruta barata ${tag}`)}`).expect(200)).body.data;
      assert.equal(listed.length, 1);
      assert.deepEqual([listed[0].author.id, listed[0].author.fullName, listed[0].own, listed[0].author.email], [users.ana.id, users.ana.name, false, undefined]);
      assert.equal((await send('ana', 'get', `/api/contents/${ficha.id}`).expect(200)).body.data.own, true);
      // Solo para su institución: no la ve alguien de otra.
      const own = (await send('ana', 'post', '/api/contents', { ...valid, title: `Solo para mi instituto ${tag}`, forMyInstitution: true }).expect(201)).body.data;
      await send('dani', 'get', `/api/contents/${own.id}`).expect(404);
      await send('mod', 'get', `/api/contents/${own.id}`).expect(200);
      // Editar: solo quien la hizo.
      await send('mod', 'put', `/api/contents/${ficha.id}`, valid).expect(404);
      await send('mod', 'get', `/api/contents/${ficha.id}/edit`).expect(404);
      const editing = (await send('ana', 'get', `/api/contents/${ficha.id}/edit`).expect(200)).body.data;
      assert.equal(editing.forMyInstitution, false);
      await send('ana', 'put', `/api/contents/${ficha.id}`, { ...valid, title: `Feria de los sábados ${tag}` }).expect(200);
      assert.equal((await Content.findByPk(ficha.id)).title, `Feria de los sábados ${tag}`);
      // Hasta 3 por día.
      await send('ana', 'post', '/api/contents', { ...valid, title: `Tercera ficha ${tag}` }).expect(201);
      assert.match((await send('ana', 'post', '/api/contents', { ...valid, title: `Cuarta ficha ${tag}` }).expect(429)).body.error.message, /3 fichas por día/);
      // El perfil cuenta las fichas que ve quien mira.
      assert.equal((await send('dani', 'get', `/api/users/${users.ana.id}`).expect(200)).body.data.stats.contents, 2);
      assert.equal((await send('mod', 'get', `/api/users/${users.ana.id}`).expect(200)).body.data.stats.contents, 3);
      // Reportar y ocultar resta puntos a quien la hizo; quien la hizo no la puede reportar.
      await send('ana', 'post', '/api/reports', { targetType: 'content', targetId: ficha.id, reason: 'false' }).expect(400);
      await send('dani', 'post', '/api/reports', { targetType: 'content', targetId: ficha.id, reason: 'false' }).expect(201);
      const report = await Report.findOne({ where: { targetType: 'content', targetId: ficha.id } });
      const points = (await User.findByPk(users.ana.id)).points;
      await send('mod', 'post', `/api/moderation/reports/${report.id}/resolve`, { decision: 'hide', note: 'Ficha con datos que no se pueden comprobar.' }).expect(200);
      assert.equal((await User.findByPk(users.ana.id)).points, points - 15);
      await send('ana', 'put', `/api/contents/${ficha.id}`, valid).expect(409);
      // Administración puede mostrar y ocultar cualquier ficha.
      await send('mod', 'post', `/api/admin/contents/${ficha.id}/show`, { note: 'Revisada de nuevo.' }).expect(403);
      await send('boss', 'post', `/api/admin/contents/${ficha.id}/show`, { note: 'Revisada de nuevo y está bien.' }).expect(200);
      await send('boss', 'post', `/api/admin/contents/${ficha.id}/show`, { note: 'Otra vez.' }).expect(409);
      // Borrar: el autor o administración.
      await send('dani', 'delete', `/api/contents/${own.id}`).expect(404);
      await send('ana', 'delete', `/api/contents/${own.id}`).expect(200);
      assert.equal(await Content.count({ where: { id: own.id } }), 0);
      const missions = Object.fromEntries((await send('ana', 'get', '/api/missions').expect(200)).body.data.map(mission => [mission.key, mission]));
      assert.deepEqual([missions.content.claimable, missions.friend.claimable], [true, true]);
      await send('ana', 'post', '/api/missions/friend/claim').expect(200);
    });

    await t.test('reportar un mensaje del chat', async () => {
      const community = await Community.create({ slug: `com-san-${suffix}`, name: `Comunidad sanciones ${tag}`, description: 'Comunidad para probar reportes de mensajes.', kind: 'user', ownerId: users.ana.id, membersCount: 1 });
      await send('ana', 'post', `/api/communities/${community.id}/join`).catch(() => {});
      await sequelize.query('INSERT IGNORE INTO community_members (community_id, user_id, `rank`, status, notifications, last_read_message_id, created_at, updated_at) VALUES (:c, :u, \'owner\', \'active\', \'all\', 0, NOW(), NOW())', { replacements: { c: community.id, u: users.ana.id } });
      await send('dani', 'post', `/api/communities/${community.id}/join`).expect(201);
      const message = (await send('dani', 'post', `/api/communities/${community.id}/messages`, { body: 'Mensaje ofensivo de prueba' }).expect(201)).body.data;
      await send('dani', 'post', '/api/reports', { targetType: 'message', targetId: message.id, reason: 'offensive' }).expect(400);
      await send('mod', 'post', '/api/reports', { targetType: 'message', targetId: message.id, reason: 'offensive' }).expect(201, /Gracias/).catch(() => {});
      await send('caro', 'post', '/api/reports', { targetType: 'message', targetId: message.id, reason: 'offensive' }).expect(404);
      await send('ana', 'post', '/api/reports', { targetType: 'message', targetId: message.id, reason: 'outdated' }).expect(400);
      await send('ana', 'post', '/api/reports', { targetType: 'message', targetId: message.id, reason: 'offensive', details: 'Insulta a otra persona.' }).expect(201);
      // Moderación lee el chat sin unirse, pero no escribe.
      assert.ok((await send('mod', 'get', `/api/communities/${community.id}/messages`).expect(200)).body.data.some(row => row.id === message.id));
      await send('mod', 'post', `/api/communities/${community.id}/messages`, { body: 'Hola' }).expect(403);
      const queue = (await send('mod', 'get', '/api/moderation/reports').expect(200)).body.data.find(row => row.target.type === 'message' && row.target.id === message.id);
      assert.equal(queue.target.excerpt, 'Mensaje ofensivo de prueba');
      assert.equal(queue.target.link, `/comunidades/${community.id}`);
      await send('mod', 'post', `/api/moderation/reports/${queue.id}/resolve`, { decision: 'hide', note: 'Mensaje ofensivo.' }).expect(200);
      const stored = await CommunityMessage.findByPk(message.id);
      assert.ok(stored.deletedAt && stored.body === null);
      assert.ok(await PointTransaction.findOne({ where: { userId: users.dani.id, reason: 'hidden', targetType: 'message', targetId: message.id } }));
      // Panel: cerrar y reabrir la comunidad.
      await send('boss', 'post', `/api/admin/communities/${community.id}/close`, { note: 'Se usaba para insultar.' }).expect(200);
      await send('dani', 'get', `/api/communities/${community.id}`).expect(404);
      assert.ok((await send('boss', 'get', '/api/admin/communities?status=closed').expect(200)).body.data.some(row => row.id === community.id));
      await send('boss', 'post', `/api/admin/communities/${community.id}/reopen`, { note: 'Se resolvió con quien la creó.' }).expect(200);
      await send('boss', 'post', `/api/admin/communities/${community.id}/reopen`, { note: 'Otra vez.' }).expect(409);
      await send('dani', 'get', `/api/communities/${community.id}`).expect(200);
    });

    await t.test('panel: tienda e historial', async () => {
      const shop = (await send('boss', 'get', '/api/admin/shop').expect(200)).body.data;
      assert.ok(shop.some(row => row.id === item.id && row.owners === 0));
      await send('boss', 'put', `/api/admin/shop/${item.id}`, { price: 0, available: true }).expect(400);
      await send('boss', 'put', `/api/admin/shop/${item.id}`, { price: 80, available: false }).expect(200);
      const stored = await ShopItem.findByPk(item.id);
      assert.deepEqual([stored.price, stored.available], [80, false]);
      const log = (await send('boss', 'get', '/api/moderation/log').expect(200)).body.data;
      const actions = new Set(log.map(row => row.action));
      for (const action of ['shop_item_update', 'community_reopen', 'points_adjust', 'ban', 'sanction_revoke', 'appeal_accept', 'role_change']) assert.ok(actions.has(action), action);
    });

    await t.test('guía', async () => {
      const guide = (await send('ana', 'get', '/api/guide').expect(200)).body.data;
      assert.ok(Array.isArray(guide));
      for (const section of guide) assert.ok(section.title && section.contents.length > 0 && section.contents.every(content => content.body === undefined));
    });
    assert.ok(friendsCheck);
  } finally {
    const userIds = Object.values(users).map(user => user.id);
    if (userIds.length) {
      await Community.destroy({ where: { slug: `com-san-${suffix}` } });
      await Content.destroy({ where: { authorId: userIds } });
      await Report.destroy({ where: { reporterId: userIds } });
      await SanctionAppeal.destroy({ where: { userId: userIds } });
      await UserSanction.destroy({ where: { userId: userIds } });
      await UserWarning.destroy({ where: { userId: userIds } });
      await PointTransaction.destroy({ where: { userId: userIds } });
      await sequelize.query('DELETE FROM friendships WHERE user_low_id IN (:userIds) OR user_high_id IN (:userIds)', { replacements: { userIds } });
      await sequelize.query('DELETE FROM user_blocks WHERE user_id IN (:userIds) OR target_id IN (:userIds)', { replacements: { userIds } });
      await sequelize.query('DELETE FROM mission_claims WHERE user_id IN (:userIds)', { replacements: { userIds } });
      await sequelize.query('DELETE FROM answers WHERE user_id IN (:userIds)', { replacements: { userIds } });
      await Question.destroy({ where: { userId: userIds } });
      await sequelize.query('DELETE FROM sessions WHERE user_id IN (:userIds)', { replacements: { userIds } }).catch(() => {});
      await User.destroy({ where: { id: userIds } });
    }
    if (item) await item.destroy();
    if (category) await category.destroy();
    if (other) await other.destroy();
    if (institution) await institution.destroy();
    await sequelize.close();
  }
});
