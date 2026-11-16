// Cuentas del recorte de la foto de perfil. La foto siempre cubre todo el cuadro: nunca quedan bordes vacíos.
// box: lado del cuadro en pantalla; width/height: tamaño de la imagen; zoom: 1 = la imagen justo cubre el cuadro.
export const minZoom = 1;
export const maxZoom = 4;
export const outputSize = 256;

export const coverScale = (box, width, height) => Math.max(box / width, box / height);

// Cuánto se puede correr la imagen hacia cada lado sin dejar un borde vacío.
export function limits(box, width, height, zoom) {
  const scale = coverScale(box, width, height) * zoom;
  return { x: Math.max(0, (width * scale - box) / 2), y: Math.max(0, (height * scale - box) / 2) };
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function clampOffset(offset, box, width, height, zoom) {
  const limit = limits(box, width, height, zoom);
  // "|| 0" evita un -0 cuando la imagen no se puede correr hacia ese lado.
  return { x: clamp(offset.x, -limit.x, limit.x) || 0, y: clamp(offset.y, -limit.y, limit.y) || 0 };
}

// Parte de la imagen original (en píxeles) que se ve en el cuadro: es lo que se guarda.
export function cropArea(box, width, height, zoom, offset) {
  const scale = coverScale(box, width, height) * zoom;
  const size = box / scale;
  const left = (box - width * scale) / 2 + offset.x;
  const top = (box - height * scale) / 2 + offset.y;
  return {
    x: clamp(-left / scale, 0, width - size),
    y: clamp(-top / scale, 0, height - size),
    size: Math.min(size, width, height),
  };
}
