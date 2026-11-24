// Textos de las sanciones (los mismos tipos y motivos que valida el backend).
export const sanctionTypeNames = { warning: 'Advertencia', restriction: 'Restricción', suspension: 'Suspensión', ban: 'Baja de la cuenta' };
export const sanctionReasonNames = {
  false: 'Información falsa',
  offensive: 'Ofensivo o agresivo',
  spam: 'Spam o publicidad',
  personal_data: 'Datos personales expuestos',
  harassment: 'Acoso a otras personas',
  repeated: 'Advertencias acumuladas',
  other: 'Otro motivo',
};
// Qué significa cada sanción para quien la recibe (se muestra solo a esa persona).
export const sanctionTypeHints = {
  restriction: 'Podés leer, pero no publicar preguntas, respuestas, fichas, comunidades ni mensajes.',
  suspension: 'No podés usar Forbook hasta que termine.',
  ban: 'La cuenta quedó dada de baja.',
};
export const accountStateNames = { active: 'Activa', restricted: 'Restringida', suspended: 'Suspendida', banned: 'Dada de baja' };
export const appealStatusNames = { pending: 'Apelación en revisión', accepted: 'Apelación aceptada', rejected: 'Apelación rechazada' };
export const appealStatusBadge = { pending: 'badge badge-community', accepted: 'badge badge-official', rejected: 'badge badge-hidden' };
export const appealLimits = { min: 20, max: 1000 };

// Fecha y hora en la Argentina, en 24 horas: «3 de diciembre de 2026 a las 14:30».
export function formatUntil(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value));
}

// Una línea que resume la sanción: «Suspensión hasta el 3 de diciembre de 2026 a las 14:30» o «Baja de la cuenta».
export function sanctionLine(sanction) {
  const name = sanctionTypeNames[sanction.type] || 'Sanción';
  return sanction.endsAt ? `${name} hasta el ${formatUntil(sanction.endsAt)}` : name;
}

// Días que quedan (redondeando para arriba): 0 si ya terminó; null si no termina (baja).
export function daysLeft(endsAt, now = Date.now()) {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 86400000));
}

// Se puede apelar una advertencia o una sanción propia que siga vigente y que todavía no se haya apelado.
export function canAppeal(item, now = Date.now()) {
  if (!item || item.revoked || item.appeal) return false;
  if (item.kind === 'sanction' && item.endsAt && new Date(item.endsAt).getTime() <= now) return false;
  return true;
}

// Revisa el texto de una apelación con los mismos límites que el backend.
export function appealError(text) {
  const length = text.trim().length;
  if (length < appealLimits.min) return `Contá qué pasó en al menos ${appealLimits.min} caracteres.`;
  if (length > appealLimits.max) return `Usá como máximo ${appealLimits.max} caracteres.`;
  return '';
}
