import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Community } from './community.model.js';
import { CommunityRole } from './community_role.model.js';
import { User } from './user.model.js';

// Quién está en cada comunidad. rank es la jerarquía fija (dueño > administrador > miembro);
// roleId es el rol propio de la comunidad, si tiene uno.
export const CommunityMember = sequelize.define(
  'CommunityMember',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    communityId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    rank: { type: DataTypes.ENUM('owner', 'admin', 'member'), allowNull: false, defaultValue: 'member' },
    roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    // 'banned': fue expulsada y no puede volver a entrar hasta que le levanten la expulsión.
    status: { type: DataTypes.ENUM('active', 'banned'), allowNull: false, defaultValue: 'active' },
    // Avisos de mensajes nuevos: todos o silenciada.
    notifications: { type: DataTypes.ENUM('all', 'muted'), allowNull: false, defaultValue: 'all' },
    // Último mensaje que vio: los posteriores cuentan como no leídos.
    lastReadMessageId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'community_members' },
);

Community.hasMany(CommunityMember, { foreignKey: 'communityId', as: 'members', onDelete: 'CASCADE' });
CommunityMember.belongsTo(Community, { foreignKey: 'communityId', as: 'community', onDelete: 'CASCADE' });
User.hasMany(CommunityMember, { foreignKey: 'userId', as: 'memberships', onDelete: 'CASCADE' });
CommunityMember.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
CommunityRole.hasMany(CommunityMember, { foreignKey: 'roleId', as: 'members', onDelete: 'SET NULL' });
CommunityMember.belongsTo(CommunityRole, { foreignKey: 'roleId', as: 'role', onDelete: 'SET NULL' });
