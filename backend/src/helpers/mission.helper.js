import { Op } from 'sequelize';
import { Answer } from '../models/answer.model.js';
import { AnswerVote } from '../models/answer_vote.model.js';
import { Question } from '../models/question.model.js';
import { Community } from '../models/community.model.js';
import { CommunityMember } from '../models/community_member.model.js';
import { CommunityMessage } from '../models/community_message.model.js';
import { MissionClaim } from '../models/mission_claim.model.js';
import { Content } from '../models/content.model.js';
import { Friendship } from '../models/friendship.model.js';
import { startOfToday } from './point.helper.js';

// Misiones: metas chicas que dan puntos para la tienda cuando se cumplen y se cobran.
// period: 'day' se renueva cada día, 'week' cada lunes y 'once' se cobra una sola vez.
// Dan puntos pero no reputación: el nivel se gana ayudando, no chateando.
export const missions = [
  { key: 'join', period: 'once', metric: 'memberships', goal: 1, reward: 10, title: 'Unite a una comunidad', detail: 'Entrá a una comunidad que te interese.' },
  { key: 'create', period: 'once', metric: 'owned', goal: 1, reward: 15, title: 'Creá tu propia comunidad', detail: 'Armá un espacio para tu barrio, tu carrera o lo que te guste.' },
  { key: 'friend', period: 'once', metric: 'friends', goal: 1, reward: 10, title: 'Sumá tu primer amigo', detail: 'Mandá una solicitud de amistad y que te la acepten (o aceptá una).' },
  { key: 'content', period: 'once', metric: 'contents', goal: 1, reward: 15, title: 'Compartí tu primera ficha', detail: 'Contá en Conozcamos Formosa algo que le sirva a quien recién llega.' },
  { key: 'chat_daily', period: 'day', metric: 'messages', goal: 5, reward: 5, title: 'Mandá 5 mensajes', detail: 'Charlá en el chat de cualquier comunidad.' },
  { key: 'image_daily', period: 'day', metric: 'images', goal: 1, reward: 3, title: 'Compartí una imagen', detail: 'Mandá una foto en el chat de una comunidad.' },
  { key: 'audio_daily', period: 'day', metric: 'audios', goal: 1, reward: 3, title: 'Mandá un audio', detail: 'Grabá un audio en el chat de una comunidad.' },
  { key: 'answer_daily', period: 'day', metric: 'answers', goal: 1, reward: 5, title: 'Respondé una pregunta', detail: 'Ayudá a otra persona en Preguntas.' },
  { key: 'helpful_daily', period: 'day', metric: 'votes', goal: 2, reward: 3, title: 'Apoyá 2 respuestas', detail: 'Marcá como útiles dos respuestas que te sirvieron.' },
  { key: 'chat_weekly', period: 'week', metric: 'messages', goal: 30, reward: 15, title: 'Mandá 30 mensajes en la semana', detail: 'Mantené viva la charla en tus comunidades.' },
  { key: 'communities_weekly', period: 'week', metric: 'activeCommunities', goal: 3, reward: 10, title: 'Participá en 3 comunidades', detail: 'Escribí en tres comunidades distintas esta semana.' },
  { key: 'answers_weekly', period: 'week', metric: 'answers', goal: 5, reward: 20, title: 'Respondé 5 preguntas en la semana', detail: 'Tus respuestas le ahorran vueltas a quien recién llega.' },
];

// Fecha de la Argentina (UTC-3) como "2026-11-16".
const localDate = (date) => new Date(date.getTime() - 3 * 3600000).toISOString().slice(0, 10);

// Comienzo de cada período y la clave con la que se anota el cobro.
export const periodsAt = (now = new Date()) => {
  const day = startOfToday(now);
  // Lunes de esta semana: getUTCDay() de la fecha local, con domingo = 0.
  const weekday = new Date(day.getTime() - 3 * 3600000).getUTCDay();
  const week = new Date(day.getTime() - ((weekday + 6) % 7) * 86400000);
  return {
    day: { start: day, key: localDate(day), endsAt: new Date(day.getTime() + 86400000) },
    week: { start: week, key: localDate(week), endsAt: new Date(week.getTime() + 7 * 86400000) },
    once: { start: new Date(0), key: 'siempre', endsAt: null },
  };
};

// Cuánto hizo la persona desde una fecha. Solo cuenta lo que sigue publicado.
const metrics = {
  memberships: (userId) => CommunityMember.count({ where: { userId, status: 'active' } }),
  owned: (userId) => Community.count({ where: { ownerId: userId, closedAt: null } }),
  messages: (userId, since) => CommunityMessage.count({ where: { userId, deletedAt: null, createdAt: { [Op.gte]: since } } }),
  images: (userId, since) => CommunityMessage.count({ where: { userId, kind: 'image', deletedAt: null, createdAt: { [Op.gte]: since } } }),
  audios: (userId, since) => CommunityMessage.count({ where: { userId, kind: 'audio', deletedAt: null, createdAt: { [Op.gte]: since } } }),
  activeCommunities: (userId, since) => CommunityMessage.count({ where: { userId, deletedAt: null, createdAt: { [Op.gte]: since } }, distinct: true, col: 'communityId' }),
  // Responder la pregunta propia no cuenta.
  answers: (userId, since) => Answer.count({ where: { userId, hiddenAt: null, createdAt: { [Op.gte]: since } }, include: [{ model: Question, as: 'question', attributes: [], where: { hiddenAt: null, userId: { [Op.ne]: userId } } }] }),
  votes: (userId, since) => AnswerVote.count({ where: { userId, createdAt: { [Op.gte]: since } } }),
  friends: (userId) => Friendship.count({ where: { status: 'accepted', [Op.or]: [{ userLowId: userId }, { userHighId: userId }] } }),
  contents: (userId) => Content.count({ where: { authorId: userId, status: 'published', hiddenAt: null } }),
};

// Estado de todas las misiones de una persona: avance, si ya la cobró y cuándo se renueva.
export const missionStatus = async (userId, now = new Date(), transaction = null) => {
  const periods = periodsAt(now);
  const claims = await MissionClaim.findAll({ where: { userId }, attributes: ['missionKey', 'period'], raw: true, transaction });
  const claimed = new Set(claims.map(claim => `${claim.missionKey}|${claim.period}`));
  const cache = new Map();
  const measure = (metric, period) => {
    const id = `${metric}|${period}`;
    if (!cache.has(id)) cache.set(id, metrics[metric](userId, periods[period].start));
    return cache.get(id);
  };
  return Promise.all(missions.map(async mission => {
    const progress = Math.min(await measure(mission.metric, mission.period), mission.goal);
    const done = claimed.has(`${mission.key}|${periods[mission.period].key}`);
    return {
      key: mission.key, period: mission.period, title: mission.title, detail: mission.detail, goal: mission.goal, reward: mission.reward,
      progress, claimed: done, claimable: !done && progress >= mission.goal, endsAt: periods[mission.period].endsAt,
    };
  }));
};
