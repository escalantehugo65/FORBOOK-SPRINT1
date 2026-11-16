import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.model.js';
import { ShopItem } from './shop_item.model.js';

// Decoraciones compradas por cada persona. equipped = la tiene puesta (una por categoría).
export const UserItem = sequelize.define(
  'UserItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    itemId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    equipped: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'user_items', indexes: [{ unique: true, fields: ['user_id', 'item_id'], name: 'user_items_unique' }] },
);

// Si se borra una cuenta, se borran también sus compras.
User.hasMany(UserItem, { foreignKey: 'userId', as: 'items', onDelete: 'CASCADE' });
UserItem.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });
ShopItem.hasMany(UserItem, { foreignKey: 'itemId', as: 'owners' });
UserItem.belongsTo(ShopItem, { foreignKey: 'itemId', as: 'item' });
