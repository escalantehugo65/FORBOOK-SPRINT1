// Migración inicial. Sequelize genera el DDL a partir de los atributos definidos.
// No se llama a sync() ni se eliminan tablas existentes.
export async function up(db, models) {
  const query = db.getQueryInterface();
  for (const name of ['Institution', 'Category', 'User', 'Content', 'Session']) {
    const model = models[name];
    const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
    await query.createTable(model.getTableName(), attributes);
  }
  const indexes = await query.showIndex('contents');
  if (!indexes.some(index => index.name === 'contents_status_category')) await query.addIndex('contents', ['status', 'category_id'], { name: 'contents_status_category' });
  const sessionIndexes = await query.showIndex('sessions');
  if (!sessionIndexes.some(index => index.name === 'sessions_expiration')) await query.addIndex('sessions', ['expires_at'], { name: 'sessions_expiration' });
}
