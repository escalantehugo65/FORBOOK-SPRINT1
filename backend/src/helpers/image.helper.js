import { HttpError } from './error.helper.js';

// Límites de la foto de perfil. El frontend la recorta cuadrada y la manda en 512 × 512 como máximo.
export const avatarLimits = { maxBytes: 300 * 1024, minSide: 64, maxSide: 1024 };

const invalid = (message) => new HttpError(400, 'Revisá los campos indicados.', { image: message });

// Revisa que el archivo sea un JPEG de verdad y lo devuelve sin metadatos.
// Los segmentos APP1 a APP15 y los comentarios pueden traer EXIF: la ubicación GPS donde se sacó la foto,
// el modelo del celular o la fecha. Se quitan siempre, aunque la foto venga recortada desde el navegador.
export const cleanJpeg = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw invalid('La foto tiene que ser una imagen JPG.');
  const kept = [buffer.subarray(0, 2)];
  let position = 2;
  let size = null;
  while (position < buffer.length) {
    if (buffer[position] !== 0xff) throw invalid('No pudimos leer la imagen. Probá con otra foto.');
    const marker = buffer[position + 1];
    // Bytes de relleno (0xFF repetidos) y marcadores sin largo.
    if (marker === 0xff) { position += 1; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { kept.push(buffer.subarray(position, position + 2)); position += 2; continue; }
    // Desde el inicio de los datos de la imagen (SOS) se copia todo hasta el final.
    if (marker === 0xda) {
      if (!size) break;
      kept.push(buffer.subarray(position));
      const clean = Buffer.concat(kept);
      if (clean[clean.length - 2] !== 0xff || clean[clean.length - 1] !== 0xd9) throw invalid('La imagen está incompleta. Probá con otra foto.');
      return { data: clean, ...size };
    }
    if (position + 4 > buffer.length) break;
    const length = buffer.readUInt16BE(position + 2);
    const end = position + 2 + length;
    if (length < 2 || end > buffer.length) break;
    // SOF0, SOF1 y SOF2: alto y ancho de la imagen.
    if ([0xc0, 0xc1, 0xc2].includes(marker)) size = { height: buffer.readUInt16BE(position + 5), width: buffer.readUInt16BE(position + 7) };
    const metadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!metadata) kept.push(buffer.subarray(position, end));
    position = end;
  }
  throw invalid('No pudimos leer la imagen. Probá con otra foto.');
};

// "data:image/jpeg;base64,..." → JPEG limpio, cuadrado y dentro de los límites.
export const readAvatar = (dataUrl) => {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw invalid('La foto tiene que llegar como imagen JPG.');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > avatarLimits.maxBytes) throw invalid('La foto es demasiado pesada. Probá con otra o recortala más.');
  const { data, width, height } = cleanJpeg(buffer);
  if (width !== height) throw invalid('La foto tiene que ser cuadrada.');
  if (width < avatarLimits.minSide || width > avatarLimits.maxSide) throw invalid(`La foto tiene que medir entre ${avatarLimits.minSide} y ${avatarLimits.maxSide} píxeles de lado.`);
  return data;
};
