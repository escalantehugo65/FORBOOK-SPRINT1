import { DataTypes } from 'sequelize';
import { readConfig } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { defineModels } from '../src/models/index.js';
import { up } from '../migrations/001-initial.js';

const db = createDatabase(readConfig());
try {
  await db.authenticate();
  const query = db.getQueryInterface();
  await query.createTable('schema_migrations', { name: { type: DataTypes.STRING(150), primaryKey: true, allowNull: false } });
  const [rows] = await db.query('SELECT name FROM schema_migrations WHERE name = :name', { replacements: { name: '001-initial' } });
  if (!rows.length) {
    await up(db, defineModels(db));
    await query.bulkInsert('schema_migrations', [{ name: '001-initial' }]);
    console.log('Migración 001-initial aplicada.');
  } else console.log('La base está actualizada.');
} catch (error) { console.error('Falló la migración:', error.message); process.exitCode = 1; }
finally { await db.close(); }
