import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Ocultar o bloquear a otra persona, desde su perfil.
// 'hidden': dejo de ver sus mensajes (ella no se entera y sigue viendo los míos).
// 'blocked': ninguna de las dos ve los mensajes de la otra y ella no puede ver mi perfil.
export const UserBlock = sequelize.define(
  'UserBlock',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    kind: { type: DataTypes.ENUM('hidden', 'blocked'), allowNull: false },
  },
  { tableName: 'user_blocks', updatedAt: false },
);

User.hasMany(UserBlock, { foreignKey: 'userId', as: 'blocks', onDelete: 'CASCADE' });
UserBlock.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
UserBlock.belongsTo(User, { foreignKey: 'targetId', as: 'target', onDelete: 'CASCADE' });
