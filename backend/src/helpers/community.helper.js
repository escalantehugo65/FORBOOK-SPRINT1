import { Op } from 'sequelize';
import { UserBlock } from '../models/user_block.model.js';
import { HttpError } from './error.helper.js';
import { cleanJpeg } from './image.helper.js';
import { staffRoles } from './profile.helper.js';

// Límites de las comunidades. El frontend los recibe desde GET /communities (meta.limits).
export const communityLimits = {
  ownedPerUser: 2,
  rolesPerCommunity: 10,
  messageLength: 1000,
  imageBytes: 700 * 1024,
  imageSide: [32, 2000],
  audioBytes: 600 * 1024,
  audioSeconds: 60,
  // Freno contra el spam: mensajes por ventana de tiempo.
  messagesPerHalfMinute: 15,
  mediaPerTenMinutes: 10,
};

export const communityTopics = ['barrio', 'institucion', 'estudio', 'vida', 'intereses', 'otro'];
export const communityColors = ['azul', 'menta', 'amarillo', 'coral', 'violeta', 'rio'];

// Qué puede hacer una persona en una comunidad. La jerarquía es:
// administración de Forbook > dueño > administradores de la comunidad > roles con moderación > miembros.
// - level: para comparar con otra persona (solo se puede actuar sobre alguien de menor nivel).
// - canEdit: cambiar los datos, cerrarla y nombrar administradores.
// - canManage: crear roles, asignarlos y expulsar.
// - canModerate: borrar mensajes de otras personas.
export const abilitiesOf = (member, appRole) => {
  const active = member?.status === 'active';
  const appAdmin = appRole === 'admin';
  const appStaff = staffRoles.includes(appRole);
  const rank = active ? member.rank : null;
  const level = appAdmin ? 4 : rank === 'owner' ? 3 : rank === 'admin' ? 2 : active ? 1 : 0;
  return {
    level,
    isMember: active,
    canEdit: level >= 3,
    canManage: level >= 2,
    canModerate: level >= 2 || appStaff || Boolean(active && member.role?.canModerate),
  };
};
export const levelOfMember = (member) => (member.rank === 'owner' ? 3 : member.rank === 'admin' ? 2 : 1);

// Personas cuyos mensajes no veo: las que oculté o bloqueé, y las que me bloquearon a mí.
export const invisibleUserIds = async (userId) => {
  const rows = await UserBlock.findAll({
    where: { [Op.or]: [{ userId }, { targetId: userId, kind: 'blocked' }] },
    attributes: ['userId', 'targetId'],
    raw: true,
  });
  return [...new Set(rows.map(row => (row.userId === userId ? row.targetId : row.userId)))];
};

const invalid = (field, message) => new HttpError(400, 'Revisá los campos indicados.', { [field]: message });

// "data:image/jpeg;base64,..." → JPEG sin metadatos (sin la ubicación GPS ni el modelo del celular).
export const readChatImage = (dataUrl) => {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw invalid('image', 'La imagen tiene que llegar como JPG.');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > communityLimits.imageBytes) throw invalid('image', 'La imagen es demasiado pesada.');
  const { data, width, height } = cleanJpeg(buffer);
  const [min, max] = communityLimits.imageSide;
  if (Math.min(width, height) < min || Math.max(width, height) > max) throw invalid('image', `La imagen tiene que medir entre ${min} y ${max} píxeles de lado.`);
  return { mimeType: 'image/jpeg', data, width, height };
};

// Formatos que graban los navegadores (MediaRecorder): WebM u Ogg en Chrome y Firefox, MP4 en Safari.
// Se revisa el comienzo del archivo para comprobar que sea lo que dice ser.
const audioSignatures = {
  'audio/webm': buffer => buffer.readUInt32BE(0) === 0x1a45dfa3,
  'audio/ogg': buffer => buffer.toString('latin1', 0, 4) === 'OggS',
  'audio/mp4': buffer => buffer.toString('latin1', 4, 8) === 'ftyp',
};
export const readChatAudio = (dataUrl, seconds) => {
  const match = /^data:(audio\/(?:webm|ogg|mp4))(?:;codecs=[a-z0-9.,-]+)?;base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!match) throw invalid('audio', 'No pudimos leer el audio. Probá grabarlo de nuevo.');
  const mimeType = match[1].toLowerCase();
  const data = Buffer.from(match[2], 'base64');
  if (data.length > communityLimits.audioBytes) throw invalid('audio', `El audio es demasiado pesado. Grabá hasta ${communityLimits.audioSeconds} segundos.`);
  if (data.length < 64 || !audioSignatures[mimeType](data)) throw invalid('audio', 'No pudimos leer el audio. Probá grabarlo de nuevo.');
  return { mimeType, data, seconds };
};
