import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Community } from './community.model.js';

// Roles propios de cada comunidad ("Veterano", "Ayudante"...). Los crean el dueño, sus administradores
// y la administración de Forbook. canModerate permite borrar mensajes ajenos.
export const CommunityRole = sequelize.define(
  'CommunityRole',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    communityId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(30), allowNull: false },
    color: { type: DataTypes.ENUM('azul', 'menta', 'amarillo', 'coral', 'violeta', 'rio'), allowNull: false, defaultValue: 'azul' },
    canModerate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'community_roles' },
);

Community.hasMany(CommunityRole, { foreignKey: 'communityId', as: 'roles', onDelete: 'CASCADE' });
CommunityRole.belongsTo(Community, { foreignKey: 'communityId', as: 'community', onDelete: 'CASCADE' });
