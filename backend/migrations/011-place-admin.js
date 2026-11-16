import { sequelize } from '../src/config/database.js';
import { ModerationLog } from '../src/models/moderation_log.model.js';

// Los cambios de lugares del mapa hechos por administración quedan en el historial de moderación.
export async function up() {
  const query = sequelize.getQueryInterface();
  const attributes = ModerationLog.getAttributes();
  await query.changeColumn('moderation_logs', 'action', attributes.action);
  await query.changeColumn('moderation_logs', 'target_type', attributes.targetType);
}
