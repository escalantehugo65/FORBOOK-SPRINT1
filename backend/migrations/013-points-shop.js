import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { User } from '../src/models/user.model.js';
import { ShopItem } from '../src/models/shop_item.model.js';
import { UserItem } from '../src/models/user_item.model.js';
import { PointTransaction } from '../src/models/point_transaction.model.js';
import { UserAvatar } from '../src/models/user_avatar.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';

// Puntos, tienda de decoraciones y foto de perfil. También suma al historial las acciones nuevas
// (fichas y rutas cargadas desde la página y fotos quitadas por moderación). Se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  const users = await query.describeTable('users');
  const userAttributes = User.getAttributes();
  for (const key of ['points', 'reputation', 'avatarUpdatedAt']) {
    const attribute = userAttributes[key];
    if (!users[attribute.field]) await query.addColumn('users', attribute.field, attribute);
  }
  for (const model of [ShopItem, UserItem, PointTransaction, UserAvatar]) await query.createTable(model.getTableName(), tableColumns(model));
  const itemIndexes = await query.showIndex('user_items');
  if (!itemIndexes.some(index => index.name === 'user_items_unique')) await query.addIndex('user_items', ['user_id', 'item_id'], { unique: true, name: 'user_items_unique' });
  const pointIndexes = await query.showIndex('point_transactions');
  if (!pointIndexes.some(index => index.name === 'point_transactions_user_reason')) await query.addIndex('point_transactions', ['user_id', 'reason', 'created_at'], { name: 'point_transactions_user_reason' });
  if (!pointIndexes.some(index => index.name === 'point_transactions_target')) await query.addIndex('point_transactions', ['target_type', 'target_id'], { name: 'point_transactions_target' });
  const log = ModerationLog.getAttributes();
  await query.changeColumn('moderation_logs', 'action', log.action);
  await query.changeColumn('moderation_logs', 'target_type', log.targetType);
  // Las cuentas que ya existían reciben el mismo bono de bienvenida que una cuenta nueva (100 puntos).
  await sequelize.transaction(async transaction => {
    const [pending] = await sequelize.query("SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM point_transactions WHERE reason = 'welcome')", { transaction });
    for (const { id } of pending) {
      await sequelize.query('UPDATE users SET points = points + 100 WHERE id = :id', { replacements: { id }, transaction });
      await sequelize.query("INSERT INTO point_transactions (user_id, amount, balance, reason, created_at) SELECT id, 100, points, 'welcome', NOW() FROM users WHERE id = :id", { replacements: { id }, transaction });
    }
  });
}
