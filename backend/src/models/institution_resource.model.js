import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Institution } from './institution.model.js';

// Accesos útiles de cada institución (campus virtual, autogestión, etc.).
export const InstitutionResource = sequelize.define(
  'InstitutionResource',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.STRING(350), allowNull: false },
    url: { type: DataTypes.STRING(1000), allowNull: false },
    availabilityNote: { type: DataTypes.STRING(350), allowNull: true },
    position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'institution_resources' },
);

Institution.hasMany(InstitutionResource, { foreignKey: 'institutionId', as: 'resources' });
InstitutionResource.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
