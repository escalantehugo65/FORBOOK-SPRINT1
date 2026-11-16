import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TravelRoute } from './travel_route.model.js';

// Paradas de una ruta (FF-22), por ejemplo las del colectivo del IPF.
// Se muestran como puntos en el mapa: no se dibuja el recorrido entre ellas.
// position solo ordena la lista; no indica por dónde pasa primero el colectivo.
export const RouteStop = sequelize.define(
  'RouteStop',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    routeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    position: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    // Referencia para reconocerla en la calle ("Frente al Correo Argentino").
    reference: { type: DataTypes.STRING(250), allowNull: true },
    latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
  },
  { tableName: 'route_stops' },
);

TravelRoute.hasMany(RouteStop, { foreignKey: 'routeId', as: 'stops', onDelete: 'CASCADE' });
RouteStop.belongsTo(TravelRoute, { foreignKey: 'routeId', as: 'route', onDelete: 'CASCADE' });
