import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { User } from '../src/models/user.model.js';
import { UserWarning } from '../src/models/user_warning.model.js';
import { Report } from '../src/models/report.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';

// Perfiles de usuario: descripción, decoración, intereses, privacidad y advertencias de moderación.
// Se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  const users = await query.describeTable('users');
  const userAttributes = User.getAttributes();
  for (const key of ['bio', 'avatarColor', 'bannerStyle', 'interests', 'cohortYear', 'showOrigin', 'showArrival', 'bioHiddenAt']) {
    const attribute = userAttributes[key];
    if (!users[attribute.field]) await query.addColumn('users', attribute.field, attribute);
  }
  await query.createTable(UserWarning.getTableName(), tableColumns(UserWarning));
  const indexes = await query.showIndex('user_warnings');
  if (!indexes.some(index => index.name === 'user_warnings_user')) await query.addIndex('user_warnings', ['user_id', 'revoked_at'], { name: 'user_warnings_user' });
  // Se suman perfiles a reportes e historial, y el motivo "datos personales".
  const report = Report.getAttributes();
  await query.changeColumn('reports', 'target_type', report.targetType);
  await query.changeColumn('reports', 'reason', report.reason);
  const log = ModerationLog.getAttributes();
  await query.changeColumn('moderation_logs', 'action', log.action);
  await query.changeColumn('moderation_logs', 'target_type', log.targetType);
}
