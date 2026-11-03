import { DataTypes } from 'sequelize';
import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { up as initial } from '../migrations/001-initial.js';
import { up as careers } from '../migrations/002-careers.js';

const db = createDatabase(readConfig());
try {
  await db.authenticate();
  const models = defineModels(db);
  const query = db.getQueryInterface();
  await query.createTable('schema_migrations', { name: { type: DataTypes.STRING(150), primaryKey: true, allowNull: false } });
  for (const [name, up] of [['001-initial', initial], ['002-careers', careers]]) {
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
