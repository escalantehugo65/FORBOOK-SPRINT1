import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Sanciones de una cuenta, además de las advertencias (user_warnings):
// - restriction: puede entrar y leer, pero no publicar (preguntas, respuestas, fichas, mensajes ni comunidades).
// - suspension: no puede usar Forbook hasta endsAt; solo ve el motivo y puede apelar.
// - ban: igual que la suspensión, pero sin fecha de fin.
// automatic = la puso el sistema al juntar advertencias (helpers/sanction.helper.js).
export const UserSanction = sequelize.define(
  'UserSanction',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    moderatorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    type: { type: DataTypes.ENUM('restriction', 'suspension', 'ban'), allowNull: false },
    reason: { type: DataTypes.ENUM('false', 'offensive', 'spam', 'personal_data', 'harassment', 'repeated', 'other'), allowNull: false },
    note: { type: DataTypes.STRING(450), allowNull: false },
    automatic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // null solo en un baneo (no termina).
    endsAt: { type: DataTypes.DATE, allowNull: true },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    revokedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'user_sanctions', updatedAt: false },
);

User.hasMany(UserSanction, { foreignKey: 'userId', as: 'sanctions', onDelete: 'CASCADE' });
UserSanction.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
UserSanction.belongsTo(User, { foreignKey: 'moderatorId', as: 'moderator', onDelete: 'SET NULL' });
