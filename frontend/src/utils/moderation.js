// Textos de la épica 7 en un solo lugar, para que la cola, el historial y los formularios digan lo mismo.
export const reasonNames = {
  false: 'Información falsa',
  offensive: 'Ofensivo o agresivo',
  spam: 'Spam o publicidad',
  outdated: 'Puede estar desactualizada',
  personal_data: 'Datos personales expuestos',
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
  place_create: 'Lugar agregado',
  place_update: 'Lugar editado',
  content_create: 'Ficha creada',
  content_update: 'Ficha editada',
  route_create: 'Ruta agregada',
  route_update: 'Ruta editada',
  avatar_remove: 'Foto de perfil quitada',
  warn: 'Advertencia',
  warning_revoke: 'Advertencia revocada',
  bio_hide: 'Descripción ocultada',
  bio_show: 'Descripción visible otra vez',
  restrict: 'Cuenta restringida',
  suspend: 'Cuenta suspendida',
  ban: 'Cuenta dada de baja',
  sanction_revoke: 'Sanción revocada',
  appeal_accept: 'Apelación aceptada',
  appeal_reject: 'Apelación rechazada',
  role_change: 'Rol cambiado',
  points_adjust: 'Puntos ajustados',
  community_close: 'Comunidad cerrada',
  community_reopen: 'Comunidad reabierta',
  shop_item_update: 'Decoración editada',
  message_delete: 'Mensaje borrado',
  content_hide: 'Ficha ocultada',
  content_show: 'Ficha visible otra vez',
  account_delete: 'Cuenta borrada',
};
export const targetNames = { question: 'Pregunta', answer: 'Respuesta', content: 'Ficha', category: 'Categoría', place: 'Lugar', profile: 'Perfil', route: 'Ruta', message: 'Mensaje del chat', community: 'Comunidad', shop_item: 'Decoración de la tienda' };
export const canModerate = user => ['moderator', 'admin'].includes(user?.role);
export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value));
}
