import { ShopItem } from '../src/models/shop_item.model.js';

// Catálogo de la tienda. Cada slug es una clase CSS del frontend (frontend/src/styles/decorations.css):
// si agregás una decoración acá, también hay que dibujarla allá (y, si es un efecto, sumarla en ProfileEffect.jsx).
// Precios: común 100–150, rara 250–400, épica 500–700 y legendaria 900 o más.
// Las colecciones (collection) se describen en src/helpers/shop.helper.js.
export const shopItems = [
  // Marcos para el avatar
  { slug: 'marco-terere', name: 'Tereré', category: 'frame', rarity: 'common', price: 100, collection: 'Vida de estudiante', description: 'Un aro verde yerba, fresco como un tereré en enero.' },
  { slug: 'marco-sol', name: 'Sol del norte', category: 'frame', rarity: 'common', price: 120, collection: 'Formosa natural', description: 'Rayos dorados alrededor de tu foto.' },
  { slug: 'marco-lapacho', name: 'Lapacho en flor', category: 'frame', rarity: 'rare', price: 250, collection: 'Formosa natural', description: 'Flores rosadas de lapacho que rodean tu avatar.' },
  { slug: 'marco-estrellas', name: 'Noche estrellada', category: 'frame', rarity: 'rare', price: 300, collection: 'Noches de verano', description: 'Un aro azul noche con estrellas que titilan.' },
  { slug: 'marco-rio', name: 'Río Paraguay', category: 'frame', rarity: 'epic', price: 500, collection: 'Formosa natural', description: 'Una corriente de agua que gira alrededor de tu foto.' },
  { slug: 'marco-neon', name: 'Neón costanero', category: 'frame', rarity: 'epic', price: 600, collection: 'Noches de verano', description: 'Un brillo neón que late como las luces de la costanera.' },
  { slug: 'marco-prisma', name: 'Prisma', category: 'frame', rarity: 'legendary', price: 1200, collection: 'Prisma', description: 'Un aro de todos los colores que gira sin parar.' },
  // Fondos del perfil
  { slug: 'fondo-cuaderno', name: 'Hoja de carpeta', category: 'banner', rarity: 'common', price: 150, collection: 'Vida de estudiante', description: 'Renglones y margen, como la carpeta del primer día de clases.' },
  { slug: 'fondo-tormenta', name: 'Tormenta de verano', category: 'banner', rarity: 'rare', price: 280, collection: 'Noches de verano', description: 'Nubes cargadas y un relámpago a lo lejos.' },
  { slug: 'fondo-banado', name: 'Bañado La Estrella', category: 'banner', rarity: 'rare', price: 300, collection: 'Formosa natural', description: 'Los verdes y celestes de los humedales formoseños.' },
  { slug: 'fondo-lapachos', name: 'Lluvia de lapachos', category: 'banner', rarity: 'epic', price: 550, collection: 'Formosa natural', description: 'Un fondo rosado lleno de flores de lapacho.' },
  { slug: 'fondo-aurora', name: 'Aurora', category: 'banner', rarity: 'epic', price: 650, collection: 'Noches de verano', description: 'Colores que se mueven despacio, como una aurora.' },
  { slug: 'fondo-galaxia', name: 'Galaxia', category: 'banner', rarity: 'legendary', price: 1100, collection: 'Prisma', description: 'Un cielo profundo lleno de estrellas.' },
  // Efectos animados sobre el perfil
  { slug: 'efecto-burbujas', name: 'Burbujas de río', category: 'effect', rarity: 'rare', price: 350, collection: 'Formosa natural', description: 'Burbujas que suben despacio sobre tu perfil.' },
  { slug: 'efecto-luciernagas', name: 'Luciérnagas', category: 'effect', rarity: 'rare', price: 400, collection: 'Noches de verano', description: 'Puntitos de luz que flotan sobre tu perfil.' },
  { slug: 'efecto-petalos', name: 'Pétalos de lapacho', category: 'effect', rarity: 'epic', price: 700, collection: 'Formosa natural', description: 'Pétalos rosados que caen sobre tu perfil.' },
  { slug: 'efecto-confeti', name: 'Confeti de egreso', category: 'effect', rarity: 'legendary', price: 1500, collection: 'Prisma', description: 'Una lluvia de confeti para festejar cada logro.' },
  // Colores para el nombre
  { slug: 'nombre-rio', name: 'Río', category: 'name_color', rarity: 'common', price: 150, collection: 'Formosa natural', description: 'Tu nombre en los azules del río.' },
  { slug: 'nombre-oro', name: 'Dorado', category: 'name_color', rarity: 'rare', price: 250, collection: 'Vida de estudiante', description: 'Tu nombre en dorado, como una medalla.' },
  { slug: 'nombre-atardecer', name: 'Atardecer', category: 'name_color', rarity: 'rare', price: 300, collection: 'Noches de verano', description: 'Del naranja al rosa, como el cielo sobre el río.' },
  { slug: 'nombre-prisma', name: 'Prisma', category: 'name_color', rarity: 'legendary', price: 900, collection: 'Prisma', description: 'Tu nombre en todos los colores, en movimiento.' },
];

// Crea las decoraciones nuevas y actualiza nombre, precio y descripción de las que ya están.
// No toca "available": si alguien sacó una de la venta, sigue fuera de la venta.
export async function seedShopItems(transaction) {
  for (const [position, item] of shopItems.entries()) {
    const [row, created] = await ShopItem.findOrCreate({ where: { slug: item.slug }, defaults: { ...item, position }, transaction });
    if (!created) await row.update({ ...item, position }, { transaction });
  }
}
