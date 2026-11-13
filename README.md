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
- Rutas orientativas y espacios públicos sugeridos por procedencia, institución y etapa de llegada.

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

El mapa no es un GPS. Incluye seis puntos con coordenadas aportadas por el usuario y enlaces de Google Maps; las rutas de colectivos todavía no están cargadas. Los espacios no tienen membresía ni chat privado. Puntos/tienda, sanciones públicas y guía temática ampliada siguen pendientes.
