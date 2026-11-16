import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Question } from '../src/models/question.model.js';
import { Answer } from '../src/models/answer.model.js';

// Suma el estado "cerrada" a las preguntas y crea la tabla de respuestas (FF-26 y FF-27).
export async function up() {
  const query = sequelize.getQueryInterface();
  await query.changeColumn('questions', 'status', Question.getAttributes().status);
  await query.createTable(Answer.getTableName(), tableColumns(Answer));
  const indexes = await query.showIndex('answers');
  if (!indexes.some(index => index.name === 'answers_question_created')) await query.addIndex('answers', ['question_id', 'created_at'], { name: 'answers_question_created' });
}
