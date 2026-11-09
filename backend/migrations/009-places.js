// Épica 4: lugares del mapa y rutas orientativas. Se puede ejecutar más de una vez.
export async function up(db, models) {
  const query = db.getQueryInterface();
  for (const model of [models.Place, models.TravelRoute]) {
    const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
    await query.createTable(model.getTableName(), attributes);
  }
  const placeIndexes = await query.showIndex('places');
  if (!placeIndexes.some(index => index.name === 'places_visible')) await query.addIndex('places', ['status', 'hidden_at', 'kind'], { name: 'places_visible' });
  const routeIndexes = await query.showIndex('travel_routes');
  if (!routeIndexes.some(index => index.name === 'travel_routes_institution')) await query.addIndex('travel_routes', ['institution_id', 'status'], { name: 'travel_routes_institution' });
}
