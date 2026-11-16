import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Community } from './community.model.js';
import { User } from './user.model.js';

// Mensajes del chat general de una comunidad. Una imagen o un audio van en community_attachments.
// Un mensaje borrado conserva la fila (para no romper el orden) pero ya no muestra su contenido.
export const CommunityMessage = sequelize.define(
  'CommunityMessage',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    communityId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    kind: { type: DataTypes.ENUM('text', 'image', 'audio'), allowNull: false, defaultValue: 'text' },
    body: { type: DataTypes.STRING(1000), allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    deletedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'community_messages', updatedAt: false },
);

Community.hasMany(CommunityMessage, { foreignKey: 'communityId', as: 'messages', onDelete: 'CASCADE' });
CommunityMessage.belongsTo(Community, { foreignKey: 'communityId', as: 'community', onDelete: 'CASCADE' });
User.hasMany(CommunityMessage, { foreignKey: 'userId', as: 'communityMessages', onDelete: 'SET NULL' });
CommunityMessage.belongsTo(User, { foreignKey: 'userId', as: 'author', onDelete: 'SET NULL' });
