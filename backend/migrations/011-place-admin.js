// Los cambios de lugares del mapa hechos por administración quedan en el historial de moderación.
export async function up(db, models) {
  const query = db.getQueryInterface();
  const attributes = models.ModerationLog.getAttributes();
  await query.changeColumn('moderation_logs', 'action', attributes.action);
  await query.changeColumn('moderation_logs', 'target_type', attributes.targetType);
}
