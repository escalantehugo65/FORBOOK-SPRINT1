# Forbook — primera versión

Aplicación para estudiantes que llegan a Formosa. Incluye React + Vite, API Express, Sequelize y MySQL. El código implementa HU-01, HU-02, HU-03, HU-04, HU-06 reducida, HU-11 y HU-13. La autenticación usa sesiones de servidor y cookie HttpOnly; no usa JWT ni localStorage.

## Puesta en marcha en Windows

Necesitás Node.js compatible con Vite 7 (se verificó con Node 24), npm y MySQL 8. El proyecto no modifica instalaciones ni servicios del equipo automáticamente.

1. Abrí una terminal PowerShell en esta carpeta e instalá:

```powershell
npm run install:all
```

2. En MySQL Workbench o en el cliente MySQL, usando una cuenta con permisos de administración, creá una base y un usuario propio. Reemplazá la contraseña de este ejemplo:

```sql
CREATE DATABASE forbook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'forbook_app'@'127.0.0.1' IDENTIFIED BY 'REEMPLAZAR_CON_UNA_CLAVE_PROPIA';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON forbook.* TO 'forbook_app'@'127.0.0.1';
```

3. Copiá los archivos de configuración si todavía no existen:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Editá `backend/.env`: host, puerto, base, usuario y contraseña deben coincidir con tu MySQL. Generá el secreto de sesión con este comando y pegá el resultado en `SESSION_SECRET`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

No copies las credenciales de otra persona. Los `.env` locales existentes en esta entrega son para la instancia aislada usada durante la verificación; para tu MySQL configurá los valores propios. El ZIP no incluye secretos.

4. Aplicá la estructura y el catálogo:

```powershell
cd backend
npm run db:migrate
npm run db:seed
npm run dev
```

La base debe existir antes de migrar. `db:migrate` registra las migraciones aplicadas en `schema_migrations`. `db:seed` agrega registros faltantes; no reemplaza cambios editoriales ni crea cuentas de demostración. No se usa `sync({ force: true })`.

5. En otra terminal, desde la carpeta del proyecto:

```powershell
cd frontend
npm run dev
```

Abrí **http://localhost:5173**. Usá siempre `localhost` en el navegador, de acuerdo con `FRONTEND_URL`; no alternes con `127.0.0.1`, porque son orígenes diferentes para las cookies y CORS. La API está en **http://localhost:3001/api**; `/api/health` verifica la conexión de base de datos.

Detené cada servidor con `Ctrl+C`. Si cambiás `.env`, reiniciá el servidor correspondiente. Si MySQL está en otro puerto, modificá `DB_PORT`.

## V1.1 — circuito público

Ingreso y registro se abren en un modal sobre la bienvenida, sin cambiar la URL. El registro tiene dos pasos y las carreras se consultan por institución desde MySQL. Las cuentas V1 se conservan. Ver docs/CAMBIOS_V1_1.md para fuentes, pruebas y diferencias.

## Diseño nuevo

Toda la interfaz usa un sistema visual nuevo: azul, menta y amarillo, títulos en Bricolage Grotesque y texto en Nunito Sans, con modo claro y oscuro. Ingresar y Crear cuenta están arriba a la derecha y abren la ventana superpuesta. La bienvenida muestra lo que ya funciona del sprint y marca como "Próximamente" el mapa, las comunidades, las preguntas, la guía y los puntos. Las tipografías se instalan con `npm run install:all`; no hace falta migrar ni sembrar de nuevo la base. Ver `docs/DISENO.md`.

## Recorrido disponible

- Bienvenida, registro con institución persistida y login.
- Inicio contextualizado con datos reales y estado de llegada.
- Recuperación de sesión al recargar; rutas y API protegidas.
- Conozcamos Formosa: categorías persistidas, filtros y paginación.
- Fichas con tipo de fuente, referencia, revisión y relación institucional.
- Logout que destruye la sesión SQL y elimina la cookie.
- Estados de carga, vacío, no encontrado y error; CSS adaptable y campos etiquetados.

El catálogo inicial contiene **UNaF e Instituto Politécnico Formosa**, 38 carreras de referencia (34 UNaF y 4 IPF), cinco categorías y cuatro fichas basadas en portales oficiales. El catálogo académico no implica que todas las carreras tengan inscripción abierta. Movilidad y Cultura y costumbres están vacías intencionalmente. No hay horarios, rutas ni información cultural inventada. Las referencias y el alcance de la revisión están en `docs/FUENTES.md`.

## Verificación

```powershell
npm test
npm run build
```

`npm test` ejecuta validaciones; la integración se omite explícitamente si no configurás una base de pruebas. Para probar SQL creá una **base exclusiva** cuyo nombre termine en `_test`, otorgá permisos al usuario de pruebas y ejecutá en `backend/`:

```powershell
$env:TEST_DB_NAME = 'forbook_test'
$env:TEST_DB_HOST = '127.0.0.1'
$env:TEST_DB_PORT = '3306'
$env:TEST_DB_USER = 'forbook_app'
$env:TEST_DB_PASSWORD = 'TU_CLAVE_DE_PRUEBAS'
npm test
```

Las pruebas crean tablas si faltan y eliminan solamente sus registros identificados. No uses una base compartida o de producción. El informe de comprobaciones y las verificaciones manuales pendientes están en `docs/PRUEBAS.md`.

## Documentación

- `docs/ARQUITECTURA.md`: carpetas, datos, API y decisiones de seguridad.
- `docs/GUIA_APRENDIZAJE.md`: explicación de formularios, HTTP, sesiones y conexión completa.
- `docs/SPRINT_1.md`: alcance por historia, dependencias y Scrum.
- `docs/PRUEBAS.md`: pruebas reproducibles y límites de verificación.
- `docs/FUENTES.md`: referencias editoriales y categorías iniciales.
- `docs/DISENO.md`: colores, tipografías, componentes y pantallas del diseño nuevo.

## Git y continuidad

Versioná código, documentación, migraciones, seeds, `.env.example` y `package-lock.json`. No subas `.env`, `node_modules`, logs ni datos MySQL. `.gitignore` ya excluye esos archivos del proyecto. Ejemplos de commits: `feat(auth): registrar estudiantes con sesión SQL` o `fix(contents): impedir lectura de borradores`.

La estrategia de ramas se acuerda con el equipo; Scrum no impone `main`/`develop`. La entrega no crea repositorios remotos ni tarjetas en Jira. Antes de un despliegue público configurá HTTPS, origen real y proxy confiable si corresponde; serví el frontend con fallback a `index.html` para las rutas de React Router. Ver `docs/ARQUITECTURA.md`.
