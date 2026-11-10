// Crea la tabla de preguntas públicas (FF-24 y FF-25).
export async function up(db, models) {
  const query = db.getQueryInterface();
  const model = models.Question;
  const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
  await query.createTable(model.getTableName(), attributes);
  const indexes = await query.showIndex('questions');
  if (!indexes.some(index => index.name === 'questions_created')) await query.addIndex('questions', ['created_at'], { name: 'questions_created' });
}
