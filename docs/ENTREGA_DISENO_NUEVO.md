# Entrega de diseño nuevo integrado — 6 de noviembre de 2026

## Origen y conservación del diseño

Base recibida: `C:\Users\IPF-2026\Desktop\DISEÑO NUEVO FORBOOK\FORBOOK-SPRINT1`.
Se trabajó en una copia separada. La carpeta recibida ya contenía los módulos de V1.1: sesiones SQL, login/registro en modal, home, guía y accesos por institución. La ubicación anterior `Desktop/FORBOOK-V1/FORBOOK-SPRINT1` ya no existía en el equipo; se utilizó esta base funcional recibida, sin afirmar una combinación con una carpeta anterior ausente.

Se conservaron sin cambios todas las hojas de estilo, las tipografías, ilustraciones, iconos, componentes de navegación, páginas de bienvenida/home/guía/detalle y el modo oscuro del nuevo diseño. El formulario de registro reutiliza sus componentes y estilos. La integración incorpora datos, validaciones y opciones, sin otro rediseño.

## Cambios respecto de V1.1 anterior

- Procedencia: de 89 localidades de Formosa a 4.027 localidades censales nacionales de Georef. Selección de provincia, búsqueda sin tildes y lista de localidades agrupadas por departamento. Son las 24 jurisdicciones, incluida CABA. No se trata de una lista de todos los barrios/parajes.
- Opción “No soy de Argentina”: muestra debajo el país de procedencia. Se incluyen 249 países/territorios ISO 3166-1 con nombres españoles; el circuito exterior ofrece 248, excluyendo Argentina. Fuente de nombres: country-list/Unicode CLDR, con licencia incluida; referencia de códigos: UNECE/ISO.
- La procedencia del servidor se construye a partir de identificadores del catálogo. No acepta un nombre inventado de país/localidad ni una localidad argentina junto con un país exterior. Cambiar provincia o circuito limpia la elección dependiente.
- API pública nueva `GET /api/origin-countries`. `GET /api/origin-localities` ahora devuelve provincia y alcance nacional.
- Migración `005-national-origin`: agrega province_name a localidades y origin_country_code a usuarios. Backfill AR solo para usuarios que ya tenían una localidad canónica. Los textos y las cuentas anteriores se conservan.
- Directorio terciario ampliado a toda la provincia: 49 sedes/anexos adicionales a IPF/UNaF. Búsqueda por nombre/localidad. Hay 43 entradas de carreras adicionales verificadas en el mapa oficial 2026. La lista institucional no se presenta como padrón exhaustivo ni habilitación actual certificada.
- Excepción explícita para instituciones sin catálogo de carreras: permite registro con “Carrera pendiente de catálogo”. No se crea una carrera ficticia ni se ofrece un campo libre. El backend rechaza omitir carrera cuando la institución sí tiene alguna cargada. Los catálogos parciales pueden necesitar ampliación para cohortes anteriores.
- Se mantienen los accesos exclusivos IPF (Aprende/IPF Conecta) y UNaF (SIU/Virtual/portal). Los nuevos institutos no reciben accesos de otras instituciones.
- Catálogos empaquetados: el registro no consulta Georef ni un servicio de países externo en tiempo de uso. La carga inicial es repetible y no crea cuentas.
- Se actualizó una dependencia indirecta del backend (body-parser) para resolver el aviso encontrado por npm audit. No se usa instalación forzada de versiones mayores.
- Nueva guía INICIAR.md y comando configurar:local: crea archivos de configuración de desarrollo para XAMPP sin sobrescribir los existentes y genera un secreto aleatorio sin imprimirlo.

## Investigación y fuentes

- [Georef: descarga completa](https://www.argentina.gob.ar/georef/descarga-de-la-base-completa).
- [Consulta nacional descargada](https://apis.datos.gob.ar/georef/api/localidades-censales?max=5000&orden=id): 4.027 registros, total reportado igual al descargado, identificadores únicos y 24 jurisdicciones. Conserva las 89 localidades de Formosa.
- [UNECE: países y territorios, ISO alpha-2](https://unece.org/trade/cefact/unlocode-code-list-country-and-territory).
- [Nombres españoles country-list](https://github.com/umpirsky/country-list/blob/master/data/es/country.json), licencia MIT en LICENCIA_COUNTRY_LIST.txt.
- [Dirección de Educación Superior: directorio](https://des-for.infd.edu.ar/sitio/datos-de-institutos/).
- [Oferta académica 2026](https://des-for.infd.edu.ar/sitio/oferta-academica-2026/), Resolución 4160/25. Se revisó el PDF escaneado; el inventario guarda CUE, fuente y página cuando corresponde.
- Ver INSTITUCIONES_FORMOSA.md para inventario y pendientes. No se confunden universidades, terciarios, trayectos técnicos cortos y postítulos.

## Validación

- Compilación de producción del frontend: correcta.
- 15 pruebas del backend aprobadas, 0 omitidas, con MySQL/MariaDB real en una base exclusiva terminada en _test. Incluyen registro nacional/exterior, nombres canónicos persistentes, carreras por institución, excepción de catálogo vacío, credenciales, sesiones y aislamiento de contenidos/accesos.
- 4 pruebas del formulario React aprobadas con Vitest y DOM simulado. Cubren 24 jurisdicciones, búsqueda de Pirané sin tilde, limpieza al cambiar provincia/circuito, selector exterior, país obligatorio y carrera pendiente. Estas pruebas no sustituyen una revisión visual en navegador real.
- Experimento de actualización desde el esquema previo: perfiles históricos y canónicos conservados; migración 005 ejecutada dos veces sin pérdida ni duplicación de columnas.
- Migraciones y carga de catálogos repetidas en base de prueba; 4.027 localidades, 51 instituciones y 81 entradas de carreras, sin duplicados por repetición.
- npm audit: 0 vulnerabilidades en frontend y backend al cerrar la entrega.
- Limitación: no se pudo completar la revisión visual de escritorio/móvil. El navegador integrado agotó el tiempo de apertura y la herramienta de Windows detuvo la revisión al no poder verificar la URL de Chrome. No se incluyen capturas nuevas ni se afirma validación visual.

## Entrega y reversión

ZIP con código completo, dependencias declaradas/lockfiles, migraciones, catálogos, fuentes e instrucciones. Se excluyen .git, node_modules, dist, .env, logs y bases/cuentas de prueba. Se puede probar en una carpeta y base nuevas siguiendo INICIAR.md. La carpeta de diseño recibida permanece intacta.

Para abandonar la prueba basta detener sus servidores y volver a abrir la copia anterior, si se utilizó la base separada sugerida. Si se actualizó una base existente, revertir código no equivale a revertir datos: se debe usar su copia de respaldo; no se proporciona una migración destructiva automática.
