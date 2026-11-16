// Países y territorios (ISO 3166-1) para quien no es de Argentina. Se leen una vez del JSON del seed.
import { readFileSync } from 'node:fs';
export const countryCatalog = JSON.parse(readFileSync(new URL('../../seeders/data/countries.json', import.meta.url), 'utf8'));
export const countriesByCode = new Map(countryCatalog.countries.map(item => [item.code, item]));
