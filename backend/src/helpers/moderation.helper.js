import { Question } from '../models/question.model.js';
import { Answer } from '../models/answer.model.js';
import { Content } from '../models/content.model.js';
import { Category } from '../models/category.model.js';
import { Place } from '../models/place.model.js';
import { TravelRoute } from '../models/travel_route.model.js';
import { User } from '../models/user.model.js';
import { ModerationLog } from '../models/moderation_log.model.js';
import { CommunityMessage } from '../models/community_message.model.js';
import { Community } from '../models/community.model.js';
import { ShopItem } from '../models/shop_item.model.js';
import { shorten } from './text.helper.js';

// Deja constancia en el historial de moderación (FF-38). Va dentro de la misma transacción que el cambio.
export const saveModerationLog = (req, { action, targetType, targetId, note, reportId = null }, transaction) => ModerationLog.create(
  { moderatorId: req.session.userId, action, targetType, targetId, reportId, note: shorten(note, 500) },
  { transaction },
);

// Resumen de lo reportado o moderado, para mostrarlo en la cola y en el historial.
// Del contenido se manda solo lo necesario para decidir: nunca datos del autor.
export const describeTargets = async (rows) => {
  const ids = type => [...new Set(rows.filter(row => row.targetType === type).map(row => row.targetId))];
  const [questions, answers, contents, categories, places, profiles, routes, messages, communities, items] = await Promise.all([
    ids('question').length ? Question.findAll({ where: { id: ids('question') }, attributes: ['id', 'title', 'status', 'hiddenAt'] }) : [],
    ids('answer').length ? Answer.findAll({ where: { id: ids('answer') }, attributes: ['id', 'body', 'hiddenAt', 'questionId'], include: [{ model: Question, as: 'question', attributes: ['id', 'title', 'hiddenAt'] }] }) : [],
    ids('content').length ? Content.findAll({ where: { id: ids('content') }, attributes: ['id', 'title', 'status', 'hiddenAt'] }) : [],
    ids('category').length ? Category.findAll({ where: { id: ids('category') }, attributes: ['id', 'name'] }) : [],
    ids('place').length ? Place.findAll({ where: { id: ids('place') }, attributes: ['id', 'name', 'status', 'hiddenAt'] }) : [],
    ids('profile').length ? User.findAll({ where: { id: ids('profile') }, attributes: ['id', 'name', 'bio', 'bioHiddenAt'] }) : [],
    ids('route').length ? TravelRoute.findAll({ where: { id: ids('route') }, attributes: ['id', 'title', 'status', 'hiddenAt'] }) : [],
    ids('message').length ? CommunityMessage.findAll({ where: { id: ids('message') }, attributes: ['id', 'kind', 'body', 'deletedAt', 'communityId'], include: [{ model: Community, as: 'community', attributes: ['id', 'name'] }] }) : [],
    ids('community').length ? Community.findAll({ where: { id: ids('community') }, attributes: ['id', 'name', 'closedAt'] }) : [],
    ids('shop_item').length ? ShopItem.findAll({ where: { id: ids('shop_item') }, attributes: ['id', 'name'] }) : [],
  ]);
  const targets = new Map();
  for (const item of questions) targets.set(`question:${item.id}`, { title: item.title, hidden: Boolean(item.hiddenAt), closed: item.status === 'closed', link: item.hiddenAt ? null : `/preguntas/${item.id}` });
  for (const item of answers) {
    const hidden = Boolean(item.hiddenAt || item.question?.hiddenAt);
    targets.set(`answer:${item.id}`, { title: item.question?.title || 'Pregunta no disponible', excerpt: shorten(item.body, 160), hidden, link: hidden ? null : `/preguntas/${item.questionId}` });
  }
  for (const item of contents) targets.set(`content:${item.id}`, { title: item.title, hidden: Boolean(item.hiddenAt), link: item.hiddenAt || item.status !== 'published' ? null : `/conozcamos/${item.id}` });
  for (const item of categories) targets.set(`category:${item.id}`, { title: item.name, hidden: false, link: null });
  for (const item of places) targets.set(`place:${item.id}`, { title: item.name, hidden: Boolean(item.hiddenAt), link: item.hiddenAt || item.status !== 'published' ? null : `/mapa?lugar=${item.id}` });
  for (const item of routes) targets.set(`route:${item.id}`, { title: item.title, hidden: Boolean(item.hiddenAt), link: item.hiddenAt || item.status !== 'published' ? null : `/rutas/${item.id}` });
  // De un mensaje del chat se muestra el texto (o qué tipo de archivo era) y la comunidad.
  for (const item of messages) {
    const what = item.body ? shorten(item.body, 160) : item.kind === 'image' ? '[Imagen]' : item.kind === 'audio' ? '[Audio]' : '[Mensaje borrado]';
    targets.set(`message:${item.id}`, { title: `Mensaje en «${item.community?.name ?? 'comunidad cerrada'}»`, excerpt: item.deletedAt ? '[Mensaje borrado]' : what, hidden: Boolean(item.deletedAt), link: `/comunidades/${item.communityId}` });
  }
  for (const item of communities) targets.set(`community:${item.id}`, { title: item.name, hidden: Boolean(item.closedAt), link: item.closedAt ? null : `/comunidades/${item.id}` });
  for (const item of items) targets.set(`shop_item:${item.id}`, { title: item.name, hidden: false, link: null });
  // De un perfil se muestra el nombre y la descripción reportada, para poder decidir.
  for (const item of profiles) targets.set(`profile:${item.id}`, { title: item.name, excerpt: item.bio ? shorten(item.bio, 160) : 'Sin descripción', hidden: Boolean(item.bioHiddenAt), link: `/usuarios/${item.id}` });
  return row => ({ type: row.targetType, id: row.targetId, ...(targets.get(`${row.targetType}:${row.targetId}`) || { title: 'Ya no existe', missing: true, hidden: false, link: null }) });
};
