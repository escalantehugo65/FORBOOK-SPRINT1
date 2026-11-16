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
import { Community } from '../src/models/community.model.js';
import { CommunityMember } from '../src/models/community_member.model.js';
import { CommunityMessage } from '../src/models/community_message.model.js';
import { CommunityAttachment } from '../src/models/community_attachment.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';
import { MissionClaim } from '../src/models/mission_claim.model.js';
import { runMigrations } from '../migrations/runner.js';
import { periodsAt } from '../src/helpers/mission.helper.js';
import { abilitiesOf } from '../src/helpers/community.helper.js';
import { app } from '../app.js';
import { withExif, png } from './fixtures/images.js';

test('jerarquía de una comunidad (sin base de datos)', () => {
  const member = (rank, role = null, status = 'active') => ({ rank, role, status });
  assert.deepEqual(abilitiesOf(null, 'student'), { level: 0, isMember: false, canEdit: false, canManage: false, canModerate: false });
  assert.equal(abilitiesOf(member('owner'), 'student').canEdit, true);
  assert.deepEqual(abilitiesOf(member('admin'), 'student'), { level: 2, isMember: true, canEdit: false, canManage: true, canModerate: true });
  assert.equal(abilitiesOf(member('member', { canModerate: true }), 'student').canModerate, true);
  assert.equal(abilitiesOf(member('member', { canModerate: true }), 'student').canManage, false);
  assert.equal(abilitiesOf(member('owner', null, 'banned'), 'student').level, 0, 'una persona expulsada no conserva permisos');
  assert.equal(abilitiesOf(null, 'admin').canEdit, true, 'la administración de Forbook manda sin ser miembro');
  assert.deepEqual(abilitiesOf(null, 'moderator'), { level: 0, isMember: false, canEdit: false, canManage: false, canModerate: true });
});

test('semana de las misiones: empieza el lunes, hora de la Argentina', () => {
  // Domingo 15/11/2026 a las 23:30 de la Argentina = lunes 16 a las 02:30 UTC.
  const sunday = periodsAt(new Date('2026-11-16T02:30:00Z'));
  assert.equal(sunday.day.key, '2026-11-15');
  assert.equal(sunday.week.key, '2026-11-09');
  const monday = periodsAt(new Date('2026-11-16T03:00:00Z'));
  assert.equal(monday.day.key, '2026-11-16');
  assert.equal(monday.week.key, '2026-11-16');
  assert.equal(monday.week.endsAt.toISOString(), '2026-11-23T03:00:00.000Z');
});

// Comunidades: crear, unirse, roles y jerarquía, chat con imagen y audio, avisos, bloqueos y misiones.
test('comunidades sobre MySQL', { skip: !process.env.TEST_DB_NAME }, async t => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tag = suffix.replace(/[^a-z0-9]/g, '').slice(-8);
  const users = {};
  let institution, category;
  try {
    await sequelize.authenticate();
    await runMigrations();
    institution = await Institution.create({ name: `Instituto comunidades ${suffix}`, sourceUrl: 'https://example.com' });
    category = await Category.create({ name: `Comunidades ${suffix}`, slug: `com-${suffix}`, description: 'Datos ficticios para pruebas' });
    const passwordHash = await bcrypt.hash('Una-clave-segura-123', 4);
    for (const [key, role] of [['olga', 'student'], ['ada', 'student'], ['mia', 'student'], ['leo', 'student'], ['staff', 'admin'], ['mod', 'moderator']]) {
      users[key] = await User.create({ name: `${key[0].toUpperCase()}${key.slice(1)} Prueba ${tag}`, email: `${key}-com-${suffix}@example.com`, passwordHash, origin: 'Pruebas', institutionId: institution.id, career: 'Carrera de prueba', arrivalStatus: 'arrived', role });
    }
    const agents = {};
    for (const key of Object.keys(users)) {
      agents[key] = request.agent(app);
      await agents[key].post('/api/auth/login').set('Origin', config.frontendUrl).send({ email: users[key].email, password: 'Una-clave-segura-123' }).expect(200);
    }
    const send = (key, method, path, data = {}) => agents[key][method](path).set('Origin', config.frontendUrl).send(data);
    const valid = { name: `Barrio de prueba ${tag}`, description: 'Una comunidad creada por las pruebas automáticas.', rules: 'Respetarse.', topic: 'barrio', color: 'menta' };
    const jpeg = withExif;
    const original = Buffer.from(withExif.split(',')[1], 'base64');
    // Cabecera mínima de un WebM (EBML) rellenada hasta un tamaño creíble.
    const webm = `data:audio/webm;codecs=opus;base64,${Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(200, 1)]).toString('base64')}`;
    let community;

    await t.test('crear: validación, nombre repetido y máximo de 2 por estudiante', async () => {
      await request(app).get('/api/communities').expect(401);
      const bad = async (changes, field) => assert.ok((await send('olga', 'post', '/api/communities', { ...valid, ...changes }).expect(400)).body.error.fields[field], field);
      await bad({ name: 'ab' }, 'name');
      await bad({ description: 'corta' }, 'description');
      await bad({ topic: 'politica' }, 'topic');
      await bad({ color: 'rojo' }, 'color');
      await send('olga', 'post', '/api/communities', { ...valid, kind: 'default' }).expect(400);
      community = (await send('olga', 'post', '/api/communities', valid).expect(201)).body.data;
      assert.equal((await send('ada', 'post', '/api/communities', { ...valid, name: valid.name.toUpperCase() }).expect(400)).body.error.fields.name, 'Ya hay una comunidad con ese nombre.');
      await send('olga', 'post', '/api/communities', { ...valid, name: `Segunda ${tag}` }).expect(201);
      const third = await send('olga', 'post', '/api/communities', { ...valid, name: `Tercera ${tag}` }).expect(409);
      assert.match(third.body.error.message, /hasta 2 comunidades/);
      const list = (await send('olga', 'get', `/api/communities?scope=mine`).expect(200)).body;
      assert.equal(list.meta.owned, 2);
      assert.equal(list.meta.canCreate, false);
      assert.ok(list.data.every(row => row.joined && row.rank === 'owner'));
      const detail = (await send('olga', 'get', `/api/communities/${community.id}`).expect(200)).body.data;
      assert.equal(detail.membership.rank, 'owner');
      assert.equal(detail.membersCount, 1);
      assert.deepEqual(detail.abilities, { isMember: true, canEdit: true, canManage: true, canModerate: true });
      assert.equal(detail.owner.email, undefined);
    });

    await t.test('buscar, unirse y salir', async () => {
      const found = (await send('ada', 'get', `/api/communities?search=${encodeURIComponent(`barrio de prueba ${tag}`)}`).expect(200)).body.data;
      assert.deepEqual(found.map(row => [row.id, row.joined]), [[community.id, false]]);
      await send('ada', 'get', '/api/communities?search=a').expect(400);
      await send('ada', 'get', '/api/communities?topic=otra').expect(400);
      // Sin ser miembro se ve la portada, pero no el chat ni los miembros.
      assert.equal((await send('ada', 'get', `/api/communities/${community.id}`).expect(200)).body.data.membership, null);
      await send('ada', 'get', `/api/communities/${community.id}/messages`).expect(403);
      await send('ada', 'get', `/api/communities/${community.id}/members`).expect(403);
      await send('ada', 'post', `/api/communities/${community.id}/messages`, { body: 'Hola' }).expect(403);
      for (const key of ['ada', 'mia', 'leo']) await send(key, 'post', `/api/communities/${community.id}/join`).expect(201);
      await send('ada', 'post', `/api/communities/${community.id}/join`).expect(409);
      assert.equal((await Community.findByPk(community.id)).membersCount, 4);
      await send('leo', 'delete', `/api/communities/${community.id}/membership`).expect(200);
      await send('leo', 'delete', `/api/communities/${community.id}/membership`).expect(403);
      assert.equal((await Community.findByPk(community.id)).membersCount, 3);
      await send('leo', 'post', `/api/communities/${community.id}/join`).expect(201);
      assert.match((await send('olga', 'delete', `/api/communities/${community.id}/membership`).expect(409)).body.error.message, /no podés salir/);
      await send('ada', 'get', '/api/communities/999999999').expect(404);
    });

    let role;
    await t.test('roles y jerarquía: dueño > administradores > miembros', async () => {
      const base = `/api/communities/${community.id}`;
      await send('ada', 'post', `${base}/roles`, { name: 'Veterano', color: 'coral', canModerate: false }).expect(403);
      await send('ada', 'put', `${base}/members/${users.mia.id}`, { rank: 'admin' }).expect(403);
      await send('olga', 'post', `${base}/roles`, { name: 'V', color: 'coral', canModerate: false }).expect(400);
      role = (await send('olga', 'post', `${base}/roles`, { name: 'Veterano', color: 'coral', canModerate: false }).expect(201)).body.data;
      assert.ok((await send('olga', 'post', `${base}/roles`, { name: 'veterano', color: 'azul', canModerate: false }).expect(400)).body.error.fields.name);
      // El dueño nombra administradora a Ada; Ada crea roles y los asigna, pero no da permiso de moderar ni nombra administradores.
      await send('olga', 'put', `${base}/members/${users.ada.id}`, { rank: 'admin' }).expect(200);
      const helper = (await send('ada', 'post', `${base}/roles`, { name: 'Ayudante', color: 'azul', canModerate: false }).expect(201)).body.data;
      await send('ada', 'post', `${base}/roles`, { name: 'Guardia', color: 'azul', canModerate: true }).expect(403);
      await send('ada', 'put', `${base}/roles/${helper.id}`, { name: 'Ayudante', color: 'menta', canModerate: true }).expect(403);
      await send('ada', 'put', `${base}/members/${users.mia.id}`, { roleId: role.id }).expect(200);
      await send('ada', 'put', `${base}/members/${users.mia.id}`, { rank: 'admin' }).expect(403);
      await send('ada', 'put', `${base}/members/${users.olga.id}`, { roleId: role.id }).expect(403);
      await send('ada', 'put', `${base}/members/${users.mia.id}`, {}).expect(400);
      await send('ada', 'put', `${base}/members/${users.mia.id}`, { roleId: 999999999 }).expect(400);
      await send('ada', 'delete', `${base}/members/${users.olga.id}`).expect(403);
      await send('olga', 'put', `${base}/members/${users.olga.id}`, { rank: 'member' }).expect(409);
      // La administración de Forbook puede crear roles sin ser miembro; moderación, no.
      const official = (await send('staff', 'post', `${base}/roles`, { name: 'Oficial', color: 'rio', canModerate: true }).expect(201)).body.data;
      await send('mod', 'post', `${base}/roles`, { name: 'Otro', color: 'rio', canModerate: false }).expect(403);
      await send('olga', 'put', `${base}/members/${users.leo.id}`, { roleId: official.id }).expect(200);
      const members = (await send('mia', 'get', `${base}/members`).expect(200)).body.data;
      assert.deepEqual(members.map(member => [member.name.split(' ')[0], member.rank, member.role?.name ?? null]), [['Olga', 'owner', null], ['Ada', 'admin', null], ['Leo', 'member', 'Oficial'], ['Mia', 'member', 'Veterano']]);
      assert.ok(members.every(member => member.email === undefined && !member.manageable));
      assert.deepEqual((await send('ada', 'get', `${base}/members`).expect(200)).body.data.map(member => member.manageable), [false, false, true, true]);
      assert.equal((await send('mia', 'get', `${base}/members?search=leo`).expect(200)).body.data.length, 1);
      await send('ada', 'delete', `${base}/roles/${helper.id}`).expect(200);
      await send('ada', 'delete', `${base}/roles/${official.id}`).expect(403);
      await send('olga', 'put', `${base}/members/${users.mia.id}`, { roleId: null }).expect(200);
      assert.equal((await CommunityMember.findOne({ where: { communityId: community.id, userId: users.mia.id } })).roleId, null);
      await send('ada', 'put', `${base}/members/${users.mia.id}`, { roleId: role.id }).expect(200);
    });

    let imageId, audioId;
    await t.test('chat: texto, imagen sin metadatos, audio, borrado y páginas', async () => {
      const base = `/api/communities/${community.id}/messages`;
      const post = (key, data, status = 201) => send(key, 'post', base, data).expect(status);
      assert.ok((await post('ada', {}, 400)).body.error.fields.body);
      assert.ok((await post('ada', { body: '   ' }, 400)).body.error.fields.body);
      assert.ok((await post('ada', { body: 'x'.repeat(1001) }, 400)).body.error.fields.body);
      assert.ok((await post('ada', { image: png }, 400)).body.error.fields.image);
      assert.ok((await post('ada', { image: jpeg, audio: webm, seconds: 3 }, 400)).body.error.fields.image);
      assert.ok((await post('ada', { audio: webm }, 400)).body.error.fields.seconds);
      assert.ok((await post('ada', { audio: webm, seconds: 61 }, 400)).body.error.fields.seconds);
      assert.ok((await post('ada', { audio: `data:audio/webm;base64,${Buffer.alloc(200, 7).toString('base64')}`, seconds: 3 }, 400)).body.error.fields.audio, 'no es un WebM de verdad');
      assert.ok((await post('ada', { audio: `data:text/html;base64,${Buffer.from('<script>alert(1)</script>'.repeat(4)).toString('base64')}`, seconds: 3 }, 400)).body.error.fields.audio);
      await post('ada', { body: 'Hola', html: '<b>' }, 400);

      const first = (await post('ada', { body: '  Hola a todos <b>negrita</b>  ' })).body.data;
      assert.equal(first.body, 'Hola a todos <b>negrita</b>', 'se guarda como texto; la página nunca lo interpreta como HTML');
      assert.equal(first.author.name, 'Ada');
      assert.equal(first.author.rank, 'admin');
      assert.equal(first.author.email, undefined);
      const image = (await post('mia', { image: jpeg, body: 'Mi cuadra' })).body.data;
      imageId = image.id;
      assert.equal(image.kind, 'image');
      assert.equal(image.author.role.name, 'Veterano');
      assert.ok(image.attachment.width > 0 && image.attachment.height > 0);
      const stored = await CommunityAttachment.findByPk(image.id);
      assert.ok(original.includes('Exif') && stored.data.length < original.length && !stored.data.includes('Exif'), 'la imagen se guarda sin EXIF');
      const audio = (await post('leo', { audio: webm, seconds: 4 })).body.data;
      audioId = audio.id;
      assert.deepEqual(audio.attachment, { width: null, height: null, seconds: 4 });

      const file = await send('olga', 'get', `${base}/${image.id}/attachment`).expect(200);
      assert.equal(file.headers['content-type'], 'image/jpeg');
      assert.equal(file.headers['x-content-type-options'], 'nosniff');
      assert.match(file.headers['cache-control'], /private/);
      assert.equal((await send('olga', 'get', `${base}/${audio.id}/attachment`).expect(200)).headers['content-type'], 'audio/webm');
      await send('ada', 'get', `${base}/${first.id}/attachment`).expect(404);
      await request(app).get(`${base}/${image.id}/attachment`).expect(401);

      const all = (await send('olga', 'get', base).expect(200)).body;
      assert.deepEqual(all.data.map(message => message.kind), ['text', 'image', 'audio']);
      assert.deepEqual(all.data.map(message => message.canDelete), [true, true, true], 'la dueña puede borrar todos');
      assert.deepEqual((await send('mia', 'get', base).expect(200)).body.data.map(message => message.canDelete), [false, true, false]);
      assert.deepEqual((await send('leo', 'get', base).expect(200)).body.data.map(message => message.canDelete), [true, true, true], 'su rol puede moderar');
      assert.deepEqual((await send('olga', 'get', `${base}?after=${first.id}`).expect(200)).body.data.map(message => message.id), [image.id, audio.id]);
      assert.deepEqual((await send('olga', 'get', `${base}?before=${image.id}`).expect(200)).body.data.map(message => message.id), [first.id]);
      await send('olga', 'get', `${base}?before=5&after=2`).expect(400);

      // Mia no puede borrar el de Ada; Ada (administradora) borra la imagen de Mia y el archivo desaparece de la base.
      await send('mia', 'delete', `${base}/${first.id}`).expect(403);
      await send('ada', 'delete', `${base}/${image.id}`).expect(200);
      await send('ada', 'delete', `${base}/${image.id}`).expect(409);
      assert.equal(await CommunityAttachment.count({ where: { messageId: image.id } }), 0);
      await send('olga', 'get', `${base}/${image.id}/attachment`).expect(404);
      const after = (await send('olga', 'get', `${base}?after=${audio.id}`).expect(200)).body;
      assert.ok(after.meta.deletedIds.includes(image.id));
      const deleted = (await send('olga', 'get', base).expect(200)).body.data.find(message => message.id === image.id);
      assert.deepEqual([deleted.deleted, deleted.body, deleted.attachment, deleted.canDelete], [true, null, null, false]);
      // Moderación de Forbook borra sin ser miembro, pero no puede escribir.
      await send('mod', 'delete', `${base}/${audio.id}`).expect(200);
      await post('mod', { body: 'Hola' }, 403);

      for (let n = 1; n <= 45; n += 1) await CommunityMessage.create({ communityId: community.id, userId: users.olga.id, body: `Mensaje ${n}`, createdAt: new Date(Date.now() - 3600000) });
      const page = (await send('ada', 'get', base).expect(200)).body;
      assert.equal(page.data.length, 40);
      assert.equal(page.meta.hasMore, true);
      assert.equal(page.data[39].body, 'Mensaje 45');
      const older = (await send('ada', 'get', `${base}?before=${page.data[0].id}`).expect(200)).body;
      assert.equal(older.data.length, 8);
      assert.equal(older.meta.hasMore, false);
    });

    await t.test('freno al spam', async () => {
      const base = `/api/communities/${community.id}/messages`;
      for (let n = 1; n <= 14; n += 1) await send('ada', 'post', base, { body: `Rápido ${n}` }).expect(201);
      assert.match((await send('ada', 'post', base, { body: 'Uno más' }).expect(429)).body.error.message, /muy rápido/);
      await CommunityMessage.update({ createdAt: new Date(Date.now() - 120000) }, { where: { userId: users.ada.id }, silent: true });
    });

    await t.test('avisos: sin leer, silenciar y total del menú', async () => {
      const base = `/api/communities/${community.id}`;
      const unreadOf = async key => (await send(key, 'get', '/api/communities?scope=mine').expect(200)).body.data.find(row => row.id === community.id).unread;
      const totalOf = async key => (await send(key, 'get', '/api/communities/unread').expect(200)).body.data.total;
      await send('mia', 'get', `${base}/messages`).expect(200);
      assert.equal(await unreadOf('mia'), 0, 'al abrir el chat queda todo leído');
      await send('olga', 'post', `${base}/messages`, { body: 'Aviso uno' }).expect(201);
      await send('olga', 'post', `${base}/messages`, { body: 'Aviso dos' }).expect(201);
      await send('mia', 'post', `${base}/messages`, { body: 'El mío no cuenta' }).expect(201);
      assert.equal(await unreadOf('mia'), 2);
      assert.equal(await totalOf('mia'), 2);
      assert.equal((await send('mia', 'put', `${base}/membership`, { notifications: 'muted' }).expect(200)).body.data.notifications, 'muted');
      assert.equal(await totalOf('mia'), 0, 'silenciada: no suma al aviso del menú');
      assert.equal(await unreadOf('mia'), 2, 'pero en la lista se sigue viendo cuántos hay');
      await send('mia', 'put', `${base}/membership`, { notifications: 'siempre' }).expect(400);
      await send('mia', 'put', `${base}/membership`, { notifications: 'all' }).expect(200);
      await send('mia', 'get', `${base}/messages`).expect(200);
      assert.equal(await totalOf('mia'), 0);
    });

    await t.test('ocultar y bloquear personas', async () => {
      const base = `/api/communities/${community.id}/messages`;
      await send('mia', 'put', `/api/users/${users.mia.id}/block`, { kind: 'hidden' }).expect(400);
      await send('mia', 'put', '/api/users/999999999/block', { kind: 'hidden' }).expect(404);
      await send('mia', 'put', `/api/users/${users.leo.id}/block`, { kind: 'borrar' }).expect(400);
      await send('leo', 'post', base, { body: `Mensaje de Leo ${tag}` }).expect(201);
      const sees = async (key, text) => (await send(key, 'get', base).expect(200)).body.data.some(message => message.body === text);
      // Oculta: Mia deja de ver a Leo; Leo sigue viendo a Mia.
      await send('mia', 'put', `/api/users/${users.leo.id}/block`, { kind: 'hidden' }).expect(200);
      assert.equal(await sees('mia', `Mensaje de Leo ${tag}`), false);
      await send('mia', 'post', base, { body: `Mensaje de Mia ${tag}` }).expect(201);
      assert.equal(await sees('leo', `Mensaje de Mia ${tag}`), true);
      assert.equal((await send('mia', 'get', `/api/users/${users.leo.id}`).expect(200)).body.data.relation, 'hidden');
      assert.equal((await send('leo', 'get', `/api/users/${users.mia.id}`).expect(200)).body.data.relation, null, 'la otra persona no se entera');
      // Bloqueada: ninguna ve a la otra y Leo no puede ver el perfil de Mia. Moderación sí.
      await send('mia', 'put', `/api/users/${users.leo.id}/block`, { kind: 'blocked' }).expect(200);
      assert.equal(await sees('leo', `Mensaje de Mia ${tag}`), false);
      await send('leo', 'get', `/api/users/${users.mia.id}`).expect(403);
      await send('mod', 'get', `/api/users/${users.mia.id}`).expect(200);
      await send('leo', 'post', base, { body: 'Otro de Leo' }).expect(201);
      assert.equal((await send('mia', 'get', '/api/communities?scope=mine').expect(200)).body.data.find(row => row.id === community.id).unread, 0, 'los mensajes de alguien bloqueado no avisan');
      const blocks = (await send('mia', 'get', '/api/blocks').expect(200)).body.data;
      assert.deepEqual(blocks.map(item => [item.kind, item.user.id]), [['blocked', users.leo.id]]);
      assert.equal(blocks[0].user.email, undefined);
      await send('mia', 'delete', `/api/users/${users.leo.id}/block`).expect(200);
      await send('mia', 'delete', `/api/users/${users.leo.id}/block`).expect(404);
      assert.equal(await sees('mia', `Mensaje de Leo ${tag}`), true);
      await send('leo', 'get', `/api/users/${users.mia.id}`).expect(200);
    });

    await t.test('expulsar y volver a permitir', async () => {
      const base = `/api/communities/${community.id}`;
      await send('mia', 'delete', `${base}/members/${users.leo.id}`).expect(403);
      await send('ada', 'delete', `${base}/members/${users.ada.id}`).expect(409);
      const before = (await Community.findByPk(community.id)).membersCount;
      await send('ada', 'delete', `${base}/members/${users.leo.id}`).expect(200);
      assert.equal((await Community.findByPk(community.id)).membersCount, before - 1);
      await send('leo', 'get', `${base}/messages`).expect(403);
      assert.match((await send('leo', 'post', `${base}/join`).expect(403)).body.error.message, /expulsaron/);
      assert.equal((await send('leo', 'get', base).expect(200)).body.data.membership.status, 'banned');
      await send('mia', 'get', `${base}/members?status=banned`).expect(403);
      assert.deepEqual((await send('ada', 'get', `${base}/members?status=banned`).expect(200)).body.data.map(member => member.userId), [users.leo.id]);
      assert.equal((await send('ada', 'get', base).expect(200)).body.data.bannedCount, 1);
      await send('ada', 'post', `${base}/members/${users.leo.id}/unban`).expect(200);
      await send('ada', 'post', `${base}/members/${users.leo.id}/unban`).expect(404);
      await send('leo', 'post', `${base}/join`).expect(201);
    });

    await t.test('misiones: avance, cobro una sola vez y puntos sin reputación', async () => {
      const status = async key => Object.fromEntries((await send(key, 'get', '/api/missions').expect(200)).body.data.map(mission => [mission.key, mission]));
      let mia = await status('mia');
      assert.deepEqual([mia.join.progress, mia.join.claimable], [1, true]);
      assert.deepEqual([mia.create.progress, mia.create.claimable], [0, false]);
      assert.equal(mia.image_daily.progress, 0, 'la imagen que le borraron no cuenta');
      assert.deepEqual([mia.chat_daily.progress, mia.chat_daily.goal, mia.chat_daily.claimable], [2, 5, false]);
      assert.match((await send('mia', 'post', '/api/missions/chat_daily/claim').expect(409)).body.error.message, /llevás 2 de 5/);
      await send('mia', 'post', '/api/missions/no_existe/claim').expect(404);
      await send('mia', 'post', '/api/missions/DROP TABLE/claim').expect(400);
      const before = await User.findByPk(users.mia.id, { attributes: ['points', 'reputation'] });
      const claim = (await send('mia', 'post', '/api/missions/join/claim').expect(200)).body.data;
      assert.deepEqual([claim.reward, claim.balance], [10, before.points + 10]);
      await send('mia', 'post', '/api/missions/join/claim').expect(409);
      const after = await User.findByPk(users.mia.id, { attributes: ['points', 'reputation'] });
      assert.deepEqual([after.points, after.reputation], [before.points + 10, before.reputation], 'las misiones no dan reputación');
      assert.equal((await status('mia')).join.claimed, true);
      // Dos cobros a la vez: uno solo entra.
      for (let n = 1; n <= 3; n += 1) await CommunityMessage.create({ communityId: community.id, userId: users.mia.id, body: `Charla ${n}` });
      const results = await Promise.all([1, 2].map(() => send('mia', 'post', '/api/missions/chat_daily/claim')));
      assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
      assert.equal(await MissionClaim.count({ where: { userId: users.mia.id, missionKey: 'chat_daily' } }), 1);
      // Responder una pregunta de otra persona cuenta; responder la propia, no.
      const ask = (key, title) => send(key, 'post', '/api/questions', { title, categoryId: category.id, forMyInstitution: false }).expect(201).then(response => response.body.data);
      const own = await ask('mia', `¿Pregunta propia de Mia ${tag}?`);
      const other = await ask('ada', `¿Pregunta de Ada ${tag}?`);
      await send('mia', 'post', `/api/questions/${own.id}/answers`, { body: 'Me respondo sola para probar.' }).expect(201);
      assert.equal((await status('mia')).answer_daily.progress, 0);
      await send('mia', 'post', `/api/questions/${other.id}/answers`, { body: 'Una respuesta para ayudar a Ada.' }).expect(201);
      mia = await status('mia');
      assert.deepEqual([mia.answer_daily.claimable, mia.answers_weekly.progress], [true, 1]);
      await send('mia', 'post', '/api/missions/answer_daily/claim').expect(200);
      const movements = (await send('mia', 'get', '/api/points').expect(200)).body.data.transactions.filter(row => row.reason === 'mission');
      assert.deepEqual(movements.map(row => row.amount).sort((a, b) => a - b), [5, 5, 10]);
      assert.equal((await status('olga')).create.claimable, true);
    });

    await t.test('editar y cerrar', async () => {
      const base = `/api/communities/${community.id}`;
      await send('ada', 'put', base, { ...valid, description: 'Cambio hecho por una administradora de la comunidad.' }).expect(403);
      await send('olga', 'put', base, { ...valid, name: `Segunda ${tag}` }).expect(400);
      assert.equal((await send('olga', 'put', base, { ...valid, description: 'Descripción nueva de la comunidad de prueba.', rules: '' }).expect(200)).body.data.id, community.id);
      assert.equal((await Community.findByPk(community.id)).rules, null);
      const official = await Community.create({ slug: `oficial-${suffix}`, name: `Oficial ${tag}`, description: 'Comunidad predeterminada de prueba.', kind: 'default', ownerId: null });
      await send('olga', 'delete', `/api/communities/${official.id}`).expect(403);
      await send('mod', 'delete', `/api/communities/${official.id}`).expect(403);
      await send('ada', 'delete', base).expect(403);
      await send('olga', 'delete', base).expect(200);
      await send('olga', 'get', base).expect(404);
      await send('mia', 'get', `${base}/messages`).expect(404);
      assert.ok(!(await send('mia', 'get', '/api/communities?scope=mine').expect(200)).body.data.some(row => row.id === community.id));
      // Al cerrar una, vuelve a tener lugar para crear otra.
      assert.equal((await send('olga', 'get', '/api/communities').expect(200)).body.meta.canCreate, true);
      await send('staff', 'delete', `/api/communities/${official.id}`).expect(200);
    });
  } finally {
    const userIds = Object.values(users).map(user => user.id);
    if (userIds.length) {
      const owned = await Community.findAll({ where: { ownerId: userIds }, attributes: ['id'] });
      await Community.destroy({ where: { id: owned.map(row => row.id) } });
      await Community.destroy({ where: { slug: `oficial-${suffix}` } });
      await PointTransaction.destroy({ where: { userId: userIds } });
      await sequelize.query('DELETE FROM answer_votes WHERE user_id IN (:userIds)', { replacements: { userIds } });
      await sequelize.query('DELETE FROM answers WHERE user_id IN (:userIds)', { replacements: { userIds } });
      await Question.destroy({ where: { userId: userIds } });
      await sequelize.query('DELETE FROM sessions WHERE user_id IN (:userIds)', { replacements: { userIds } }).catch(() => {});
      await User.destroy({ where: { id: userIds } });
    }
    if (category) await category.destroy();
    if (institution) await institution.destroy();
    await sequelize.close();
  }
});
