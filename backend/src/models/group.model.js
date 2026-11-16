import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Institution } from './institution.model.js';

// Épica 6: espacios de integración (FF-30 y FF-31). No hay membresía ni chat privado:
// cada espacio describe para quién es y, si existe, lleva a una sección pública de Forbook.
export const Group = sequelize.define(
  'Group',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    kind: { type: DataTypes.ENUM('institution', 'origin', 'arrival', 'general'), allowNull: false },
    audience: { type: DataTypes.STRING(300), allowNull: false },
    summary: { type: DataTypes.STRING(300), allowNull: false },
    purpose: { type: DataTypes.TEXT, allowNull: false },
    // Criterios de sugerencia: null o 'any' significa "para todos".
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    originScope: { type: DataTypes.ENUM('any', 'formosa', 'outside'), allowNull: false, defaultValue: 'any' },
    arrivalScope: { type: DataTypes.ENUM('any', 'not_arrived', 'arrived'), allowNull: false, defaultValue: 'any' },
    linkPath: { type: DataTypes.STRING(250), allowNull: true },
    linkLabel: { type: DataTypes.STRING(120), allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'groups' },
);

Institution.hasMany(Group, { foreignKey: 'institutionId', as: 'groups' });
Group.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
