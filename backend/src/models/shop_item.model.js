import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Decoraciones de la tienda (como las de Discord): marcos para el avatar, fondos y efectos del perfil
// y colores para el nombre. El catálogo se carga con npm run db:seed (seeders/shop.js).
// El slug también es la clase CSS que dibuja la decoración en el frontend (styles/shop.css).
export const ShopItem = sequelize.define(
  'ShopItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(250), allowNull: false },
    category: { type: DataTypes.ENUM('frame', 'banner', 'effect', 'name_color'), allowNull: false },
    rarity: { type: DataTypes.ENUM('common', 'rare', 'epic', 'legendary'), allowNull: false },
    price: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    collection: { type: DataTypes.STRING(80), allowNull: false },
    // Una decoración que deja de venderse sigue siendo de quien ya la compró.
    available: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    position: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  { tableName: 'shop_items' },
);
