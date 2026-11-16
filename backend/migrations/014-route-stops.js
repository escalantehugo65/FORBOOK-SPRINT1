import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { RouteStop } from '../src/models/route_stop.model.js';

// Paradas de las rutas (FF-22): el colectivo del IPF y las que se carguen después. Se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  await query.createTable(RouteStop.getTableName(), tableColumns(RouteStop));
  const indexes = await query.showIndex('route_stops');
  if (!indexes.some(index => index.name === 'route_stops_route')) await query.addIndex('route_stops', ['route_id', 'position'], { name: 'route_stops_route' });
}
