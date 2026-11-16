import { describe, it, expect } from 'vitest';
import { clampOffset, coverScale, cropArea, limits } from './crop';
import { findMatches, splitMatches } from './search';
import { withItem } from './shop';
import { checkStops, stopFromRoute } from './stops';
import { googleMapsUrl } from './coordinates';
import { dayLabel, fitSize, formatSeconds, groupMessages, membersLabel, mergeMessages, timeLeft } from './communities';

describe('recorte de la foto de perfil', () => {
  it('la imagen cubre el cuadro: el lado corto llena los 300 px', () => {
    expect(coverScale(300, 1200, 800)).toBe(300 / 800);
    expect(coverScale(300, 800, 1200)).toBe(300 / 800);
  });

  it('solo deja correr la imagen hasta el borde', () => {
    // 1200 × 800 en un cuadro de 300: se ve a 450 × 300, sobran 75 px de cada lado en horizontal.
    expect(limits(300, 1200, 800, 1)).toEqual({ x: 75, y: 0 });
    expect(clampOffset({ x: 500, y: -40 }, 300, 1200, 800, 1)).toEqual({ x: 75, y: 0 });
    // Con zoom 2 se ve a 900 × 600: ahora sobran 300 px a los costados y 150 arriba y abajo.
    expect(clampOffset({ x: -500, y: 10 }, 300, 1200, 800, 2)).toEqual({ x: -300, y: 10 });
  });

  it('sin mover ni acercar, recorta el centro de la imagen', () => {
    expect(cropArea(300, 1200, 800, 1, { x: 0, y: 0 })).toEqual({ x: 200, y: 0, size: 800 });
  });

  it('corrida al máximo hacia la derecha, se ve el borde izquierdo', () => {
    expect(cropArea(300, 1200, 800, 1, { x: 75, y: 0 })).toEqual({ x: 0, y: 0, size: 800 });
  });

  it('con zoom 2 el recorte es la mitad y sigue centrado', () => {
    expect(cropArea(300, 1200, 800, 2, { x: 0, y: 0 })).toEqual({ x: 400, y: 200, size: 400 });
  });
});

describe('resaltado de la búsqueda', () => {
  it('encuentra sin importar tildes ni mayúsculas, en el texto original', () => {
    expect(findMatches('Trámite de la SUBE', 'tramite')).toEqual([[0, 7]]);
    expect(splitMatches('Zoe Quirós', 'QUIROS')).toEqual([{ text: 'Zoe ', match: false }, { text: 'Quirós', match: true }]);
  });

  it('marca todas las apariciones y no rompe con letras compuestas', () => {
    expect(findMatches('ana y Ana', 'ana')).toEqual([[0, 3], [6, 9]]);
    // "é" escrita como e + tilde suelta (dos caracteres) también se resalta entera.
    expect(findMatches('Café Rosé', 'cafe')).toEqual([[0, 5]]);
  });

  it('sin coincidencias o sin búsqueda devuelve el texto tal cual', () => {
    expect(splitMatches('Formosa', 'chaco')).toEqual([{ text: 'Formosa', match: false }]);
    expect(splitMatches('Formosa', '  ')).toEqual([{ text: 'Formosa', match: false }]);
  });
});

describe('vista previa de la tienda', () => {
  it('reemplaza solo la decoración de la misma categoría', () => {
    const puestas = { frame: 'marco-sol', banner: null, effect: 'efecto-burbujas', nameColor: null };
    expect(withItem(puestas, { category: 'frame', slug: 'marco-prisma' })).toEqual({ ...puestas, frame: 'marco-prisma' });
    expect(withItem(puestas, { category: 'name_color', slug: 'nombre-oro' })).toEqual({ ...puestas, nameColor: 'nombre-oro' });
    expect(withItem(undefined, null)).toEqual({ frame: null, banner: null, effect: null, nameColor: null });
  });
});

describe('paradas de una ruta (colectivo del IPF)', () => {
  const row = (name, coordinates, reference = '') => ({ key: name, name, reference, coordinates });

  it('acepta coordenadas copiadas de Google Maps, con muchos decimales o con el nombre pegado', () => {
    const { valid, stops } = checkStops([
      row(' La Virgen ', '-26.155857478439273, -58.18570582851414'),
      row('Circuito', 'circuito -26.141242, -58.193193', ' Sobre la Ruta Nacional 11 '),
    ]);
    expect(valid).toBe(true);
    expect(stops).toEqual([
      { name: 'La Virgen', reference: null, latitude: -26.155857, longitude: -58.185706 },
      { name: 'Circuito', reference: 'Sobre la Ruta Nacional 11', latitude: -26.141242, longitude: -58.193193 },
    ]);
  });

  it('marca cada fila con su error', () => {
    const { valid, errors } = checkStops([row('Plaza San Martín', '-26.186308, -58.173568'), row('x', ''), row('Al revés', '-58.173568, -26.186308')]);
    expect(valid).toBe(false);
    expect(errors[0]).toEqual({});
    expect(errors[1].name).toMatch(/entre 2 y 120/);
    expect(errors[1].coordinates).toMatch(/Pegá las coordenadas/);
    expect(errors[2].coordinates).toMatch(/al revés/);
  });

  it('al editar, muestra las paradas guardadas como texto', () => {
    expect(stopFromRoute({ id: 4, name: 'IPV', reference: null, latitude: -26.164724, longitude: -58.198354 }))
      .toEqual({ key: 'stop-4', name: 'IPV', reference: '', coordinates: '-26.164724, -58.198354' });
  });

  it('arma el enlace a Google Maps con las coordenadas', () => {
    expect(googleMapsUrl({ latitude: -26.186308, longitude: -58.173568 })).toBe('https://www.google.com/maps/search/?api=1&query=-26.186308,-58.173568');
  });
});

describe('chat de las comunidades', () => {
  const message = (id, authorId, createdAt, extra = {}) => ({ id, author: { id: authorId }, createdAt, deleted: false, ...extra });
  const now = new Date(2026, 10, 16, 15, 0);

  it('separa por día y junta los mensajes seguidos de la misma persona', () => {
    const items = groupMessages([
      message(1, 7, new Date(2026, 10, 15, 22, 0)),
      message(2, 7, new Date(2026, 10, 16, 9, 0)),
      message(3, 7, new Date(2026, 10, 16, 9, 3)),
      message(4, 8, new Date(2026, 10, 16, 9, 4)),
      message(5, 8, new Date(2026, 10, 16, 9, 20)),
    ], now);
    expect(items.map(item => (item.type === 'day' ? item.label : `${item.message.id}${item.compact ? 'c' : ''}`))).toEqual(['Ayer', '1', 'Hoy', '2', '3c', '4', '5']);
  });

  it('después de un mensaje borrado vuelve a mostrar el nombre', () => {
    const items = groupMessages([message(1, 7, new Date(2026, 10, 16, 9, 0), { deleted: true }), message(2, 7, new Date(2026, 10, 16, 9, 1))], now);
    expect(items[2].compact).toBe(false);
  });

  it('nombra los días', () => {
    expect(dayLabel(new Date(2026, 10, 16, 1, 0), now)).toBe('Hoy');
    expect(dayLabel(new Date(2026, 10, 15, 23, 59), now)).toBe('Ayer');
    expect(dayLabel(new Date(2026, 10, 9, 12, 0), now)).toBe('lunes, 9 de noviembre');
    expect(dayLabel(new Date(2025, 11, 31, 12, 0), now)).toMatch(/2025/);
  });

  it('suma los mensajes nuevos sin repetir y en orden', () => {
    const current = [message(1, 7, now), message(3, 7, now)];
    expect(mergeMessages(current, [message(3, 7, now)])).toBe(current);
    expect(mergeMessages(current, [message(4, 8, now), message(2, 8, now), message(3, 7, now)]).map(item => item.id)).toEqual([1, 2, 3, 4]);
  });

  it('achica la imagen sin deformarla y nunca la agranda', () => {
    expect(fitSize(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitSize(900, 1800, 1280)).toEqual({ width: 640, height: 1280 });
    expect(fitSize(300, 200, 1280)).toEqual({ width: 300, height: 200 });
  });

  it('duración de un audio, tiempo que falta y cantidad de miembros', () => {
    expect(formatSeconds(4)).toBe('0:04');
    expect(formatSeconds(65)).toBe('1:05');
    expect(timeLeft(new Date(now.getTime() + 5 * 3600000), now)).toBe('5 h');
    expect(timeLeft(new Date(now.getTime() + 3 * 86400000), now)).toBe('3 días');
    expect(timeLeft(new Date(now.getTime() + 20000), now)).toBe('1 min');
    expect(membersLabel(1)).toBe('1 miembro');
    expect(membersLabel(1234)).toBe('1.234 miembros');
  });
});
