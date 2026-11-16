// Perfiles de usuario: descripción, decoración, intereses, privacidad y advertencias de moderación.
// Se puede ejecutar más de una vez.
export async function up(db, models) {
  const query = db.getQueryInterface();
  const users = await query.describeTable('users');
  const userAttributes = models.User.getAttributes();
  for (const key of ['bio', 'avatarColor', 'bannerStyle', 'interests', 'cohortYear', 'showOrigin', 'showArrival', 'bioHiddenAt']) {
    const attribute = userAttributes[key];
    if (!users[attribute.field]) await query.addColumn('users', attribute.field, attribute);
  }
  const warning = models.UserWarning;
  await query.createTable(warning.getTableName(), Object.fromEntries(Object.entries(warning.getAttributes()).map(([key, value]) => [value.field || key, value])));
  const indexes = await query.showIndex('user_warnings');
  if (!indexes.some(index => index.name === 'user_warnings_user')) await query.addIndex('user_warnings', ['user_id', 'revoked_at'], { name: 'user_warnings_user' });
  // Se suman perfiles a reportes e historial, y el motivo "datos personales".
  const report = models.Report.getAttributes();
  await query.changeColumn('reports', 'target_type', report.targetType);
  await query.changeColumn('reports', 'reason', report.reason);
  const log = models.ModerationLog.getAttributes();
  await query.changeColumn('moderation_logs', 'action', log.action);
  await query.changeColumn('moderation_logs', 'target_type', log.targetType);
}
