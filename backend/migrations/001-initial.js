import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Institution } from '../src/models/institution.model.js';
import { Category } from '../src/models/category.model.js';
import { User } from '../src/models/user.model.js';
import { Content } from '../src/models/content.model.js';
import { Session } from '../src/models/session.model.js';

// Migración inicial. Sequelize genera el DDL a partir de los atributos de cada modelo.
// No se llama a sync() ni se eliminan tablas existentes.
export async function up() {
  const query = sequelize.getQueryInterface();
  for (const model of [Institution, Category, User, Content, Session]) await query.createTable(model.getTableName(), tableColumns(model));
  const indexes = await query.showIndex('contents');
  if (!indexes.some(index => index.name === 'contents_status_category')) await query.addIndex('contents', ['status', 'category_id'], { name: 'contents_status_category' });
  const sessionIndexes = await query.showIndex('sessions');
  if (!sessionIndexes.some(index => index.name === 'sessions_expiration')) await query.addIndex('sessions', ['expires_at'], { name: 'sessions_expiration' });
}
