import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Institution } from './institution.model.js';

// Épica 4: lugares del mapa (FF-21 y FF-23).
// Las coordenadas son opcionales: un lugar sin ubicación verificada se muestra igual,
// solo con su dirección o referencia en texto.
export const Place = sequelize.define(
  'Place',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    kind: { type: DataTypes.ENUM('institution', 'health', 'security', 'procedures', 'transport', 'services'), allowNull: false },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    addressLabel: { type: DataTypes.STRING(250), allowNull: true },
    studentNote: { type: DataTypes.STRING(450), allowNull: true },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: true },
    // Fuente del dato y publicación (igual que en las rutas).
    sourceType: { type: DataTypes.ENUM('official', 'community', 'experience'), allowNull: false },
    sourceLabel: { type: DataTypes.STRING(250), allowNull: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: true },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'places' },
);

Institution.hasMany(Place, { foreignKey: 'institutionId', as: 'places' });
Place.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
