import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Question } from './question.model.js';
import { User } from './user.model.js';

// Respuestas de una pregunta (FF-26 y FF-27).
export const Answer = sequelize.define(
  'Answer',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    questionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'answers' },
);

Question.hasMany(Answer, { foreignKey: 'questionId', as: 'answers' });
Answer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });
User.hasMany(Answer, { foreignKey: 'userId', as: 'answers' });
Answer.belongsTo(User, { foreignKey: 'userId', as: 'author' });
