import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Amistades. Una sola fila por par de personas: userLowId es siempre el id menor y userHighId el mayor
// (el índice único sobre los dos impide que haya dos solicitudes cruzadas).
// requesterId = quien mandó la solicitud. pending = esperando respuesta; accepted = son amigos.
export const Friendship = sequelize.define(
  'Friendship',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userLowId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userHighId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    requesterId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'accepted'), allowNull: false, defaultValue: 'pending' },
    acceptedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'friendships', updatedAt: false },
);

Friendship.belongsTo(User, { foreignKey: 'userLowId', as: 'userLow', onDelete: 'CASCADE' });
Friendship.belongsTo(User, { foreignKey: 'userHighId', as: 'userHigh', onDelete: 'CASCADE' });
Friendship.belongsTo(User, { foreignKey: 'requesterId', as: 'requester', onDelete: 'CASCADE' });
