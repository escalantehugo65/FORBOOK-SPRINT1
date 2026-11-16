import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Movimientos de puntos: cada suma o resta queda anotada, con el saldo que quedó después.
// amount puede ser menor que la regla si el saldo no alcanzaba: el saldo nunca queda negativo.
// actorId es quien la provocó (por ejemplo, quien marcó la respuesta como útil o el moderador).
export const PointTransaction = sequelize.define(
  'PointTransaction',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    balance: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    // Cuánto cambió la reputación con este movimiento (el bono y las compras no la cambian).
    reputationChange: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reason: { type: DataTypes.ENUM('welcome', 'question', 'answer', 'helpful', 'helpful_removed', 'purchase', 'hidden', 'warning', 'warning_revoked'), allowNull: false },
    targetType: { type: DataTypes.STRING(30), allowNull: true },
    targetId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    actorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'point_transactions', updatedAt: false },
);

User.hasMany(PointTransaction, { foreignKey: 'userId', as: 'pointTransactions', onDelete: 'CASCADE' });
PointTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
