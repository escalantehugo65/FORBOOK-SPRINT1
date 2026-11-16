# Comunidades, chat y misiones

Migración 015. Cada modelo en su archivo, como en el resto del proyecto.

## Modelos

| Modelo (tabla) | Qué guarda |
|---|---|
| Community (`communities`) | Nombre, descripción, reglas, tema, color, `kind` (`default` o `user`), dueño, cantidad de miembros y `closedAt` (cerrada: no se borra, deja de verse). |
| CommunityRole (`community_roles`) | Roles propios: nombre, color y `canModerate` (puede borrar mensajes ajenos). Hasta 10 por comunidad. |
| CommunityMember (`community_members`) | Quién está: `rank` (`owner`, `admin`, `member`), rol propio, `status` (`active` o `banned`), avisos (`all` o `muted`) y último mensaje leído. |
| CommunityMessage (`community_messages`) | Mensajes: `kind` (`text`, `image`, `audio`), texto y borrado (`deletedAt`, `deletedBy`). |
| CommunityAttachment (`community_attachments`) | La imagen o el audio, en una tabla aparte para que listar el chat no cargue archivos. |
| UserBlock (`user_blocks`) | Ocultar (`hidden`) o bloquear (`blocked`) a otra persona. |
| MissionClaim (`mission_claims`) | Misiones cobradas, con índice único por persona, misión y período. |

## Jerarquía

`helpers/community.helper.js` → `abilitiesOf(member, appRole)`:

| Quién | Puede |
|---|---|
| Administración de Forbook (rol `admin` de la aplicación) | Todo, en cualquier comunidad y sin ser miembro: editar, cerrar, roles, expulsar, borrar mensajes. |
| Moderación de Forbook (`moderator`) | Borrar mensajes en cualquier comunidad. |
| Quien creó la comunidad (`owner`) | Editar los datos, cerrarla, nombrar y quitar administradores, dar el permiso de moderar a un rol, y todo lo de abajo. |
| Administradores de la comunidad (`admin`) | Crear, editar y borrar roles sin permiso de moderar, asignar roles, expulsar miembros y borrar mensajes. |
| Rol con `canModerate` | Borrar mensajes ajenos. |
| Miembro | Chatear, borrar sus mensajes, silenciar, salir. |

Solo se puede actuar sobre alguien de menor jerarquía. Quien creó la comunidad no puede salir: la cierra. Las predeterminadas no tienen dueño y solo las cierra la administración. Cada estudiante puede tener 2 comunidades propias abiertas (la administración no tiene tope).

## Chat

- Un solo chat por comunidad. El frontend pide los últimos 40 mensajes y después pregunta por nuevos cada 4 segundos con `?after=` (solo con la pestaña a la vista). No usa WebSockets: no suma dependencias y alcanza para un chat de grupo.
- Imágenes: el navegador las pasa a JPG y las achica; el servidor revisa que sea un JPEG real, de hasta 700 KB, y le quita los metadatos (EXIF, GPS).
- Audios: grabados con `MediaRecorder` (WebM, Ogg o MP4), hasta 60 segundos y 600 KB. El servidor comprueba la firma del archivo.
- Los archivos se sirven solo a miembros, con el tipo guardado y `X-Content-Type-Options: nosniff`. Al borrar un mensaje, el archivo se borra de la base.
- El JSON general sigue limitado a 16 KB; solo `POST /api/communities/:id/messages` acepta hasta 1100 KB, después de comprobar la sesión.
- Freno al spam: 15 mensajes cada 30 segundos y 10 imágenes o audios cada 10 minutos por persona.
- El texto se guarda y se muestra como texto: nunca se interpreta como HTML.

## Avisos, ocultar y bloquear

- Sin leer: mensajes posteriores al último leído, sin contar los propios, los borrados ni los de personas ocultas o bloqueadas. Abrir el chat los marca como leídos.
- `GET /api/communities/unread` da el total del menú; las comunidades silenciadas no suman.
- Ocultar: dejo de ver sus mensajes; la otra persona no se entera. Bloquear: ninguna ve los mensajes de la otra y ella no puede ver mi perfil (moderación sí).

## Misiones

Definidas en `helpers/mission.helper.js`. El avance se cuenta desde lo que ya está en la base (mensajes, respuestas, marcas de útil), así que no hay contadores que se puedan desfasar. Se cobran con un botón; la fila del usuario se bloquea para que dos clics no cobren dos veces. Dan puntos, no reputación.

| Misión | Período | Meta | Puntos |
|---|---|---|---|
| Unite a una comunidad | Una vez | 1 | 10 |
| Creá tu propia comunidad | Una vez | 1 | 15 |
| Mandá 5 mensajes | Día | 5 | 5 |
| Compartí una imagen | Día | 1 | 3 |
| Mandá un audio | Día | 1 | 3 |
| Respondé una pregunta (de otra persona) | Día | 1 | 5 |
| Apoyá 2 respuestas | Día | 2 | 3 |
| Mandá 30 mensajes en la semana | Semana | 30 | 15 |
| Participá en 3 comunidades | Semana | 3 | 10 |
| Respondé 5 preguntas en la semana | Semana | 5 | 20 |

El día y la semana (de lunes a domingo) usan la hora de la Argentina. Los mensajes borrados no cuentan.

## Endpoints

Todos piden sesión.

| Método y URL | Qué hace |
|---|---|
| GET `/api/communities?scope=mine&search=&topic=` | Lista con `joined`, `rank`, `muted` y `unread`. `meta` trae límites y si puede crear. |
| GET `/api/communities/unread` | Total de mensajes sin leer para el menú. |
| POST `/api/communities` | Crea una (máximo 2 propias). |
| GET / PUT / DELETE `/api/communities/:id` | Detalle (con `membership` y `abilities`), editar y cerrar. |
| POST `/api/communities/:id/join` · DELETE / PUT `/api/communities/:id/membership` | Unirse, salir y silenciar o activar avisos. |
| GET `/api/communities/:id/members?search=&status=&page=` | Miembros (o expulsados, para quien administra). |
| PUT / DELETE `/api/communities/:id/members/:userId` · POST `…/unban` | Cambiar jerarquía o rol, expulsar y volver a permitir. |
| POST `/api/communities/:id/roles` · PUT / DELETE `…/roles/:roleId` | Roles propios. |
| GET `/api/communities/:id/messages?before=&after=` | Mensajes (40 por página). |
| POST `/api/communities/:id/messages` | `{ body }`, `{ image, body? }` o `{ audio, seconds }`. |
| DELETE `/api/communities/:id/messages/:messageId` · GET `…/attachment` | Borrar un mensaje y bajar su archivo. |
| GET `/api/blocks` · PUT / DELETE `/api/users/:id/block` | Personas ocultas o bloqueadas. |
| GET `/api/missions` · POST `/api/missions/:key/claim` | Misiones y cobro. |

## Pendiente

- Reportar un mensaje del chat a la moderación de Forbook (hoy se puede reportar el perfil de quien lo escribió).
- Avisos fuera de la página (notificaciones del navegador o del celular).
- Pasar la propiedad de una comunidad a otra persona.
