import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Categorías de las fichas y de las preguntas (se administran en Moderación → Catálogo).
export const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(350), allowNull: false },
  },
  { tableName: 'categories' },
);
