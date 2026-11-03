export async function up(db, models) {
  const model = models.Career;
  const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
  await db.getQueryInterface().createTable('careers', attributes);
}
