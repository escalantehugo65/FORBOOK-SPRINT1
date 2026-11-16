import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Localidades censales de Argentina (Georef). El id es el código oficial de 8 dígitos.
export const Locality = sequelize.define(
  'Locality',
  {
    id: { type: DataTypes.STRING(8), primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    provinceCode: { type: DataTypes.STRING(2), allowNull: false },
    provinceName: { type: DataTypes.STRING(100), allowNull: true },
    departmentCode: { type: DataTypes.STRING(5), allowNull: false },
    departmentName: { type: DataTypes.STRING(80), allowNull: false },
    sourceUrl: { type: DataTypes.STRING(1000), allowNull: false },
    reviewedAt: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { tableName: 'localities' },
);
