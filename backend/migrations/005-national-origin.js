import { DataTypes } from 'sequelize';
export async function up(db) {
  const query = db.getQueryInterface();
  const localities = await query.describeTable('localities');
  if (!localities.province_name) await query.addColumn('localities', 'province_name', { type: DataTypes.STRING(100), allowNull: true });
  const users = await query.describeTable('users');
  if (!users.origin_country_code) await query.addColumn('users', 'origin_country_code', { type: DataTypes.STRING(2), allowNull: true });
  // Solo los perfiles con localidad canónica ya eran argentinos. Los históricos quedan intactos.
  await db.query("UPDATE users SET origin_country_code = 'AR' WHERE origin_country_code IS NULL AND origin_locality_id IS NOT NULL");
}
