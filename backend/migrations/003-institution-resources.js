import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { InstitutionResource } from '../src/models/institution_resource.model.js';

export async function up() {
  await sequelize.getQueryInterface().createTable(InstitutionResource.getTableName(), tableColumns(InstitutionResource));
}
