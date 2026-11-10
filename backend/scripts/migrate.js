import { DataTypes } from 'sequelize';
import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { up as initial } from '../migrations/001-initial.js';
import { up as careers } from '../migrations/002-careers.js';
import { up as resources } from '../migrations/003-institution-resources.js';
import { up as localities } from '../migrations/004-origin-localities.js';
import { up as questions } from '../migrations/005-questions.js';
import { up as answers } from '../migrations/006-answers.js';
import { up as answerVotes } from '../migrations/007-answer-votes.js';
import { up as moderation } from '../migrations/008-moderation.js';
import { up as places } from '../migrations/009-places.js';
import { up as groups } from '../migrations/010-groups.js';
import { up as placeAdmin } from '../migrations/011-place-admin.js';

import { up as nationalOrigin } from '../migrations/005-national-origin.js';

const db = createDatabase(readConfig());
try {
  await db.authenticate();
  const models = defineModels(db);
  const query = db.getQueryInterface();
  await query.createTable('schema_migrations', { name: { type: DataTypes.STRING(150), primaryKey: true, allowNull: false } });
  for (const [name, up] of [['001-initial', initial], ['002-careers', careers], ['003-institution-resources', resources], ['004-origin-localities', localities], ['005-national-origin', nationalOrigin], ['005-questions', questions], ['006-answers', answers], ['007-answer-votes', answerVotes], ['008-moderation', moderation], ['009-places', places], ['010-groups', groups], ['011-place-admin', placeAdmin]]) {
    const [rows] = await db.query('SELECT name FROM schema_migrations WHERE name = :name', { replacements: { name } });
    if (!rows.length) {
      await up(db, models);
      await query.bulkInsert('schema_migrations', [{ name }]);
      console.log(`Migración ${name} aplicada.`);
    }
  }
  console.log('La base está actualizada.');
} catch (error) { console.error('Falló la migración:', error.message); process.exitCode = 1; }
finally { await db.close(); }
