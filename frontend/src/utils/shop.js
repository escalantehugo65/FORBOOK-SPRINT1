// Textos de la tienda y de los puntos. Las listas son las mismas que valida el backend.
export const categoryNames = { frame: 'Marco', banner: 'Fondo', effect: 'Efecto', name_color: 'Color del nombre' };
export const categoryPlural = { frame: 'Marcos', banner: 'Fondos', effect: 'Efectos', name_color: 'Colores del nombre' };
export const categoryHints = {
  frame: 'Rodea tu foto o tus iniciales en todo Forbook: perfil, preguntas y respuestas.',
  banner: 'Reemplaza el fondo de la parte de arriba de tu perfil.',
  effect: 'Una animación suave sobre tu perfil. Si tenés activada la opción de reducir movimiento, se muestra quieta.',
  name_color: 'Tu nombre con color en tu perfil, en tus preguntas y en tus respuestas.',
};
export const categoryOrder = ['frame', 'banner', 'effect', 'name_color'];

export const rarityNames = { common: 'Común', rare: 'Rara', epic: 'Épica', legendary: 'Legendaria' };

// Clave de cada categoría dentro de decorations ({ frame, banner, effect, nameColor }).
export const decorationKeys = { frame: 'frame', banner: 'banner', effect: 'effect', name_color: 'nameColor' };
export const noDecorations = { frame: null, banner: null, effect: null, nameColor: null };

// Las decoraciones puestas, con una de la tienda en lugar de la de su categoría (para la vista previa).
export const withItem = (decorations, item) => ({ ...noDecorations, ...decorations, ...(item ? { [decorationKeys[item.category]]: item.slug } : {}) });

export const levelNames = { nuevo: 'Nuevo', aportante: 'Aportante', confiable: 'Confiable' };

// Motivos de los movimientos de puntos (GET /points).
export const reasonNames = {
  welcome: 'Bono de bienvenida',
  question: 'Hiciste una pregunta',
  answer: 'Respondiste una pregunta',
  helpful: 'Marcaron tu respuesta como útil',
  helpful_removed: 'Quitaron una marca de útil',
  purchase: 'Compra en la tienda',
  hidden: 'Moderación ocultó una publicación tuya',
  warning: 'Advertencia de moderación',
  warning_revoked: 'Se revocó una advertencia',
};

export const formatPoints = value => new Intl.NumberFormat('es-AR').format(value);
export const pointsLabel = value => `${formatPoints(value)} ${Math.abs(value) === 1 ? 'punto' : 'puntos'}`;
