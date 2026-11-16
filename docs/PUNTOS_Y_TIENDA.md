# Puntos, niveles y tienda

## Para qué sirven

Los **puntos** son la moneda de la tienda: se ganan ayudando y se gastan en decoraciones para el perfil. La **reputación** sube con lo mismo que da puntos, baja con las sanciones de moderación y **no baja al gastar**. De la reputación sale el nivel:

| Nivel | Desde |
|---|---|
| Nuevo | 0 |
| Aportante | 50 de reputación |
| Confiable | 300 de reputación |

## Cómo se ganan y se pierden

| Motivo | Puntos | Tope |
|---|---|---|
| Bienvenida (al crear la cuenta) | +100 | Una vez. La migración 013 se los da también a las cuentas que ya existían. |
| Hacer una pregunta | +2 | 2 por día |
| Responder una pregunta de otra persona | +5 | 3 por día. Responder tu propia pregunta no suma. |
| Que marquen tu respuesta como útil | +10 | 10 por día. Una sola vez por persona y respuesta. |
| Que quiten esa marca | −10 | Solo si antes se había sumado. |
| Moderación oculta algo tuyo | −15 | — |
| Advertencia de moderación | −30 | Si se revoca, se devuelve exactamente lo que se descontó. |

El día se cuenta con la hora de Argentina. El saldo y la reputación nunca quedan negativos. Cada movimiento queda en `point_transactions` y se ve en **Tienda → Mis puntos**.

## La tienda

21 decoraciones en 4 colecciones (Formosa natural, Noches de verano, Vida de estudiante y Prisma), de cuatro tipos:

- **Marcos:** rodean la foto o las iniciales en todo Forbook (perfil, encabezado, preguntas y respuestas).
- **Fondos:** reemplazan el fondo de la cabecera del perfil.
- **Efectos:** una animación suave sobre el perfil (burbujas, luciérnagas, pétalos o confeti). Con la opción “reducir movimiento” del sistema se muestran quietos.
- **Colores del nombre:** el nombre con un degradé, elegido para leerse bien en modo claro y oscuro.

Se puede tener puesta una decoración de cada tipo. Las compras no se devuelven: antes de gastar, la tienda muestra la vista previa sobre tu perfil y pide confirmar. Todo se dibuja con CSS (`frontend/src/styles/decorations.css`): no hay imágenes que descargar.

## Agregar una decoración

1. Sumala en `backend/seeders/shop.js` con un `slug` nuevo, nombre, descripción, tipo, rareza, precio y colección.
2. Dibujala en `frontend/src/styles/decorations.css` con la clase que corresponde: `frame-<slug>`, `banner-<slug>`, `effect-<slug>` o `name-<slug>`. Si es un efecto, agregá cuántas partículas usa en `frontend/src/components/ProfileEffect.jsx`.
3. Ejecutá `npm run db:seed --prefix backend`.

Para sacar una de la venta sin quitársela a quien la compró, poné `available = 0` en `shop_items`. El seed no vuelve a ponerla a la venta.

## Foto de perfil

Se elige de la galería o con la cámara del celular, se encuadra en un círculo y el navegador la manda como JPEG de 256 × 256. El servidor la revisa y le quita los datos del archivo (EXIF, ubicación, comentarios) antes de guardarla. Solo la ven personas con sesión iniciada. Moderación puede quitarla desde el perfil de la persona, con nota interna; queda en el historial.
