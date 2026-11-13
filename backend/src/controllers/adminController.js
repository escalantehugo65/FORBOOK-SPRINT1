import { Op, fn, col } from 'sequelize';
import { HttpError } from '../helpers/http.js';
import { positiveId, validateCategory, validateSource, validatePlace } from '../middlewares/validation.js';

// Administrar categorías y metadatos de fuente (FF-39) y los lugares del mapa (épica 4).
// Cada cambio queda en el historial (FF-38).
export function adminController({ Category, Content, Question, Institution, Place, ModerationLog }) {
  const slugify = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  const countBy = async model => new Map((await model.findAll({ attributes: ['categoryId', [fn('COUNT', col('id')), 'total']], group: ['categoryId'], raw: true })).map(row => [row.categoryId, Number(row.total)]));
  const shorten = text => text.length > 500 ? `${text.slice(0, 497)}…` : text;
  const log = (req, action, targetType, targetId, note, transaction) => ModerationLog.create({ moderatorId: req.session.userId, action, targetType, targetId, note: shorten(note) }, { transaction });
  const findCategory = async req => {
    const category = await Category.findByPk(positiveId(req.params.id, 'Categoría'));
    if (!category) throw new HttpError(404, 'No encontramos esa categoría.');
    return category;
  };
  const sourceFields = { sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', authorLabel: 'autoría', reviewedAt: 'fecha de revisión' };
  const contentAttributes = ['id', 'title', 'status', 'hiddenAt', 'categoryId', 'institutionId', ...Object.keys(sourceFields)];
  const contentInclude = [{ model: Category, as: 'category', attributes: ['id', 'name'] }, { model: Institution, as: 'institution', attributes: ['id', 'name'] }];
  const placeFields = { name: 'nombre', kind: 'categoría', institutionId: 'institución', addressLabel: 'dirección', studentNote: 'nota', latitude: 'ubicación', longitude: 'ubicación', status: 'estado', sourceType: 'tipo de fuente', sourceLabel: 'fuente', sourceUrl: 'enlace', reviewedAt: 'fecha de revisión' };
  const placeAttributes = ['id', 'slug', 'institutionId', ...Object.keys(placeFields)];
  const placeInstitution = { model: Institution, as: 'institution', attributes: ['id', 'name'] };
  // MySQL devuelve DECIMAL como texto: el mapa necesita números.
  const presentPlace = place => {
    const { latitude, longitude, ...rest } = place.toJSON();
    return { ...rest, latitude: latitude === null ? null : Number(latitude), longitude: longitude === null ? null : Number(longitude) };
  };
  const checkInstitution = async id => {
    if (id !== null && !await Institution.findByPk(id)) throw new HttpError(400, 'Revisá los campos indicados.', { institutionId: 'Elegí una institución válida.' });
  };
  return {
    categories: async (req, res) => {
      const [rows, contents, questions] = await Promise.all([Category.findAll({ attributes: ['id', 'name', 'slug', 'description'], order: [['id', 'ASC']] }), countBy(Content), countBy(Question)]);
      res.json({ data: rows.map(row => ({ ...row.get({ plain: true }), contentCount: contents.get(row.id) || 0, questionCount: questions.get(row.id) || 0 })) });
    },
    createCategory: async (req, res) => {
      const input = validateCategory(req.body);
      const slug = slugify(input.name);
      if (!slug) throw new HttpError(400, 'Revisá los campos indicados.', { name: 'Usá letras o números en el nombre.' });
      if (await Category.findOne({ where: { [Op.or]: [{ slug }, { name: input.name }] } })) throw new HttpError(409, 'Ya existe una categoría con ese nombre.', { name: 'Elegí otro nombre.' });
      const category = await Category.sequelize.transaction(async transaction => {
        const created = await Category.create({ ...input, slug }, { transaction });
        await log(req, 'category_create', 'category', created.id, `Creó la categoría "${created.name}".`, transaction);
        return created;
      });
      res.status(201).json({ data: { id: category.id, name: category.name, slug: category.slug, description: category.description, contentCount: 0, questionCount: 0 } });
    },
    updateCategory: async (req, res) => {
      const category = await findCategory(req);
      const input = validateCategory(req.body);
      if (await Category.findOne({ where: { name: input.name, id: { [Op.ne]: category.id } } })) throw new HttpError(409, 'Ya existe una categoría con ese nombre.', { name: 'Elegí otro nombre.' });
      const changes = [];
      if (input.name !== category.name) changes.push(`nombre "${category.name}" → "${input.name}"`);
      if (input.description !== category.description) changes.push('descripción');
      if (changes.length) {
        const previousName = category.name;
        // El slug no cambia: así las fichas y preguntas siguen ligadas y los enlaces no se rompen.
        await Category.sequelize.transaction(async transaction => {
          await category.update(input, { transaction });
          await log(req, 'category_update', 'category', category.id, `Editó la categoría "${previousName}": ${changes.join('; ')}.`, transaction);
        });
      }
      res.json({ data: { id: category.id, name: category.name, slug: category.slug, description: category.description } });
    },
    deleteCategory: async (req, res) => {
      const category = await findCategory(req);
      const [contentCount, questionCount] = await Promise.all([Content.count({ where: { categoryId: category.id } }), Question.count({ where: { categoryId: category.id } })]);
      // Nunca se borra en silencio algo que tenga fichas o preguntas asociadas.
      if (contentCount || questionCount) throw new HttpError(409, `No se puede borrar: la usan ${contentCount} ${contentCount === 1 ? 'ficha' : 'fichas'} y ${questionCount} ${questionCount === 1 ? 'pregunta' : 'preguntas'}. Primero cambiales la categoría.`);
      await Category.sequelize.transaction(async transaction => {
        await log(req, 'category_delete', 'category', category.id, `Borró la categoría "${category.name}" (no tenía fichas ni preguntas).`, transaction);
        await category.destroy({ transaction });
      });
      res.json({ data: { id: category.id } });
    },
    contents: async (req, res) => {
      res.json({ data: await Content.findAll({ attributes: contentAttributes, include: contentInclude, order: [['id', 'ASC']], limit: 200 }) });
    },
    places: async (req, res) => {
      res.json({ data: (await Place.findAll({ attributes: placeAttributes, include: [placeInstitution], order: [['name', 'ASC'], ['id', 'ASC']] })).map(presentPlace) });
    },
    createPlace: async (req, res) => {
      const input = validatePlace(req.body);
      await checkInstitution(input.institutionId);
      const base = slugify(input.name) || 'lugar';
      let slug = base;
      for (let n = 2; await Place.findOne({ where: { slug } }); n += 1) slug = `${base}-${n}`;
      const place = await Place.sequelize.transaction(async transaction => {
        const created = await Place.create({ ...input, slug }, { transaction });
        await log(req, 'place_create', 'place', created.id, `Agregó el lugar "${created.name}"${input.latitude === null ? ' sin ubicación' : ' con ubicación en el mapa'}.`, transaction);
        return created;
      });
      res.status(201).json({ data: presentPlace(await Place.findByPk(place.id, { attributes: placeAttributes, include: [placeInstitution] })) });
    },
    updatePlace: async (req, res) => {
      const place = await Place.findByPk(positiveId(req.params.id, 'Lugar'));
      if (!place) throw new HttpError(404, 'No encontramos ese lugar.');
      const input = validatePlace(req.body);
      await checkInstitution(input.institutionId);
      const same = (key, value) => key === 'latitude' || key === 'longitude' ? (place[key] === null ? null : Number(place[key])) === value : (place[key] ?? null) === value;
      const changed = Object.keys(placeFields).filter(key => !same(key, input[key]));
      if (changed.length) {
        await Place.sequelize.transaction(async transaction => {
          await place.update(input, { transaction });
          const labels = [...new Set(changed.map(key => placeFields[key]))];
          await log(req, 'place_update', 'place', place.id, `Editó el lugar "${place.name}": ${labels.join(', ')}.`, transaction);
        });
      }
      res.json({ data: presentPlace(await Place.findByPk(place.id, { attributes: placeAttributes, include: [placeInstitution] })) });
    },
    updateSource: async (req, res) => {
      const content = await Content.findByPk(positiveId(req.params.id, 'Ficha'));
      if (!content) throw new HttpError(404, 'No encontramos esa ficha.');
      const input = validateSource(req.body);
      const changed = Object.keys(sourceFields).filter(key => (content[key] ?? null) !== input[key]);
      if (changed.length) {
        await Content.sequelize.transaction(async transaction => {
          await content.update(input, { transaction });
          await log(req, 'source_update', 'content', content.id, `Actualizó ${changed.map(key => sourceFields[key]).join(', ')} de la ficha "${content.title}".`, transaction);
        });
      }
      res.json({ data: await Content.findByPk(content.id, { attributes: contentAttributes, include: contentInclude }) });
    },
  };
}
