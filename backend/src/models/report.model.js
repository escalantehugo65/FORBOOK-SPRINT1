import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Reportes de contenido (FF-34 y FF-35). targetType + targetId señalan qué se reportó.
export const Report = sequelize.define(
  'Report',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    reporterId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    targetType: { type: DataTypes.ENUM('question', 'answer', 'content', 'profile'), allowNull: false },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.ENUM('false', 'offensive', 'spam', 'outdated', 'personal_data', 'other'), allowNull: false },
    details: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'dismissed', 'actioned'), allowNull: false, defaultValue: 'pending' },
    action: { type: DataTypes.ENUM('none', 'hide', 'close'), allowNull: true },
    resolutionNote: { type: DataTypes.STRING(500), allowNull: true },
    resolvedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'reports' },
);

User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'resolvedById', as: 'resolver' });
