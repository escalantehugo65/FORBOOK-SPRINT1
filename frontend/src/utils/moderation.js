// Textos de la épica 7 en un solo lugar, para que la cola, el historial y los formularios digan lo mismo.
export const reasonNames = {
  false: 'Información falsa',
  offensive: 'Ofensivo o agresivo',
  spam: 'Spam o publicidad',
  outdated: 'Puede estar desactualizada',
  other: 'Otro motivo',
};
export const reportStatusNames = { pending: 'Pendiente', dismissed: 'Desestimado', actioned: 'Con acción' };
export const reportStatusBadge = { pending: 'badge badge-community', dismissed: 'badge badge-soon', actioned: 'badge badge-official' };
export const actionNames = {
  none: 'Sin cambios',
  dismiss: 'Reporte desestimado',
  hide: 'Contenido ocultado',
  close: 'Pregunta cerrada',
  category_create: 'Categoría creada',
  category_update: 'Categoría editada',
  category_delete: 'Categoría borrada',
  source_update: 'Fuente actualizada',
};
export const targetNames = { question: 'Pregunta', answer: 'Respuesta', content: 'Ficha', category: 'Categoría' };
export const canModerate = user => ['moderator', 'admin'].includes(user?.role);
export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value));
}
