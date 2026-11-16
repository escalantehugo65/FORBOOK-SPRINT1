import { sequelize } from '../src/config/database.js';
import { tableColumns } from '../src/helpers/migration.helper.js';
import { Place } from '../src/models/place.model.js';
import { TravelRoute } from '../src/models/travel_route.model.js';

// Épica 4: lugares del mapa y rutas orientativas. Se puede ejecutar más de una vez.
export async function up() {
  const query = sequelize.getQueryInterface();
  for (const model of [Place, TravelRoute]) await query.createTable(model.getTableName(), tableColumns(model));
  const placeIndexes = await query.showIndex('places');
  if (!placeIndexes.some(index => index.name === 'places_visible')) await query.addIndex('places', ['status', 'hidden_at', 'kind'], { name: 'places_visible' });
  const routeIndexes = await query.showIndex('travel_routes');
  if (!routeIndexes.some(index => index.name === 'travel_routes_institution')) await query.addIndex('travel_routes', ['institution_id', 'status'], { name: 'travel_routes_institution' });
}
