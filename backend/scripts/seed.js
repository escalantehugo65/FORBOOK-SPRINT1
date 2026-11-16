// npm run db:seed: carga el catálogo inicial. findOrCreate no pisa lo que ya existe:
// las cuentas, las fichas editadas y las coordenadas cargadas a mano se conservan.
// La única excepción son las fichas de contentRevisions, y solo si nadie las editó desde la página.
import { sequelize } from '../src/config/database.js';
import { Institution } from '../src/models/institution.model.js';
import { Career } from '../src/models/career.model.js';
import { InstitutionResource } from '../src/models/institution_resource.model.js';
import { Category } from '../src/models/category.model.js';
import { Content } from '../src/models/content.model.js';
import { Place } from '../src/models/place.model.js';
import { TravelRoute } from '../src/models/travel_route.model.js';
import { RouteStop } from '../src/models/route_stop.model.js';
import { Group } from '../src/models/group.model.js';
import { institutions, categories, contents, contentRevisions, places, travelRoutes, groups } from '../seeders/catalog.js';
import { careerCatalog } from '../seeders/careers.js';
import { institutionResources } from '../seeders/institutionResources.js';
import { seedLocalities } from '../seeders/localities.js';
import { seedMapPlaces } from '../seeders/mapPlaces.js';
import { seedShopItems } from '../seeders/shop.js';

let revised = 0;
try {
  await sequelize.authenticate();
  await sequelize.transaction(async transaction => {
    await seedLocalities(transaction);
    for (const item of institutions) await Institution.findOrCreate({ where: { name: item.name }, defaults: item, transaction });
    for (const catalog of careerCatalog) {
      const institution = await Institution.findOne({ where: { name: catalog.institutionName }, transaction });
      for (const name of catalog.names) {
        const slug = `${catalog.prefix}-${name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`;
        await Career.findOrCreate({ where: { slug }, defaults: { name, institutionId: institution.id, sourceUrl: catalog.sourceUrl, reviewedAt: '2026-11-03' }, transaction });
      }
    }
    for (const { institutionName, ...resource } of institutionResources) {
      const institution = await Institution.findOne({ where: { name: institutionName }, transaction });
      await InstitutionResource.findOrCreate({ where: { slug: resource.slug }, defaults: { ...resource, institutionId: institution.id }, transaction });
    }
    for (const item of categories) await Category.findOrCreate({ where: { slug: item.slug }, defaults: item, transaction });
    const institutionId = async name => (name ? (await Institution.findOne({ where: { name }, transaction })).id : null);
    for (const { categorySlug, institutionName, ...item } of contents) {
      const category = await Category.findOne({ where: { slug: categorySlug }, transaction });
      // Cada ficha puede traer su propia fecha de revisión; las primeras se revisaron el 20/10/2026.
      // Con institutionName, la ficha solo la ven estudiantes de esa institución (FF-18).
      await Content.findOrCreate({ where: { slug: item.slug }, defaults: { sourceType: 'official', reviewedAt: '2026-10-20', ...item, categoryId: category.id, institutionId: await institutionId(institutionName), status: 'published' }, transaction });
    }
    // Fichas que cambiaron en el catálogo: se actualizan solo si siguen tal cual las cargó una versión anterior.
    for (const { slug, previous } of contentRevisions) {
      const stored = await Content.findOne({ where: { slug }, transaction });
      if (!stored || Object.entries(previous).some(([key, value]) => stored[key] !== value)) continue;
      const { categorySlug, institutionName, ...current } = contents.find(item => item.slug === slug);
      await stored.update(current, { transaction });
      revised += 1;
    }
    await seedMapPlaces(transaction);
    for (const item of places) await Place.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, status: 'published' }, transaction });
    for (const { institutionName, destinationSlug, stops = [], ...item } of travelRoutes) {
      const destination = destinationSlug ? await Place.findOne({ where: { slug: destinationSlug }, transaction }) : null;
      const [route, created] = await TravelRoute.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, institutionId: await institutionId(institutionName), destinationPlaceId: destination?.id ?? null, status: 'published' }, transaction });
      if (created && stops.length) await RouteStop.bulkCreate(stops.map((stop, index) => ({ ...stop, routeId: route.id, position: index + 1 })), { transaction });
    }
    for (const { institutionName, ...item } of groups) {
      const id = await institutionId(institutionName);
      await Group.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, institutionId: id, linkPath: item.linkPath?.replace('{institutionId}', id), status: 'published' }, transaction });
    }
    await seedShopItems(transaction);
  });
  console.log('Catálogo inicial cargado. No se modificaron cuentas ni contenidos editados.');
  if (revised) console.log(revised === 1 ? 'Se actualizó 1 ficha del catálogo que nadie había editado.' : `Se actualizaron ${revised} fichas del catálogo que nadie había editado.`);
} catch (error) {
  console.error('Falló la carga inicial:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
