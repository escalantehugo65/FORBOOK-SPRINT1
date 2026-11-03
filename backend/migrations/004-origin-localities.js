import { DataTypes } from 'sequelize';
export async function up(db, models) {
  const query = db.getQueryInterface();
  const model = models.Locality;
  const attributes = Object.fromEntries(Object.entries(model.getAttributes()).map(([key, value]) => [value.field || key, value]));
  await query.createTable('localities', attributes);
  const users = await query.describeTable('users');
  // Nullable para que las cuentas V1 con procedencias históricas sigan siendo válidas.
  if (!users.origin_locality_id) await query.addColumn('users', 'origin_locality_id', { type: DataTypes.STRING(8), allowNull: true });
  const [constraints] = await db.query('SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = :table AND CONSTRAINT_NAME = :name', { replacements: { table: 'users', name: 'users_origin_locality_fk' } });
  if (!constraints.length) await query.addConstraint('users', { fields: ['origin_locality_id'], type: 'foreign key', name: 'users_origin_locality_fk', references: { table: 'localities', field: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' });
}
