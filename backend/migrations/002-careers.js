import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Career } from '../src/models/career.model.js';

export async function up() {
  await sequelize.getQueryInterface().createTable(Career.getTableName(), tableColumns(Career));
}
