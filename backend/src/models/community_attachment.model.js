import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { CommunityMessage } from './community_message.model.js';

// Imagen o audio de un mensaje. Va en una tabla aparte para que listar el chat no cargue los archivos.
export const CommunityAttachment = sequelize.define(
  'CommunityAttachment',
  {
    messageId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    mimeType: { type: DataTypes.STRING(40), allowNull: false },
    data: { type: DataTypes.BLOB('medium'), allowNull: false },
    // Imagen: ancho y alto en píxeles. Audio: duración en segundos.
    width: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    height: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
    seconds: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
  },
  { tableName: 'community_attachments', updatedAt: false },
);

CommunityMessage.hasOne(CommunityAttachment, { foreignKey: 'messageId', as: 'attachment', onDelete: 'CASCADE' });
CommunityAttachment.belongsTo(CommunityMessage, { foreignKey: 'messageId', as: 'message', onDelete: 'CASCADE' });
