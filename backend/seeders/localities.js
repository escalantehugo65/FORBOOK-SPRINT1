import { readFileSync } from 'node:fs';
export const localityCatalog = JSON.parse(readFileSync(new URL('./data/argentina-localities.json', import.meta.url), 'utf8'));
export async function seedLocalities(Locality, transaction) {
  const rows = localityCatalog.localities;
  if (!rows.length || new Set(rows.map(row => row.provinceCode)).size !== 24 || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Catálogo nacional incompleto o duplicado.');
  // Upsert actualiza los metadatos de las localidades ya cargadas sin cambiar sus identificadores.
  for (let i = 0; i < rows.length; i += 500) {
    await Locality.bulkCreate(rows.slice(i, i + 500).map(row => ({ ...row, sourceUrl: localityCatalog.sourceUrl, reviewedAt: localityCatalog.reviewedAt })), {
      transaction, updateOnDuplicate: ['name', 'provinceCode', 'provinceName', 'departmentCode', 'departmentName', 'sourceUrl', 'reviewedAt', 'updatedAt'],
    });
  }
}
