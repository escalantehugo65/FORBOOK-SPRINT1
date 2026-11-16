import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Comunidades: grupos con un único chat general. Las predeterminadas (kind = 'default') no tienen
// dueño y las administra el equipo de Forbook; las demás las crea un estudiante (hasta 2 por persona).
export const Community = sequelize.define(
  'Community',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(60), allowNull: false },
    description: { type: DataTypes.STRING(300), allowNull: false },
    // Reglas propias de la comunidad, además de las de Forbook. Opcional.
    rules: { type: DataTypes.STRING(1000), allowNull: true },
    kind: { type: DataTypes.ENUM('default', 'user'), allowNull: false, defaultValue: 'user' },
    topic: { type: DataTypes.ENUM('barrio', 'institucion', 'estudio', 'vida', 'intereses', 'otro'), allowNull: false, defaultValue: 'otro' },
    // Color de la portada (los mismos nombres que el avatar).
    color: { type: DataTypes.ENUM('azul', 'menta', 'amarillo', 'coral', 'violeta', 'rio'), allowNull: false, defaultValue: 'azul' },
    ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // Se guarda para listar y ordenar sin contar miembros en cada consulta.
    membersCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    // Cerrada por su dueño o por administración: deja de verse, pero no se borra.
    closedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'communities' },
);

User.hasMany(Community, { foreignKey: 'ownerId', as: 'ownedCommunities', onDelete: 'SET NULL' });
Community.belongsTo(User, { foreignKey: 'ownerId', as: 'owner', onDelete: 'SET NULL' });
