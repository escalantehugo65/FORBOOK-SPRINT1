// Textos y cuentas de las comunidades. Las listas son las mismas que valida el backend.
export const topicNames = { barrio: 'Barrios', institucion: 'Instituciones', estudio: 'Estudio', vida: 'Vida en Formosa', intereses: 'Intereses', otro: 'Otros' };
export const topicOrder = ['barrio', 'institucion', 'estudio', 'vida', 'intereses', 'otro'];
export const colorNames = { azul: 'Azul', menta: 'Menta', amarillo: 'Amarillo', coral: 'Coral', violeta: 'Violeta', rio: 'Río' };
export const rankNames = { owner: 'Creó la comunidad', admin: 'Administra', member: 'Miembro' };
export const rankBadges = { owner: 'Dueño', admin: 'Admin' };
export const periodNames = { day: 'Misiones de hoy', week: 'Misiones de la semana', once: 'Para empezar' };
export const periodOrder = ['once', 'day', 'week'];

export const membersLabel = count => `${new Intl.NumberFormat('es-AR').format(count)} ${count === 1 ? 'miembro' : 'miembros'}`;

// "1:05" para la duración de un audio.
export const formatSeconds = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
// Hora de un mensaje: "14:05".
export const chatTime = value => new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
// Separador de días del chat: "Hoy", "Ayer" o "lunes 16 de noviembre".
export const dayLabel = (value, now = new Date()) => {
  const date = new Date(value);
  if (sameDay(date, now)) return 'Hoy';
  if (sameDay(date, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Ayer';
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }).format(date);
};

// Arma la lista del chat: un separador cuando cambia el día y "compact" cuando la misma persona
// escribe varios mensajes seguidos en menos de 5 minutos (se muestran pegados, sin repetir el nombre).
export const groupMessages = (messages, now = new Date()) => {
  const items = [];
  let previous = null;
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const newDay = !previous || !sameDay(new Date(previous.createdAt), date);
    if (newDay) items.push({ type: 'day', key: `day-${message.id}`, label: dayLabel(date, now) });
    const compact = !newDay && previous.author.id !== null && previous.author.id === message.author.id && !previous.deleted && date - new Date(previous.createdAt) < 5 * 60000;
    items.push({ type: 'message', key: `message-${message.id}`, message, compact });
    previous = message;
  }
  return items;
};

// Suma mensajes nuevos sin repetir (el envío propio y la consulta periódica pueden traer el mismo).
export const mergeMessages = (current, incoming) => {
  const known = new Set(current.map(message => message.id));
  const added = incoming.filter(message => !known.has(message.id));
  return added.length ? [...current, ...added].sort((a, b) => a.id - b.id) : current;
};

// Cuánto falta para que se renueve una misión: "5 h", "3 días".
export const timeLeft = (endsAt, now = new Date()) => {
  const minutes = Math.max(0, Math.round((new Date(endsAt) - now) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} días`;
};

// Tamaño al que se achica una imagen antes de mandarla: el lado más largo queda en "max" como mucho.
export const fitSize = (width, height, max) => {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

const toDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('No pudimos leer el archivo.'));
  reader.readAsDataURL(blob);
});
export const blobToDataUrl = toDataUrl;

// Convierte la imagen elegida a JPG y la achica hasta que pese menos que el límite.
// Al redibujarla en un canvas se pierden los metadatos (ubicación GPS, modelo del celular).
export async function prepareImage(file, maxBytes) {
  if (!file.type.startsWith('image/')) throw new Error('Elegí un archivo de imagen.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No pudimos abrir esa imagen. Probá con otra.'));
      element.src = url;
    });
    if (Math.min(image.naturalWidth, image.naturalHeight) < 32) throw new Error('La imagen es demasiado chica.');
    for (const [side, quality] of [[1600, 0.85], [1280, 0.8], [1024, 0.75], [800, 0.7], [640, 0.6]]) {
      const size = fitSize(image.naturalWidth, image.naturalHeight, side);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      // Fondo blanco: un PNG transparente no queda negro al pasar a JPG.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
      context.drawImage(image, 0, 0, size.width, size.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= maxBytes) return { dataUrl: await toDataUrl(blob), preview: URL.createObjectURL(blob), ...size };
    }
    throw new Error('La imagen es demasiado pesada. Probá con otra.');
  } finally { URL.revokeObjectURL(url); }
}

// Formato de audio que este navegador puede grabar y Forbook acepta (WebM, Ogg o MP4).
export const audioType = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type)) || null;
};
