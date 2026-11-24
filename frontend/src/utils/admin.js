// Textos del panel de administración.
export const roleNames = { student: 'Estudiante', moderator: 'Moderación', admin: 'Administración' };
export const communityKindNames = { default: 'De Forbook', user: 'De estudiantes' };
export const sanctionDays = [1, 3, 7, 15, 30, 90];

// Revisa el formulario de una sanción manual con las mismas reglas que el backend.
// days: entero de 1 a 365 para restricción y suspensión; la baja no lleva días.
export function sanctionErrors({ type, reason, note, days }) {
  const errors = {};
  if (!['restriction', 'suspension', 'ban'].includes(type)) errors.type = 'Elegí el tipo de sanción.';
  if (!reason) errors.reason = 'Elegí un motivo.';
  const length = note.trim().length;
  if (length < 10 || length > 450) errors.note = 'Explicá el motivo en 10 a 450 caracteres: lo va a leer la persona.';
  if (type !== 'ban') {
    const value = Number(days);
    if (!Number.isInteger(value) || value < 1 || value > 365) errors.days = 'Elegí entre 1 y 365 días.';
  }
  return errors;
}

// Puntos a mano: entero entre -1000 y 1000, distinto de 0.
export function pointsError(amount) {
  const value = Number(amount);
  if (amount === '' || !Number.isInteger(value) || value === 0 || value < -1000 || value > 1000) return 'Elegí una cantidad entre -1000 y 1000, distinta de 0.';
  return '';
}
