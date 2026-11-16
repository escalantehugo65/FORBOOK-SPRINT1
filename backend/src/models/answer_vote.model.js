import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Answer } from './answer.model.js';
import { User } from './user.model.js';

// Marcas de "me fue útil" en las respuestas (FF-28): una por usuario y respuesta.
export const AnswerVote = sequelize.define(
  'AnswerVote',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    answerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: 'answer_votes',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['answer_id', 'user_id'], name: 'answer_votes_unique' }],
  },
);

Answer.hasMany(AnswerVote, { foreignKey: 'answerId', as: 'votes' });
AnswerVote.belongsTo(Answer, { foreignKey: 'answerId', as: 'answer' });
User.hasMany(AnswerVote, { foreignKey: 'userId', as: 'answerVotes' });
AnswerVote.belongsTo(User, { foreignKey: 'userId', as: 'user' });
