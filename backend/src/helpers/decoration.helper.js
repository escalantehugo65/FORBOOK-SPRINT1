import { ShopItem } from '../models/shop_item.model.js';
import { UserItem } from '../models/user_item.model.js';

// Categoría de la tienda → nombre del campo que recibe el frontend.
export const decorationKeys = { frame: 'frame', banner: 'banner', effect: 'effect', name_color: 'nameColor' };

const empty = () => ({ frame: null, banner: null, effect: null, nameColor: null });

// Decoraciones puestas de varias personas con una sola consulta: Map { userId → { frame, banner, effect, nameColor } }.
// Cada valor es el slug de la decoración (la clase CSS que la dibuja) o null.
export const decorationsFor = async (userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  const decorations = new Map(ids.map(id => [id, empty()]));
  if (!ids.length) return decorations;
  const rows = await UserItem.findAll({
    where: { userId: ids, equipped: true },
    attributes: ['userId'],
    include: [{ model: ShopItem, as: 'item', attributes: ['slug', 'category'] }],
  });
  for (const row of rows) decorations.get(row.userId)[decorationKeys[row.item.category]] = row.item.slug;
  return decorations;
};

export const decorationsOf = async (userId) => (await decorationsFor([userId])).get(userId) || empty();
