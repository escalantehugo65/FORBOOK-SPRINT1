import { DataTypes } from 'sequelize';
import { sequelize } from '../src/config/database.js';

// La versión de la foto de perfil (?v=…) sale de avatar_updated_at. Con precisión de segundos, dos fotos
// subidas en el mismo segundo tenían la misma dirección y el navegador seguía mostrando la vieja.
// Se guarda con milisegundos. No borra datos y se puede ejecutar más de una vez.
export async function up() {
  await sequelize.getQueryInterface().changeColumn('users', 'avatar_updated_at', { type: DataTypes.DATE(3), allowNull: true });
}
