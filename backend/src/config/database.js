import { Sequelize } from 'sequelize';
import { config } from './env.js';

// Una sola conexión para toda la API: cada modelo la importa desde acá.
export const sequelize = new Sequelize(config.db.database, config.db.username, config.db.password, {
  dialect: 'mysql',
  host: config.db.host,
  port: config.db.port,
  logging: false,
  timezone: '+00:00',
  pool: { max: 5, min: 0, acquire: 15000 },
  // En el código se usa camelCase (institutionId) y en las tablas snake_case (institution_id).
  define: { underscored: true },
});

// No se usa sync(): las tablas las crean las migraciones (npm run db:migrate).
export const startDB = async () => {
  await sequelize.authenticate();
  console.log('La base de datos está lista.');
};
