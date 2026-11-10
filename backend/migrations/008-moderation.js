import { DataTypes } from 'sequelize';

// Épica 7: rol de moderador, contenido oculto, reportes e historial de moderación.
// Se puede ejecutar más de una vez: cada paso revisa si ya está hecho.
export async function up(db, models) {
  const query = db.getQueryInterface();
  await query.changeColumn('users', 'role', models.User.getAttributes().role);
  for (const table of ['questions', 'answers', 'contents']) {
    const columns = await query.describeTable(table);
    if (!columns.hidden_at) await query.addColumn(table, 'hidden_at', { type: DataTypes.DATE, allowNull: true });
  }
  for (const model of [models.Report, models.ModerationLog]) {
    const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
    await query.createTable(model.getTableName(), attributes);
  }
  const reportIndexes = await query.showIndex('reports');
  if (!reportIndexes.some(index => index.name === 'reports_status_created')) await query.addIndex('reports', ['status', 'created_at'], { name: 'reports_status_created' });
  if (!reportIndexes.some(index => index.name === 'reports_target')) await query.addIndex('reports', ['target_type', 'target_id'], { name: 'reports_target' });
  const logIndexes = await query.showIndex('moderation_logs');
  if (!logIndexes.some(index => index.name === 'moderation_logs_created')) await query.addIndex('moderation_logs', ['created_at'], { name: 'moderation_logs_created' });
}
