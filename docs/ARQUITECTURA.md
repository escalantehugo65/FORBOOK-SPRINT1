# Arquitectura

## Separación de responsabilidades

`backend/` y `frontend/` tienen dependencias, scripts y entorno independientes. React renderiza datos; Express valida y autoriza; Sequelize ejecuta consultas parametrizadas contra MySQL. El navegador nunca recibe credenciales de la base de datos.

### Backend

| Archivo o carpeta | Responsabilidad |
|---|---|
| `src/app.js` | Construir Express y ordenar CORS, validación de origen, JSON, sesiones, rutas y errores. Se puede probar sin iniciar el servidor de producción. |
| `src/server.js` | Validar entorno, conectar MySQL, comprobar tabla de sesiones, limpiar vencidas, escuchar y cerrar ordenadamente. |
| `src/config/` | Configuración, conexión y adaptador SQL de express-session. |
| `src/models/` | Usuario, Institución, Categoría, Contenido y Sesión con relaciones. |
| `src/controllers/` | Registro, autenticación, sesión y consultas de catálogo y contenido. |
| `src/routes/` | Declarar método, URL, protección y controlador. |
| `src/middlewares/` | Validación, control de acceso, origen, límite de intentos y errores. |
| `src/helpers/` | Errores HTTP, selección explícita de datos públicos y llamadas de sesión. |
| `migrations/` | Evolución del esquema, con registro de migraciones aplicadas. |
| `seeders/` | Catálogo verificable, sin cuentas ni contraseñas de demostración. |
| `scripts/` | Ejecutar migraciones y seeds de forma explícita. |
| `test/` | Validaciones y recorrido de API sobre MySQL. |

### Frontend

| Carpeta | Responsabilidad |
|---|---|
| `components/` | Layout, marca, campos, tarjetas, carga y errores reutilizables. |
| `pages/` | Bienvenida, registro/login, inicio, exploración, detalle y 404. |
| `hooks/` | `useForm` propio y `useFetch` con cancelación al desmontar. |
| `router/` | Guardas públicas y privadas; cargando/error/sesión válida son estados distintos. |
| `services/` | Cliente HTTP central y operaciones de autenticación y catálogo. |
| `context/` | Usuario autenticado y comprobación de sesión; no contraseñas ni tokens. |

`main.jsx` monta React, BrowserRouter y AuthProvider. `App.jsx` declara la navegación. `index.css` contiene el sistema visual adaptable. No se crea `assets/` vacío: la ilustración es CSS original y no requiere imágenes descargadas.

## Modelo de datos

Todas las entidades de dominio tienen ID entero sin signo y `created_at`/`updated_at`. Las claves foráneas mantienen integridad referencial.

- **Institución:** nombre único y URL de fuente. Tiene muchos usuarios y contenidos.
- **Usuario:** nombre, correo único normalizado, hash, procedencia, institución obligatoria, carrera, estado `not_arrived`/`arrived`, rol por defecto `student`. No hay registro público de administradores.
- **Categoría:** nombre, slug único y descripción. Tiene muchos contenidos.
- **Contenido:** slug único, título, resumen, cuerpo, categoría obligatoria, institución opcional, fuente `official`/`community`/`experience`, referencia, autoría, revisión opcional, estado `draft`/`published`.
- **Sesión:** SID como clave primaria, datos de sesión y vencimiento indexado. Es una entidad técnica; no se envía como catálogo al navegador.

`hasMany` declara el lado que tiene muchos registros; `belongsTo` expresa la referencia desde el registro hijo. `include` permite traer la institución de un usuario o la categoría de una ficha. El hash está excluido por defecto y, además, la respuesta de autenticación se construye con una lista explícita de campos.

El rol usa un campo limitado porque todavía no hay administración de roles. Carrera y procedencia son texto: no necesitan catálogos propios para este alcance.

## Contrato HTTP

Éxito: `{ "data": ... }`. Listados paginados agregan `meta: { page, total, pages }`. Error: `{ "error": { "message": "...", "fields": { ... } } }`; `fields` es opcional.

| Método y URL | Entrada | Acceso | Resultado / errores principales |
|---|---|---|---|
| GET `/api/health` | — | Público | 200 con base conectada; 500 si falla. |
| GET `/api/institutions` | — | Público | 200 catálogo para registro. |
| POST `/api/auth/register` | nombre, correo, contraseña, origen, institución, carrera, llegada | Público + origen permitido | 201 cuenta y sesión; 400 inválidos; 409 correo existente. |
| POST `/api/auth/login` | correo y contraseña | Público + origen permitido | 200 usuario; 400 campos; 401 credenciales incorrectas. |
| GET `/api/auth/me` | cookie | Autenticado | 200 perfil; 401 sin sesión o usuario inexistente. |
| POST `/api/auth/logout` | objeto JSON vacío | Origen permitido | 200 sesión invalidada; 500 si no pudo destruirse. Es idempotente sin sesión. |
| GET `/api/categories` | — | Autenticado | 200 categorías. |
| GET `/api/contents` | query opcional: categoryId, institutionId, page | Autenticado | 200 publicados, hasta 12 por página; 400 filtro inválido. |
| GET `/api/contents/:id` | ID en ruta | Autenticado | 200 detalle; 400 ID inválido; 404 inexistente o borrador. |

Todas las rutas privadas devuelven 401 sin sesión. 403 indica origen de mutación no permitido. 413 limita peticiones grandes, 415 exige JSON y 429 limita intentos de acceso. 500 oculta detalles internos. Un resultado vacío es 200 con lista vacía, no un fallo de servidor.

## Sesiones y seguridad

- bcryptjs con costo 12. Se valida un mínimo de 10 caracteres y máximo de 72 bytes para evitar truncamiento silencioso de bcrypt. Nunca se almacena texto plano.
- Correo en minúsculas y restricción única SQL; la comprobación previa ayuda a informar, y la restricción resuelve registros concurrentes.
- `express-session` regenera el SID al registrar o autenticar para evitar fijación de sesión. Se guarda solo userId además de los datos técnicos de cookie.
- Cookie `forbook.sid`, HttpOnly, SameSite=Lax, Secure en producción. TTL por defecto 24 horas, sin renovación deslizante: `rolling: false`. No hay token en localStorage.
- `MysqlSessionStore` implementa `get`, `set`, `destroy` y `touch`. Una sesión SQL vencida se rechaza; se limpian vencidas al arrancar y cada hora. Un reinicio conserva sesiones si se mantiene la misma base y el mismo secreto. Cambiar el secreto invalida cookies existentes.
- Las mutaciones exigen `Origin` exactamente igual a `FRONTEND_URL` y `application/json`. Esto evita aceptar formularios o solicitudes de otros sitios con la cookie. Para Thunder Client agregá explícitamente ambos headers.
- CORS permite solo el origen configurado y credenciales. No utiliza `*` con cookies. CORS no reemplaza la autorización ni la validación del origen.
- Consultas protegidas por middleware; React también oculta pantallas privadas, pero la seguridad de los datos está en Express.
- Límite de 30 intentos de registro/login por IP cada 15 minutos, en memoria. Para varias instancias deberá reemplazarse por un contador compartido. El almacén de sesiones ya es SQL.
- Render de contenido como texto, sin `dangerouslySetInnerHTML`; enlaces solo HTTP(S) y `noopener noreferrer`.

El despliegue propuesto usa frontend y API en el mismo sitio, con HTTPS. Si se eligen dominios de sitios distintos, debe revisarse SameSite y protección CSRF; no alcanza con cambiar CORS. `TRUST_PROXY=true` solo si hay un proxy confiable delante del servidor. El frontend necesita fallback de rutas a `index.html`.

## Dependencias adicionales justificadas

- `mysql2`: controlador que Sequelize necesita para hablar con MySQL; necesario ahora. No reemplaza Sequelize.
- `react-dom`: monta componentes React en el DOM; necesario para la interfaz web.
- `@vitejs/plugin-react`: integración de React con Vite en desarrollo y compilación.
- `supertest`: dependencia de desarrollo para comprobar respuestas HTTP, cookies y autorización contra la aplicación real. Alternativa manual: Thunder Client; no ofrece el mismo recorrido automatizado.
- Override de `uuid` a la rama 11 compatible con CommonJS: remedia una alerta transitiva de Sequelize. Se verificó con la suite SQL. No se baja de versión Sequelize ni se ejecuta audit fix --force.

El almacén SQL se implementa sobre Sequelize y express-session, sin agregar otro paquete. `useForm` también es propio: no se agregó una biblioteca de formularios.

## Cambios de esquema

La migración inicial crea tablas e índices y se registra una sola vez. MySQL no garantiza rollback de todo DDL; ante fallo se revisa el error y se reejecuta. No se borra información. Para cambios posteriores agregá una migración nueva y su registro en el ejecutor; no edites una migración ya aplicada para intentar actualizar una base existente. Nunca uses sincronización destructiva para actualizar datos reales.
