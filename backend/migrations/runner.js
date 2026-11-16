import { DataTypes } from 'sequelize';
import { sequelize } from '../src/config/database.js';
import { up as initial } from './001-initial.js';
import { up as careers } from './002-careers.js';
import { up as resources } from './003-institution-resources.js';
import { up as localities } from './004-origin-localities.js';
import { up as nationalOrigin } from './005-national-origin.js';
import { up as questions } from './005-questions.js';
import { up as answers } from './006-answers.js';
import { up as answerVotes } from './007-answer-votes.js';
import { up as moderation } from './008-moderation.js';
import { up as places } from './009-places.js';
import { up as groups } from './010-groups.js';
import { up as placeAdmin } from './011-place-admin.js';
import { up as profiles } from './012-profiles.js';
import { up as pointsShop } from './013-points-shop.js';
import { up as routeStops } from './014-route-stops.js';

// Orden en que se aplican. Para cambiar la base, agregá una migración nueva al final:
// nunca edites una que ya se aplicó en la base de otra persona.
export const migrations = [
  ['001-initial', initial],
  ['002-careers', careers],
  ['003-institution-resources', resources],
  ['004-origin-localities', localities],
  ['005-national-origin', nationalOrigin],
  ['005-questions', questions],
  ['006-answers', answers],
  ['007-answer-votes', answerVotes],
  ['008-moderation', moderation],
  ['009-places', places],
  ['010-groups', groups],
  ['011-place-admin', placeAdmin],
  ['012-profiles', profiles],
  ['013-points-shop', pointsShop],
  ['014-route-stops', routeStops],
];

// Aplica las que falten y las anota en schema_migrations, para no repetirlas.
// La usan npm run db:migrate (scripts/migrate.js) y los tests.
export const runMigrations = async (onApplied = () => {}) => {
  const query = sequelize.getQueryInterface();
  await query.createTable('schema_migrations', { name: { type: DataTypes.STRING(150), primaryKey: true, allowNull: false } });
  for (const [name, up] of migrations) {
    const [rows] = await sequelize.query('SELECT name FROM schema_migrations WHERE name = :name', { replacements: { name } });
    if (!rows.length) {
      await up();
      await query.bulkInsert('schema_migrations', [{ name }]);
      onApplied(name);
    }
  }
};
