import { DataTypes } from 'sequelize';
import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { User } from '../src/models/user.model.js';
import { Report } from '../src/models/report.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';

// Épica 7: rol de moderador, contenido oculto, reportes e historial de moderación.
// Se puede ejecutar más de una vez: cada paso revisa si ya está hecho.
export async function up() {
  const query = sequelize.getQueryInterface();
  await query.changeColumn('users', 'role', User.getAttributes().role);
  for (const table of ['questions', 'answers', 'contents']) {
    const columns = await query.describeTable(table);
    if (!columns.hidden_at) await query.addColumn(table, 'hidden_at', { type: DataTypes.DATE, allowNull: true });
  }
  for (const model of [Report, ModerationLog]) await query.createTable(model.getTableName(), tableColumns(model));
  const reportIndexes = await query.showIndex('reports');
  if (!reportIndexes.some(index => index.name === 'reports_status_created')) await query.addIndex('reports', ['status', 'created_at'], { name: 'reports_status_created' });
  if (!reportIndexes.some(index => index.name === 'reports_target')) await query.addIndex('reports', ['target_type', 'target_id'], { name: 'reports_target' });
  const logIndexes = await query.showIndex('moderation_logs');
  if (!logIndexes.some(index => index.name === 'moderation_logs_created')) await query.addIndex('moderation_logs', ['created_at'], { name: 'moderation_logs_created' });
}
