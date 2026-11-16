// Opciones del perfil. Son las mismas listas cerradas que valida el backend.
export const avatarColors = { azul: 'Azul', menta: 'Menta', amarillo: 'Amarillo', coral: 'Coral', violeta: 'Violeta', rio: 'Río' };
export const bannerStyles = { rio: 'Río Paraguay', monte: 'Monte', atardecer: 'Atardecer', pomelo: 'Pomelo', noche: 'Noche', liso: 'Liso' };
export const interestNames = {
  deportes: 'Deportes', musica: 'Música', juegos: 'Juegos', lectura: 'Lectura', arte: 'Arte', tecnologia: 'Tecnología',
  cine: 'Cine y series', voluntariado: 'Voluntariado', idiomas: 'Idiomas', naturaleza: 'Naturaleza', cocina: 'Cocina', fotografia: 'Fotografía',
};
export const maxInterests = 6;
export const badgeNames = { moderation: 'Equipo de moderación', helpful: 'Dio respuestas útiles' };
export const warningReasons = { false: 'Información falsa', offensive: 'Ofensivo o agresivo', spam: 'Spam o publicidad', personal_data: 'Datos personales expuestos', other: 'Otro motivo' };
export const arrivalNames = { arrived: 'Ya está en Formosa', not_arrived: 'Todavía no llegó' };
export const ownArrivalNames = { arrived: 'Ya estás en Formosa', not_arrived: 'Todavía no llegaste' };
export const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
