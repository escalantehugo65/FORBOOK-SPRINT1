import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const tertiaryCatalog = JSON.parse(readFileSync(new URL('./data/formosa-institutions.json', import.meta.url), 'utf8'));
export async function seedTertiaryInstitutions({ Institution, Career }, transaction) {
  for (const item of tertiaryCatalog.institutions) {
    const [institution] = await Institution.findOrCreate({ where: { name: item.name }, defaults: { sourceUrl: item.sourceUrl }, transaction });
    for (const name of item.careers) {
      const slug = `cue-${item.cue}-${createHash('sha256').update(name).digest('hex').slice(0, 16)}`;
      await Career.findOrCreate({ where: { slug }, defaults: { name, institutionId: institution.id, sourceUrl: item.careerSourceUrl, reviewedAt: tertiaryCatalog.reviewedAt }, transaction });
    }
  }
}
