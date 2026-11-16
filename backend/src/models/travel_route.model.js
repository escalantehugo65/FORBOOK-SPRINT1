import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Institution } from './institution.model.js';
import { Place } from './place.model.js';

// Épica 4: rutas orientativas hasta cada institución (FF-22).
export const TravelRoute = sequelize.define(
  'TravelRoute',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    destinationPlaceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    originLabel: { type: DataTypes.STRING(180), allowNull: false },
    mode: { type: DataTypes.ENUM('walk', 'bus', 'bike', 'car', 'mixed'), allowNull: false },
    // Un paso por línea, con referencias que se reconozcan en la calle.
    steps: { type: DataTypes.TEXT, allowNull: false },
    // Texto libre ("entre 20 y 30 minutos"). Solo se muestra como dato firme si la fuente es oficial.
    durationLabel: { type: DataTypes.STRING(120), allowNull: true },
    // Fuente del dato y publicación (igual que en los lugares).
    sourceType: { type: DataTypes.ENUM('official', 'community', 'experience'), allowNull: false },
    sourceLabel: { type: DataTypes.STRING(250), allowNull: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: true },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft', allowNull: false },
    hiddenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'travel_routes' },
);

Institution.hasMany(TravelRoute, { foreignKey: 'institutionId', as: 'routes' });
TravelRoute.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
TravelRoute.belongsTo(Place, { foreignKey: 'destinationPlaceId', as: 'destination' });
