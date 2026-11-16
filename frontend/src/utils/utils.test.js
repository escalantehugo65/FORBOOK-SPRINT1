import { describe, it, expect } from 'vitest';
import { clampOffset, coverScale, cropArea, limits } from './crop';
import { findMatches, splitMatches } from './search';
import { withItem } from './shop';

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
