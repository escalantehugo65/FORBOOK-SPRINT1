import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';
import { Category } from './category.model.js';
import { Institution } from './institution.model.js';

// Preguntas públicas (FF-24 y FF-25).
export const Question = sequelize.define(
  'Question',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('open', 'answered', 'closed'), allowNull: false, defaultValue: 'open' },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'questions' },
);

User.hasMany(Question, { foreignKey: 'userId', as: 'questions' });
Question.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Category.hasMany(Question, { foreignKey: 'categoryId', as: 'questions' });
Question.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Institution.hasMany(Question, { foreignKey: 'institutionId', as: 'questions' });
Question.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
