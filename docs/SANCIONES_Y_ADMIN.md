# Sanciones, amigos, fichas de estudiantes y panel de administración

Migración: `016-sanctions-friends-admin`. Crea `user_sanctions`, `sanction_appeals` y `friendships`, y agrega `contents.author_id`. No borra datos. En la misma entrega, `017-avatar-milliseconds` pasa `users.avatar_updated_at` a milisegundos (la versión de la foto de perfil).

## Sanciones

Tipos (`user_sanctions.type`):

| Tipo | Qué puede hacer la cuenta | Duración |
|---|---|---|
| `restriction` | Leer todo y entrar a su cuenta, pero no publicar preguntas, respuestas, fichas, comunidades ni mensajes del chat (403 `account_restricted`). | Días |
| `suspension` | Nada salvo ver sus sanciones, apelar y cerrar sesión (403 `account_suspended`). | Días |
| `ban` | Igual que la suspensión, sin fecha de fin. | — |

Escalado automático (`helpers/sanction.helper.js`, `sanctionRules`): cuenta las advertencias **vigentes** (no revocadas).

- 2 advertencias → restricción de 3 días.
- 3 → suspensión de 7 días.
- 5 → baja de la cuenta.

Solo se crea una sanción automática si no hay otra igual o más grave vigente. Si se revoca una advertencia (desde moderación o al aceptar una apelación), se revocan las sanciones automáticas que ya no correspondan con las advertencias que quedan. Las sanciones manuales no se tocan.

La administración también sanciona a mano desde `/admin/usuarios/:id`: tipo, motivo (incluye «Acoso a otras personas»), días (1 a 365, salvo la baja) y una explicación que lee la persona. Nadie se sanciona a sí mismo y una cuenta admin no se puede sancionar ni advertir (primero hay que cambiarle el rol).

### Qué ve cada persona

- La persona sancionada: aviso arriba de todo (restricción) o una pantalla que reemplaza a Forbook (suspensión o baja) con el motivo, hasta cuándo dura y la explicación. En `/sanciones` ve todas sus advertencias y sanciones, las reglas y el estado de sus apelaciones.
- Los demás, en su perfil: la sanción vigente (tipo, motivo y fecha de fin, sin la explicación), las advertencias vigentes (motivo y fecha) y cuántas sanciones ya terminaron. Moderación y administración ven también las explicaciones.

### Apelaciones

Cada advertencia o sanción se apela una sola vez (`sanction_appeals`, índice único por `target_type` + `target_id`), mientras siga vigente. La revisa la administración en `/admin/apelaciones` y responde por escrito. Aceptar revoca lo apelado (y devuelve los puntos de una advertencia); rechazar lo deja como está. La respuesta aparece en `/sanciones`.

## Amigos

Una fila por par (`friendships.user_low_id` < `user_high_id`, índice único), con quién la pidió y el estado (`pending` o `accepted`).

- `POST /users/:id/friendship`: manda la solicitud. Si la otra persona ya había mandado una, quedan como amigos.
- `POST /users/:id/friendship/accept` y `DELETE /users/:id/friendship` (quitar, cancelar o rechazar, según el caso).
- `GET /friends`, `GET /friends/requests`, `GET /users/:id/friends`, `GET /users/suggested`.
- `GET /notifications/summary`: mensajes sin leer y solicitudes recibidas, para el encabezado.
- Bloquear a alguien borra la amistad y no deja mandar solicitudes. Hasta 50 solicitudes enviadas sin responder.

## Fichas de estudiantes

`POST /contents` (hasta 3 por día): se publica al momento con `author_id` de quien la crea y su nombre como autoría. La fecha de revisión es la del día. El autor la edita (`PUT /contents/:id`) o la borra (`DELETE /contents/:id`); la administración también puede borrarla u ocultarla. Si moderación la oculta por un reporte, a su autor se le restan 15 puntos, como con las preguntas y respuestas.

## Reportes de mensajes del chat

`targetType: 'message'`. Lo puede reportar un miembro activo de la comunidad o moderación. Si moderación decide «Borrar el mensaje», se borra (con su imagen o audio) y se le restan 15 puntos a quien lo mandó. Moderación y administración pueden leer el chat de cualquier comunidad sin unirse.

## Panel de administración

Rutas `/admin/*` del backend con `authMiddleware` + `adminMiddleware`; en el frontend, `RoleRoutes roles={['admin']}`. Cada cambio queda en el historial de moderación.

| Pantalla | Qué hace |
|---|---|
| `/admin` | Resumen: reportes y apelaciones pendientes, cuentas por estado y rol, actividad. |
| `/admin/usuarios` | Buscar por nombre o correo; filtrar por rol y estado. |
| `/admin/usuarios/:id` | Historial de sanciones y advertencias (revocar), movimientos de puntos, cambiar el rol (queda al menos un admin), sancionar y ajustar puntos (no cambia la reputación). |
| `/admin/apelaciones` | Aceptar o rechazar con respuesta. |
| `/admin/comunidades` | Cerrar o reabrir cualquier comunidad, con motivo. |
| `/moderacion/fichas` | Además de crear y editar: ver quién creó cada ficha, ocultarla o volver a mostrarla. |
| `/admin/usuarios/:id` (borrar) | Borra la cuenta con un motivo (no la propia ni la de otro admin). Queda «Cuenta borrada» en el historial. |
| `/admin/tienda` | Precio de cada decoración y si se sigue vendiendo. Quien ya la tiene la conserva. |

## Baja de cuentas

- La persona la da de baja desde `/perfil` (pide contraseña y confirmación); necesita una sesión válida, así que una cuenta suspendida o dada de baja por sanción no puede borrarse para esquivarla.
- Borrar es anonimizar (migración 018, `users.deleted_at`): nombre «Cuenta eliminada», correo `eliminada-ID-…@forbook.invalid`, contraseña al azar, sin bio, intereses ni foto. Se borran amistades, bloqueos y sesiones, y sale de las comunidades que no administra. Preguntas, respuestas y fichas quedan.
- Una cuenta borrada no aparece en búsquedas, sugerencias ni en el panel, y su perfil da 404.

## Cuentas admin del equipo

Se asignan por correo con `ADMIN_EMAILS` en `backend/.env` y `npm run db:seed` (o con `npm run user:role -- correo admin`). No se asignan por nombre: cualquiera puede registrarse con el nombre de otra persona.

## Pruebas

- Backend: `test/account.test.js` (cambio de correo, baja propia y baja desde el panel).
- Backend: `test/sanctions-friends-admin.test.js` (escalado, restricción y suspensión, apelaciones, panel, amigos, fichas de estudiantes, reportes de mensajes, misiones nuevas y la guía).
- Frontend: `src/utils/social.test.js`.
