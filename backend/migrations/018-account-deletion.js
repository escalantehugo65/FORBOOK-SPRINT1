import { sequelize } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';

// Bajas de cuenta: users.deleted_at marca una cuenta borrada (la persona la dio de baja o la borró la administración).
// La cuenta queda anónima («Cuenta eliminada») para no romper las preguntas, respuestas y mensajes que dejó.
// Agrega la acción account_delete al historial. No borra datos y se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  const users = await query.describeTable('users');
  if (!users.deleted_at) await query.addColumn('users', 'deleted_at', User.getAttributes().deletedAt);
  const indexes = await query.showIndex('users');
  if (!indexes.some(item => item.name === 'users_deleted_at')) await query.addIndex('users', ['deleted_at'], { name: 'users_deleted_at' });
  await query.changeColumn('moderation_logs', 'action', ModerationLog.getAttributes().action);
}
