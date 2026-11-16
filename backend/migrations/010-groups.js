import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Group } from '../src/models/group.model.js';

// Épica 6: espacios de integración. Se puede ejecutar más de una vez.
export async function up() {
  await sequelize.getQueryInterface().createTable(Group.getTableName(), tableColumns(Group));
}
