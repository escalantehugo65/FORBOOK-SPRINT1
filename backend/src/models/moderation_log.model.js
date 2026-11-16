import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Historial interno de moderación (FF-38): una fila por cada decisión o cambio de catálogo.
export const ModerationLog = sequelize.define(
  'ModerationLog',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    moderatorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    action: { type: DataTypes.ENUM('dismiss', 'hide', 'close', 'category_create', 'category_update', 'category_delete', 'source_update', 'place_create', 'place_update', 'warn', 'warning_revoke', 'bio_hide', 'bio_show'), allowNull: false },
    targetType: { type: DataTypes.ENUM('question', 'answer', 'content', 'category', 'place', 'profile'), allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reportId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    note: { type: DataTypes.STRING(500), allowNull: false },
  },
  { tableName: 'moderation_logs', updatedAt: false },
);

ModerationLog.belongsTo(User, { foreignKey: 'moderatorId', as: 'moderator' });
