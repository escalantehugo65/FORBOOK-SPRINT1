import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Instituciones del registro (UNaF e IPF) y las que quedaron de cuentas anteriores.
export const Institution = sequelize.define(
  'Institution',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
  },
  { tableName: 'institutions' },
);
