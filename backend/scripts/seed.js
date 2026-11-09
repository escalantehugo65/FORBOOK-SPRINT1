import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { institutions, categories, contents, places, travelRoutes, groups } from '../seeders/catalog.js';
import { careerCatalog } from '../seeders/careers.js';
import { institutionResources } from '../seeders/institutionResources.js';
import { seedLocalities } from '../seeders/localities.js';

const db = createDatabase(readConfig());
const { Institution, Career, InstitutionResource, Locality, Category, Content, Place, TravelRoute, Group } = defineModels(db);
try {
  await db.authenticate();
  await db.transaction(async transaction => {
    await seedLocalities(Locality, transaction);
    for (const item of institutions) await Institution.findOrCreate({ where: { name: item.name }, defaults: item, transaction });
    for (const catalog of careerCatalog) {
      const institution = await Institution.findOne({ where: { name: catalog.institutionName }, transaction });
      for (const name of catalog.names) {
        const slug = `${catalog.prefix}-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`;
        await Career.findOrCreate({ where: { slug }, defaults: { name, institutionId: institution.id, sourceUrl: catalog.sourceUrl, reviewedAt: '2026-11-03' }, transaction });
      }
    }
    for (const { institutionName, ...resource } of institutionResources) {
      const institution = await Institution.findOne({ where: { name: institutionName }, transaction });
      await InstitutionResource.findOrCreate({ where: { slug: resource.slug }, defaults: { ...resource, institutionId: institution.id }, transaction });
    }
    for (const item of categories) await Category.findOrCreate({ where: { slug: item.slug }, defaults: item, transaction });
    const institution = await Institution.findOne({ where: { name: institutions[0].name }, transaction });
    for (const { categorySlug, institutional, ...item } of contents) {
      const category = await Category.findOne({ where: { slug: categorySlug }, transaction });
      await Content.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, categoryId: category.id, institutionId: institutional ? institution.id : null, sourceType: 'official', reviewedAt: '2026-10-20', status: 'published' }, transaction });
    }
    // findOrCreate no pisa lo que ya existe: las coordenadas cargadas a mano se conservan.
    const institutionId = async name => name ? (await Institution.findOne({ where: { name }, transaction })).id : null;
    for (const { institutionName, ...item } of places) {
      await Place.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, institutionId: await institutionId(institutionName), sourceType: 'official', reviewedAt: '2026-11-08', status: 'published' }, transaction });
    }
    for (const { institutionName, destinationSlug, ...item } of travelRoutes) {
      const destination = destinationSlug ? await Place.findOne({ where: { slug: destinationSlug }, transaction }) : null;
      await TravelRoute.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, institutionId: await institutionId(institutionName), destinationPlaceId: destination?.id ?? null, status: 'published' }, transaction });
    }
    for (const { institutionName, ...item } of groups) {
      const id = await institutionId(institutionName);
      await Group.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, institutionId: id, linkPath: item.linkPath?.replace('{institutionId}', id), status: 'published' }, transaction });
    }
  });
  console.log('Catálogo inicial cargado. No se modificaron cuentas ni contenidos existentes.');
} catch (error) { console.error('Falló la carga inicial:', error.message); process.exitCode = 1; }
finally { await db.close(); }
