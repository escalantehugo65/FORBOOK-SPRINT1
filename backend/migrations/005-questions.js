import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Question } from '../src/models/question.model.js';

// Crea la tabla de preguntas públicas (FF-24 y FF-25).
export async function up() {
  const query = sequelize.getQueryInterface();
  await query.createTable(Question.getTableName(), tableColumns(Question));
  const indexes = await query.showIndex('questions');
  if (!indexes.some(index => index.name === 'questions_created')) await query.addIndex('questions', ['created_at'], { name: 'questions_created' });
}
