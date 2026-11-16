# Forbook — versión unificada para revisión

Esta entrega local reúne el diseño nuevo y el registro nacional/internacional de la V1.1 con las ramas Rama-Gonzalo2 y rama-laurato del repositorio FORBOOK-SPRINT1, consultadas el 10 de noviembre de 2026.

**Actualización del mapa y registro: [docs/MAPA_Y_REGISTRO.md](docs/MAPA_Y_REGISTRO.md).**

**Empezá por [INICIAR.md](INICIAR.md)** para probar con XAMPP. Se usa una base separada llamada `forbook_final_prueba`. No se modificó GitHub ni se creó la rama develop.

## Incluye

- Diseño azul, menta y amarillo; tipografías Bricolage Grotesque y Nunito Sans; modo claro/oscuro.
- Login/registro en modal; sesiones SQL con cookie HttpOnly, logout y permisos por rol.
- Registro desde las 24 jurisdicciones: 4.027 localidades censales de Georef. Opción “No soy de Argentina”, con 248 países/territorios exteriores del catálogo ISO de 249 entradas.
- Solo IPF y UNaF en el registro. 38 entradas de carreras en una instalación nueva; los catálogos académicos son parciales y no equivalen a inscripción abierta. Una institución sin catálogo permite registro con carrera pendiente, sin texto libre.
- Inicio personalizado, Conozcamos Formosa y accesos institucionales separados para IPF y UNaF.
- Preguntas públicas, respuestas, votos útiles y filtros.
- Reportes, cola y decisiones de moderación, historial, administración de categorías y fuentes.
- Mapa con filtros, referencias, fuentes y fechas; carga/edición de lugares por administración; selector de ubicación.
- Rutas orientativas y espacios públicos sugeridos por procedencia, institución y etapa de llegada; administración de rutas y de fichas completas.
- Puntos, reputación y niveles (Nuevo, Aportante, Confiable); tienda de decoraciones al estilo Discord: marcos, fondos, efectos y colores del nombre.
- Foto de perfil elegida de la galería o la cámara, recortada en el navegador y guardada sin datos EXIF.
- Búsqueda de personas, fichas y preguntas, sin importar tildes ni mayúsculas.

## Ejecutar

Node 24.15 o posterior de la rama 24 LTS, npm y MySQL/MariaDB. Con MySQL iniciado y después de crear la base indicada en INICIAR.md:

```powershell
npm run install:all
npm run configurar:local
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev --prefix backend
```

En otra terminal desde la raíz:

```powershell
npm run dev --prefix frontend
```

Abrí http://localhost:5173. La API responde en http://localhost:3001/api/health. Conservá localhost en FRONTEND_URL y en el navegador. Si esos puertos ya están ocupados por otra copia, detené aquella copia primero.

## Estructura del backend

Sigue la del trabajo práctico integrador. `backend/app.js` es la entrada (arma Express, monta los routers en `/api` y abre el puerto). En `backend/src` hay un archivo por cada modelo (`models/user.model.js`), controlador (`controllers/question.controller.js`), router (`routes/place.route.js`) y validación con express-validator (`middlewares/validations/report.validation.js`). Detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Comprobar

```powershell
npm run build
npm test
```

El backend necesita TEST_DB_NAME terminada en `_test` para ejecutar la integración SQL; sin ella la omite. Configurá también TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER y TEST_DB_PASSWORD en la terminal. Nunca uses una base con alumnos para pruebas.

## Alcance y documentación

- [Integración: fuentes, conflictos, validación y pendientes](docs/INTEGRACION_FINAL.md).
- [Guía de ejecución](INICIAR.md).
- [Investigación de institutos](docs/INSTITUCIONES_FORMOSA.md).
- [Registro de diferencias V1 → V1.1 y unión](docs/CAMBIOS_V1_1.md).
- Los documentos fechados de la entrega anterior se conservan como historial; INTEGRACION_FINAL.md describe el estado de esta entrega.

No se incluyen .git, .env, dependencias instaladas, compilaciones ni bases/cuentas de prueba. No se crean administradores con contraseñas conocidas. Los roles se asignan con `npm run user:role` en backend, solo a cuentas existentes.

El mapa no es un GPS. Incluye seis puntos con coordenadas aportadas por el usuario y enlaces de Google Maps. Las rutas orientativas se cargan desde Moderación → Rutas: todavía no hay ninguna, porque cada recorrido tiene que comprobarlo alguien del equipo. Los espacios no tienen membresía ni chat privado. Las sanciones públicas y la guía temática ampliada siguen pendientes.

## Perfiles

- `/perfil`: perfil propio. Cada persona edita su descripción (hasta 280 caracteres), color del avatar, fondo, intereses (hasta 6), año de ingreso y privacidad (mostrar o no de dónde viene y si ya llegó), y puede cambiar su contraseña.
- `/usuarios/:id`: perfil de otra persona, solo con sesión iniciada. Muestra actividad (preguntas, respuestas y respuestas marcadas como útiles), insignias y advertencias de moderación. El correo no se muestra nunca y no hay mensajes privados.
- Moderación puede dar y revocar advertencias y ocultar o volver a mostrar una descripción. Los perfiles se pueden reportar. Todo queda en el historial.
- Después de bajar estos cambios: `npm run db:migrate` (migración 012).

## Puntos, tienda, foto y búsqueda

- `/tienda`: catálogo de 21 decoraciones en 4 colecciones, con vista previa sobre tu propio perfil. `?ver=inventario` muestra lo que compraste para ponértelo o sacártelo; `?ver=puntos`, el saldo, el nivel, las reglas, lo ganado hoy y los movimientos.
- Se gana: 100 de bienvenida, +2 por pregunta (2 por día), +5 por respuesta a otra persona (3 por día) y +10 cuando marcan tu respuesta como útil (10 por día). Se pierde: −15 si moderación oculta algo tuyo y −30 por advertencia (se devuelve si se revoca). Gastar en la tienda no baja la reputación. Detalle en [docs/PUNTOS_Y_TIENDA.md](docs/PUNTOS_Y_TIENDA.md).
- Foto de perfil desde `/perfil` (botón de la cámara o “Elegir una foto”). Moderación puede quitarla desde el perfil de la persona.
- `/buscar?q=…`: personas, fichas y preguntas. Conozcamos Formosa y Preguntas también tienen su buscador.
- Administración: Moderación → Fichas (crear y editar fichas completas) y Moderación → Rutas (rutas orientativas, FF-22).
- Después de bajar estos cambios: `npm run db:migrate` (migración 013) y `npm run db:seed` (carga el catálogo de la tienda, cuatro fichas nuevas y tres espacios). Las cuentas que ya existían reciben los 100 puntos de bienvenida una sola vez.
