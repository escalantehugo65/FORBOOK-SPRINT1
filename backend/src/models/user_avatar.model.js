import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';

// Foto de perfil. Va en una tabla aparte para que las consultas de usuarios no carguen la imagen.
// Siempre es un JPEG cuadrado y sin metadatos (ver helpers/image.helper.js).
export const UserAvatar = sequelize.define(
  'UserAvatar',
  {
    userId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    mimeType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'image/jpeg' },
    data: { type: DataTypes.BLOB('medium'), allowNull: false },
  },
  { tableName: 'user_avatars' },
);

User.hasOne(UserAvatar, { foreignKey: 'userId', as: 'avatar', onDelete: 'CASCADE' });
UserAvatar.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
