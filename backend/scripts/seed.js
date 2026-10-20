import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { institutions, categories, contents } from '../seeders/catalog.js';

const db = createDatabase(readConfig());
const { Institution, Category, Content } = defineModels(db);
try {
  await db.authenticate();
  await db.transaction(async transaction => {
    for (const item of institutions) await Institution.findOrCreate({ where: { name: item.name }, defaults: item, transaction });
    for (const item of categories) await Category.findOrCreate({ where: { slug: item.slug }, defaults: item, transaction });
    const institution = await Institution.findOne({ where: { name: institutions[0].name }, transaction });
    for (const { categorySlug, institutional, ...item } of contents) {
      const category = await Category.findOne({ where: { slug: categorySlug }, transaction });
      await Content.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, categoryId: category.id, institutionId: institutional ? institution.id : null, sourceType: 'official', reviewedAt: '2026-10-20', status: 'published' }, transaction });
    }
  });
  console.log('Catálogo inicial cargado. No se modificaron cuentas ni contenidos existentes.');
} catch (error) { console.error('Falló la carga inicial:', error.message); process.exitCode = 1; }
finally { await db.close(); }
