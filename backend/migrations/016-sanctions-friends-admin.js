import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { UserSanction } from '../src/models/user_sanction.model.js';
import { SanctionAppeal } from '../src/models/sanction_appeal.model.js';
import { Friendship } from '../src/models/friendship.model.js';
import { Content } from '../src/models/content.model.js';
import { Report } from '../src/models/report.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';

// Sanciones (restricción, suspensión y baneo) y apelaciones, amistades, fichas creadas por estudiantes,
// reportes de mensajes del chat y acciones nuevas del panel de administración. Se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  for (const model of [UserSanction, SanctionAppeal, Friendship]) await query.createTable(model.getTableName(), tableColumns(model));
  const index = async (table, columns, name, unique = false) => {
    const existing = await query.showIndex(table);
    if (!existing.some(item => item.name === name)) await query.addIndex(table, columns, { name, unique });
  };
  await index('user_sanctions', ['user_id', 'revoked_at', 'ends_at'], 'user_sanctions_user');
  await index('sanction_appeals', ['target_type', 'target_id'], 'sanction_appeals_target', true);
  await index('sanction_appeals', ['status', 'created_at'], 'sanction_appeals_status');
  await index('friendships', ['user_low_id', 'user_high_id'], 'friendships_pair', true);
  await index('friendships', ['user_high_id', 'status'], 'friendships_high');
  await index('friendships', ['requester_id', 'status'], 'friendships_requester');

  const contents = await query.describeTable('contents');
  if (!contents.author_id) await query.addColumn('contents', 'author_id', { ...Content.getAttributes().authorId, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  await index('contents', ['author_id'], 'contents_author');

  await query.changeColumn('reports', 'target_type', Report.getAttributes().targetType);
  const log = ModerationLog.getAttributes();
  await query.changeColumn('moderation_logs', 'action', log.action);
  await query.changeColumn('moderation_logs', 'target_type', log.targetType);
  await query.changeColumn('point_transactions', 'reason', PointTransaction.getAttributes().reason);
}
