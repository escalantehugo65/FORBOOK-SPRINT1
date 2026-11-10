// Suma el estado "cerrada" a las preguntas y crea la tabla de respuestas (FF-26 y FF-27).
export async function up(db, models) {
  const query = db.getQueryInterface();
  await query.changeColumn('questions', 'status', models.Question.getAttributes().status);
  const model = models.Answer;
  const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
  await query.createTable(model.getTableName(), attributes);
  const indexes = await query.showIndex('answers');
  if (!indexes.some(index => index.name === 'answers_question_created')) await query.addIndex('answers', ['question_id', 'created_at'], { name: 'answers_question_created' });
}
