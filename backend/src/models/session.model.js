import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Sesiones de express-session guardadas en MySQL (ver config/session.js).
export const Session = sequelize.define(
  'Session',
  {
    sid: { type: DataTypes.STRING(128), primaryKey: true },
    data: { type: DataTypes.TEXT('medium'), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'sessions', timestamps: false },
);
