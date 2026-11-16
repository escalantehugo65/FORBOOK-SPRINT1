import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, contents, contentRevisions, institutions, travelRoutes } from '../seeders/catalog.js';
import { studentMapPlaces } from '../seeders/mapPlaces.js';
import { isInsideFormosa } from '../src/helpers/place.helper.js';

// El catálogo se carga sin pasar por las validaciones de la API: acá se revisan las mismas reglas.
// No usa la base de datos.
test('catálogo: las fichas cumplen las reglas de fuente', () => {
  const slugs = new Set();
  for (const item of contents) {
    assert.ok(!slugs.has(item.slug), `slug repetido: ${item.slug}`);
    slugs.add(item.slug);
    assert.ok(categories.some(category => category.slug === item.categorySlug), `${item.slug}: categoría`);
    assert.ok(!item.institutionName || institutions.some(institution => institution.name === item.institutionName), `${item.slug}: institución`);
    assert.ok(item.title.length >= 5 && item.title.length <= 180, `${item.slug}: título`);
    assert.ok(item.summary.length <= 450, `${item.slug}: resumen`);
    const type = item.sourceType ?? 'official';
    if (type === 'official') assert.match(item.sourceUrl, /^https:\/\//, `${item.slug}: una fuente oficial necesita enlace`);
    if (type === 'official') assert.ok(item.sourceLabel, `${item.slug}: una fuente oficial necesita organismo`);
    if (type === 'experience') assert.ok(item.authorLabel, `${item.slug}: una experiencia necesita quién la cuenta`);
  }
});

test('catálogo: las revisiones apuntan a fichas que existen y cambian algo', () => {
  for (const { slug, previous } of contentRevisions) {
    const current = contents.find(item => item.slug === slug);
    assert.ok(current, slug);
    assert.ok(Object.keys(previous).some(key => previous[key] !== current[key]), `${slug}: la revisión no cambia nada`);
  }
});

test('catálogo: rutas con pasos y paradas válidas (colectivo del IPF)', () => {
  for (const route of travelRoutes) {
    assert.ok(institutions.some(institution => institution.name === route.institutionName), `${route.slug}: institución`);
    assert.ok(!route.destinationSlug || studentMapPlaces.some(place => place.slug === route.destinationSlug), `${route.slug}: destino`);
    assert.ok(['official', 'community'].includes(route.sourceType), `${route.slug}: fuente`);
    assert.ok(route.sourceLabel && route.reviewedAt, `${route.slug}: fuente y fecha de revisión`);
    const steps = route.steps.split('\n');
    assert.ok(steps.length >= 1 && steps.length <= 20 && steps.every(step => step.trim() && step.length <= 300), `${route.slug}: pasos`);
    const stops = route.stops ?? [];
    assert.ok(stops.length <= 30, `${route.slug}: paradas`);
    for (const stop of stops) {
      assert.ok(stop.name.length >= 2 && stop.name.length <= 120, `${route.slug}: nombre de ${stop.name}`);
      assert.ok(stop.reference === null || stop.reference.length <= 250, `${route.slug}: referencia de ${stop.name}`);
      assert.ok(isInsideFormosa(stop.latitude, stop.longitude), `${route.slug}: ${stop.name} fuera de Formosa`);
      assert.equal(stop.latitude, Number(stop.latitude.toFixed(6)), `${route.slug}: ${stop.name} con más de 6 decimales`);
    }
  }
  const ipf = travelRoutes.find(route => route.slug === 'colectivo-ipf');
  assert.deepEqual(ipf.stops.map(stop => stop.name), ['Plaza San Martín', 'Plaza Temática', 'La Virgen', 'Circuito', 'Cruz', 'Homu', 'Shell', 'IPV']);
  assert.equal(ipf.durationLabel, null, 'sin tiempo: nadie lo midió');
});
