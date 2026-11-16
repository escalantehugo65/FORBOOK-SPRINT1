// npm run db:migrate: crea o actualiza las tablas. Se puede correr las veces que haga falta.
import { sequelize } from '../src/config/database.js';
import { runMigrations } from '../migrations/runner.js';

try {
  await sequelize.authenticate();
  await runMigrations(name => console.log(`Migración ${name} aplicada.`));
  console.log('La base está actualizada.');
} catch (error) {
  console.error('Falló la migración:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
