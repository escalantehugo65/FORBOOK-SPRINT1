// Épica 6: espacios de integración. Se puede ejecutar más de una vez.
export async function up(db, models) {
  const query = db.getQueryInterface();
  const model = models.Group;
  const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
  await query.createTable(model.getTableName(), attributes);
}
