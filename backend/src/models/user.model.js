import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Institution } from './institution.model.js';

export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    origin: { type: DataTypes.STRING(150), allowNull: false },
    originLocalityId: { type: DataTypes.STRING(8), allowNull: true },
    originCountryCode: { type: DataTypes.STRING(2), allowNull: true },
    institutionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    career: { type: DataTypes.STRING(180), allowNull: false },
    arrivalStatus: { type: DataTypes.ENUM('not_arrived', 'arrived'), allowNull: false },
    // Los roles especiales se asignan con npm run user:role, nunca desde el registro (épica 7).
    role: { type: DataTypes.ENUM('student', 'moderator', 'admin'), allowNull: false, defaultValue: 'student' },
    // Perfil: lo edita cada persona desde /perfil.
    bio: { type: DataTypes.STRING(280), allowNull: true },
    avatarColor: { type: DataTypes.ENUM('azul', 'menta', 'amarillo', 'coral', 'violeta', 'rio'), allowNull: false, defaultValue: 'azul' },
    bannerStyle: { type: DataTypes.ENUM('rio', 'monte', 'atardecer', 'pomelo', 'noche', 'liso'), allowNull: false, defaultValue: 'rio' },
    // Intereses como claves separadas por coma (lista cerrada, ver profile.validation.js).
    interests: { type: DataTypes.STRING(200), allowNull: true },
    cohortYear: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    showOrigin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    showArrival: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Fecha en que moderación ocultó la descripción. null = visible.
    bioHiddenAt: { type: DataTypes.DATE, allowNull: true },
    // Economía: points es el saldo para la tienda; reputation suma solo lo ganado participando
    // (menos las sanciones) y define el nivel: Nuevo, Aportante o Confiable (helpers/point.helper.js).
    points: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    reputation: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    // Cuándo subió su foto de perfil. null = sin foto (se muestran las iniciales).
    avatarUpdatedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'users',
    // El hash nunca sale en las consultas comunes: para el login se usa User.scope('withPassword').
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
  },
);

Institution.hasMany(User, { foreignKey: 'institutionId', as: 'students' });
User.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
