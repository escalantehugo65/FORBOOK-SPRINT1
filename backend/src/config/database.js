import { Sequelize } from 'sequelize';

export function createDatabase(config) {
  return new Sequelize(config.db.database, config.db.username, config.db.password, {
    dialect: 'mysql', host: config.db.host, port: config.db.port, logging: false,
    timezone: '+00:00', pool: { max: 5, min: 0, acquire: 15000 },
    define: { underscored: true },
  });
}
