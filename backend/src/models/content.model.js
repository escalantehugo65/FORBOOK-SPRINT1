import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Category } from './category.model.js';
import { Institution } from './institution.model.js';

// Fichas de Conozcamos Formosa. Si institutionId tiene valor, solo la ve esa institución.
export const Content = sequelize.define(
  'Content',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    summary: { type: DataTypes.STRING(450), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sourceType: { type: DataTypes.ENUM('official', 'community', 'experience'), allowNull: false },
    sourceLabel: { type: DataTypes.STRING(250), allowNull: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: true },
    authorLabel: { type: DataTypes.STRING(180), allowNull: true },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    // Fecha en que moderación ocultó la ficha (FF-37). null = visible.
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'contents' },
);

Category.hasMany(Content, { foreignKey: 'categoryId', as: 'contents' });
Content.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Institution.hasMany(Content, { foreignKey: 'institutionId', as: 'contents' });
Content.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
