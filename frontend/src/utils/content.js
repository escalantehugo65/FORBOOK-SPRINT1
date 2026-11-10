// Nombres de los tipos de fuente (FF-19): oficial, comunitaria verificable u opinión/experiencia.
export const sourceNames = {
  official: 'Fuente oficial',
  community: 'Comunitaria verificable',
  experience: 'Opinión o experiencia',
};
export const sourceBadge = {
  official: 'badge badge-official',
  community: 'badge badge-community',
  experience: 'badge badge-experience',
};
export function formatDate(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}
export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || '';
}
