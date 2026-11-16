import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Misiones cobradas. period es el día ("2026-11-16"), la semana (su lunes) o "siempre" para las de una sola vez:
// el índice único impide cobrar dos veces la misma misión en el mismo período.
export const MissionClaim = sequelize.define(
  'MissionClaim',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    missionKey: { type: DataTypes.STRING(40), allowNull: false },
    period: { type: DataTypes.STRING(10), allowNull: false },
    amount: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  },
  { tableName: 'mission_claims', updatedAt: false },
);

User.hasMany(MissionClaim, { foreignKey: 'userId', as: 'missionClaims', onDelete: 'CASCADE' });
MissionClaim.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
