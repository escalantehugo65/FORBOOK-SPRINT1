import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Institution } from './institution.model.js';

// Carreras de cada institución, para elegir en el registro.
export const Career = sequelize.define(
  'Career',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'careers' },
);

Institution.hasMany(Career, { foreignKey: 'institutionId', as: 'careers' });
Career.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
