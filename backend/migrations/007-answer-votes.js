import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { AnswerVote } from '../src/models/answer_vote.model.js';

// Crea la tabla de marcas "me fue útil" (FF-28). El índice único impide marcar dos veces la misma respuesta.
export async function up() {
  const query = sequelize.getQueryInterface();
  await query.createTable(AnswerVote.getTableName(), tableColumns(AnswerVote));
  const indexes = await query.showIndex('answer_votes');
  if (!indexes.some(index => index.name === 'answer_votes_unique')) await query.addIndex('answer_votes', ['answer_id', 'user_id'], { unique: true, name: 'answer_votes_unique' });
}
