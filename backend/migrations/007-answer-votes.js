// Crea la tabla de marcas "me fue útil" (FF-28). El índice único impide marcar dos veces la misma respuesta.
export async function up(db, models) {
  const query = db.getQueryInterface();
  const model = models.AnswerVote;
  const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
  await query.createTable(model.getTableName(), attributes);
  const indexes = await query.showIndex('answer_votes');
  if (!indexes.some(index => index.name === 'answer_votes_unique')) await query.addIndex('answer_votes', ['answer_id', 'user_id'], { unique: true, name: 'answer_votes_unique' });
}
