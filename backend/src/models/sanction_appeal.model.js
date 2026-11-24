import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Apelaciones: la persona sancionada explica por qué cree que la advertencia o la sanción es un error.
// Una sola apelación por advertencia o sanción. Las resuelve la administración desde el panel.
export const SanctionAppeal = sequelize.define(
  'SanctionAppeal',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    targetType: { type: DataTypes.ENUM('warning', 'sanction'), allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    body: { type: DataTypes.STRING(1000), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected'), allowNull: false, defaultValue: 'pending' },
    response: { type: DataTypes.STRING(500), allowNull: true },
    resolvedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'sanction_appeals', updatedAt: false },
);

User.hasMany(SanctionAppeal, { foreignKey: 'userId', as: 'appeals', onDelete: 'CASCADE' });
SanctionAppeal.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
SanctionAppeal.belongsTo(User, { foreignKey: 'resolvedById', as: 'resolver', onDelete: 'SET NULL' });
