import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Advertencias de moderación: se ven en el perfil mientras no se revoquen.
export const UserWarning = sequelize.define(
  'UserWarning',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    moderatorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reason: { type: DataTypes.ENUM('false', 'offensive', 'spam', 'personal_data', 'other'), allowNull: false },
    note: { type: DataTypes.STRING(450), allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    revokedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'user_warnings', updatedAt: false },
);

User.hasMany(UserWarning, { foreignKey: 'userId', as: 'warnings' });
UserWarning.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserWarning.belongsTo(User, { foreignKey: 'moderatorId', as: 'moderator' });
