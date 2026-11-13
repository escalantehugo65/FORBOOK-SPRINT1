import { readFileSync } from 'node:fs';
export const studentMapPlaces = JSON.parse(readFileSync(new URL('./data/student-map-places.json', import.meta.url), 'utf8'));
const oldSource = 'https://servicios.infoleg.gob.ar/infolegInternet/anexos/410000-414999/412386/res566.pdf';
export async function seedMapPlaces({ Institution, Place }, transaction) {
  for (const { institutionName, ...item } of studentMapPlaces) {
    const institution = institutionName ? await Institution.findOne({ where: { name: institutionName }, transaction }) : null;
    if (institutionName && !institution) throw new Error(`Falta la institución: ${institutionName}`);
    const defaults = { ...item, institutionId: institution?.id ?? null };
    const [place, created] = await Place.findOrCreate({ where: { slug: item.slug }, defaults, transaction });
    // Completa el campus de la entrega previa solo si conserva el registro inicial intacto.
    if (!created && item.slug === 'unaf-campus' && place.name === 'Campus de la UNaF' && place.sourceUrl === oldSource && place.sourceType === 'official' && place.reviewedAt === '2026-11-08' && place.addressLabel === 'Av. Dr. Luis Gutnisky 3200, ciudad de Formosa' && !place.studentNote && place.latitude === null && place.longitude === null && !place.hiddenAt && place.status === 'published') await place.update(defaults, { transaction });
  }
  // La entrega actual usa un punto de campus para UNaF; no elimina ubicaciones personalizadas.
  const old = await Place.findOne({ where: { slug: 'unaf-rectorado' }, transaction });
  if (old && old.name === 'Rectorado de la UNaF' && old.sourceUrl === oldSource && old.sourceType === 'official' && old.reviewedAt === '2026-11-08' && old.addressLabel === 'Don Bosco 1082, ciudad de Formosa' && !old.studentNote && old.latitude === null && old.longitude === null && !old.hiddenAt && old.status === 'published') await old.update({ status: 'draft' }, { transaction });
}
