import { readFileSync } from 'node:fs';
export const localityCatalog = JSON.parse(readFileSync(new URL('./data/formosa-localities.json', import.meta.url), 'utf8'));
export async function seedLocalities(Locality, transaction) {
  if (localityCatalog.provinceCode !== '34' || !localityCatalog.localities.length) throw new Error('El catálogo debe contener localidades de Formosa.');
  for (const row of localityCatalog.localities) {
    if (!/^34\d{6}$/.test(row.id)) throw new Error('Identificador territorial fuera del alcance de Formosa.');
    await Locality.findOrCreate({ where: { id: row.id }, defaults: { ...row, provinceCode: '34', sourceUrl: localityCatalog.sourceUrl, reviewedAt: localityCatalog.reviewedAt }, transaction });
  }
}
