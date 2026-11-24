# Fuentes del catálogo inicial

Revisión editorial: 20 de octubre de 2026. La fecha de las fichas representa la consulta de estas referencias, no la fecha de publicación de sus páginas. Se verificaron referencias oficiales mediante búsqueda web; no se comprobaron presencialmente servicios ni trámites.

| Ficha / catálogo | Referencia | Alcance verificado |
|---|---|---|
| Institución UNaF y punto de partida | https://www.unf.edu.ar/ | Identidad institucional y existencia de portal académico. |
| SIU Guaraní | https://guarani.unf.edu.ar/autogestion/acceso?auth=form | Acceso oficial y funciones declaradas de autogestión. |
| UNaF Virtual | https://sied.unf.edu.ar/ | Existencia y presentación del espacio virtual de la universidad. |
| Portal municipal | https://www.formosatuciudad.gob.ar/index.php | Portal de la ciudad con sección de trámites. No se afirman requisitos ni horarios. |

El primer intento de acceso directo a la web UNaF no respondió; la búsqueda devolvió resultados oficiales. Se utilizó el portal municipal encontrado en la búsqueda, no el dominio inicial que no pudo consultarse.

El contenido son resúmenes propios y enlaces de orientación; no se copiaron artículos completos. Las fichas advierten que el estudiante debe confirmar información cambiante en origen.

## Reglas editoriales

- Oficial: identificar institución y referencia oficial. No convertir una recomendación propia en afirmación de la institución.
- Comunitario: identificar autoría, fuente disponible y revisión real. No implica automáticamente verificación oficial.
- Experiencia: etiquetar como opinión o vivencia y atribuirla cuando se publique. No presentarla como dato oficial.
- Fecha desconocida: `reviewedAt = null` y mostrar “Sin fecha de revisión”. No usar `updatedAt` como si fuera una revisión editorial.
- Contenido sensible al cambio: verificar antes de publicarlo como confiable. No hay publicación desde la API en este Sprint; los responsables editoriales deben aplicar esta regla al cargar nuevos datos.
- Datos ficticios: solo en pruebas y claramente identificados. Las pruebas SQL no alimentan la base de la aplicación.

Las cinco categorías son Lugares útiles, Movilidad, Vida estudiantil, Cultura y costumbres y Recomendaciones. Se tomó “Movilidad” del pedido más reciente como nombre inicial. Movilidad y Cultura quedan vacías hasta verificar material suficiente. El equipo puede refinar nombres y límites sin cambiar identificadores de historias.

Para ampliar instituciones, agregá registros verificables al seed y ejecutalo. No hace falta modificar un arreglo de React. Para contenido nuevo, agregá una ficha con slug nuevo y referencia real. El seed no sobrescribe fichas existentes: los cambios editoriales de registros existentes requieren una actualización explícita y revisada en MySQL o una futura herramienta administrativa.


## V1.1 — instituciones y carreras (03/11/2026)

El catálogo académico proviene del listado público de SIU Guaraní de UNaF y la página de carreras del IPF. Las fuentes exactas, filtros, límites de vigencia y denominaciones históricas están documentados en `CAMBIOS_V1_1.md`. Cada carrera persistida tiene `sourceUrl` y `reviewedAt`. No se presentan estos listados como inscripción abierta ni se copian requisitos antiguos.

## Fichas agregadas el 16/11/2026

Consultadas el 16/11/2026. Son resúmenes propios; lo que las páginas no informan (horarios de atención, fechas de inscripción vigentes) no se completó.

| Ficha | Referencia | Alcance verificado |
|---|---|---|
| Tu punto de partida en el IPF (solo IPF) | https://www.ipf.edu.ar/contacto | Dirección (Ruta Nacional 81, km 1190), correo, WhatsApp y redes. La página no publica horarios. El aula virtual figura en el inicio del sitio. |
| Carreras del IPF y preinscripción (solo IPF) | https://www.ipf.edu.ar/carreras | Las cuatro tecnicaturas superiores y lo que pide el formulario de preinscripción. El último aviso de fechas es de 2023: la ficha pide confirmar antes de anotarse. |
| Qué es el IPF (solo IPF) | https://www.ipf.edu.ar/institucional | Organismo descentralizado creado por el Decreto N.º 18/2018, relación con el Ministerio de Cultura y Educación y objetivos declarados. |
| Registrá tu SUBE | https://www.argentina.gob.ar/sube/preguntas-frecuentes y https://www.argentina.gob.ar/noticias/como-y-por-que-registrar-la-sube | Para qué sirve registrarla, una sola tarjeta por persona, el saldo no vence, cómo darla de baja (Mi SUBE, app, Centro de Atención, 0800-777-7823 opción 1) y el correo en 72 h hábiles. |

No se cargaron rutas de colectivos: no se encontró una fuente oficial con los recorridos urbanos de Formosa. Las rutas se cargan desde Moderación → Rutas después de que alguien del equipo compruebe el recorrido, con su fecha de revisión.

## Colectivo del IPF y fichas del 16/11/2026 (segundo lote)

**Colectivo gratuito al IPF** (ruta, fuente comunitaria). Lo comprobó Lautaro Villalba, estudiante del IPF, el 16/11/2026. Incluye solo lo que él informó: es gratis para estudiantes del IPF y no hay que mostrar nada; es un colectivo de Puerto Tirol sin cartel; turno mañana con dos salidas desde Plaza San Martín (parada del Correo Argentino), a las 8:00 (levanta en Plaza Temática y La Virgen) y a las 8:10 aproximadamente (Plaza Temática y Circuito, sobre la Ruta Nacional 11); en las demás paradas el horario varía y conviene estar antes de las 8:00; turno tarde alrededor de las 16:15; la vuelta para en las mismas paradas. Las ocho paradas del turno mañana (Plaza San Martín, Plaza Temática, La Virgen, Circuito, Cruz, Homu, Shell e IPV) tienen las coordenadas que él aportó, redondeadas a 6 decimales. No se dibuja el trayecto ni se informa el tiempo de viaje.

| Ficha | Tipo y referencia | Alcance |
|---|---|---|
| Beneficios para estudiantes del IPF (solo IPF) | Oficial. AGENFOR, 28/10/2026: https://agenfor.com.ar/2026/10/cerca-de-600-estudiantes-ya-se-preinscribieron-a-las-carreras-del-instituto-politecnico/ | Transporte y comidas garantizados (unas 500 raciones diarias), equipamiento tecnológico, acompañamiento docente, equipo de psicología, psicopedagogía y trabajo social, y la Beca Soberanía Tecnológica (Secretaría de Ciencia y Tecnología, para estudiantes del interior). La nota no da requisitos ni monto. |
| Carreras del IPF y preinscripción 2027 (solo IPF, actualizada) | Oficial. La misma nota de AGENFOR | Cuatro tecnicaturas, preinscripción 2027 en ipfconecta.formosa.gob.ar hasta diciembre, paso al aula virtual y examen de ingreso. Reemplaza la versión anterior, que tomaba los formularios de 2023 de ipf.edu.ar/carreras. |
| Parada de Circuito: esperá con cuidado (solo IPF) | Experiencia de Lautaro Villalba | Robos contados por estudiantes en la zona de la parada, consejos para esperar y la Policía al 101 (número de la ficha de emergencias). Sin estigmatizar el barrio. |
| Alquileres en Marketplace | Experiencia de Lautaro Villalba | Dónde se publican alquileres y cuidados para evitar estafas. Remite a la ficha legal de alquileres. |
| DiDi o Uber: cuál conviene | Experiencia de Lautaro Villalba | Entre estudiantes se usa más DiDi porque suele ser más barato. Sin precios. |
| El tereré | Experiencia de Lautaro Villalba | Qué es y cómo se comparte. |
| El «pa» para hablarle a alguien (corregida el 24/11/2026) | Experiencia de Lautaro Villalba | En Formosa se usa «pa» para dirigirse a otra persona, como «che» o «amigo»: «¿Qué onda, pa?». La versión anterior hablaba del «pa» al final de las preguntas y de su origen guaraní; no era el uso que se quería contar, así que se quitó esa parte y su cita. El seed la actualiza solo si nadie la editó. |
| ¿Te faltan útiles? Capítulo, en el centro | Experiencia de Lautaro Villalba | Solo la recomendación. No se cargó dirección ni horario porque nadie los comprobó. |

## Banco y Capítulo (16/11/2026, tercer lote)

| Dato | Tipo y referencia | Alcance |
|---|---|---|
| Lugar: Banco Formosa — Casa Central | Oficial. BCRA, Entidades financieras, filiales y cajeros (Formosa): https://www.bcra.gob.ar/entidades-financieras-filiales-y-cajeros-filtros/?Provincia=FORMOSA&bco=AAA10&Tit=2&Tipo=1 | Dirección (Av. 25 de Mayo 102 y Belgrano) y coordenadas (-26.182508, -58.166416) tal como las publica el BCRA para la casa central. |
| Lugar: Capítulo (librería) | Comunitaria. Lista de librerías de la canasta escolar 2025, Guau Formosa, 13/02/2025: https://www.guauformosa.com.ar/noticias/2025/02/13/27930-librerias-formosenas-se-suman-a-la-canasta-escolar-con-descuentos-y-financiacion | Dirección (Av. 25 de Mayo 799). Coincide con la canasta escolar 2018 (Sensación Formosa) y con la página del comercio. Sin coordenadas comprobadas: se muestra con la dirección y sin punto en el mapa. |
| Ficha: Abrí una caja de ahorro (nueva) | Oficial. BCRA, «Caja de ahorro: cómo usarla de forma segura»: https://www.bcra.gob.ar/caja-de-ahorro-caracteristicas-y-uso/ | Apertura y mantenimiento sin costo, DNI, no pueden obligarte a otro producto, qué es gratis y qué se puede cobrar. La dirección del Banco Formosa sale de la fila del BCRA de arriba. |
| Ficha: ¿Te faltan útiles? Capítulo (actualizada) | Experiencia de Lautaro Villalba, más la dirección de la fila de arriba | Ahora dice la dirección y remite al mapa. El seed la actualiza solo si nadie la editó. |

Bancos y cajeros (16/11/2026): nueve puntos del mapa, en Servicios, con las coordenadas de Google Maps que pasó un compañero del IPF (fuente comunitaria): dos cajeros Red Link, dos cajeros y una sucursal del Banco Formosa, los cajeros del Banco Formosa sobre Moreno, un cajero BBVA (25 de Mayo 311), un cajero Naranja X y cajeros Pago24. No tienen dirección cargada salvo el de BBVA.

Actualización del 16/11/2026 (cuarto lote):
- Turno tarde del colectivo del IPF: según Lautaro Villalba, usa las mismas paradas que el turno mañana. Se cambió ese paso de la ruta.
- Capítulo: ahora tiene coordenadas (-26.184686, -58.173144), tomadas de Google Maps. Dos directorios que lo copian coinciden con una diferencia de unos 10 m.
- Biblioteca: la que recomendó Lautaro es la del ex Colegio Nacional, hoy EPES N.º 54 «Gobernador Juan José Silva». La dirección (Sarmiento 885) sale de la página de la escuela; la ubicación (-26.186668, -58.175340), de Google Maps. Algunos padrones escolares registran la escuela en Av. 25 de Mayo 1050, barrio Don Bosco: se usó la dirección que publica la propia escuela. No hay horarios publicados: la ficha y el lugar piden consultarlos.

El seed actualiza la ruta del colectivo y el lugar de Capítulo solo si nadie los editó desde la página (`routeRevisions` y `placeRevisions` en el catálogo).

## Guía y comida (24/11/2026)

| Dato | Tipo y referencia | Alcance |
|---|---|---|
| Ficha: Alimentos seguros: cómo cocinar y guardar la comida (nueva) | Oficial. SENASA, «Claves para preparar, cocinar y conservar alimentos inocuos y saludables», 22/07/2020: https://www.argentina.gob.ar/node/206782 | Las nueve claves del SENASA (alimentos tratados, agua potable, cocción a 70 °C, comer lo cocido enseguida, enfriar antes de guardar, no mezclar crudo y cocido, lavarse las manos, cocina limpia y recipientes cerrados). Sin datos propios. |
| Guía «Cómo vivir en Formosa» (/guia) | Las fichas que ya están en esta tabla | No agrega datos: ordena por tema (seguridad, salud y clima, comida, plata y trámites, costumbres) fichas que ya tienen su fuente. Si una ficha no existe o está oculta, no aparece. |

Las fichas que crean los estudiantes desde Conozcamos Formosa no están en esta tabla: se publican con el nombre de quien las hizo, con su tipo de fuente (experiencia, comunitaria con referencia u oficial con enlace https) y la comunidad las puede reportar.

## Mapa: lugares por categoría y por barrio (24/11/2026)

Cómo se ubicó cada punto: la dirección sale de una fuente oficial (Formosa Digital del Gobierno provincial, https://fd.formosa.gob.ar/mapa, o la Municipalidad). Si la dirección es una esquina, la coordenada es la que devuelve Georef, el servicio oficial de normalización de direcciones (https://apis.datos.gob.ar/georef/api/direcciones). Georef no ubica alturas (números de calle) en Formosa, solo esquinas. Si no había esquina, se usó OpenStreetMap o Waze, y la fuente de cada lugar lo dice. Sin ubicación comprobada, el lugar va sin punto en el mapa.

| Lugar | Barrio | Dirección (fuente) | Ubicación |
|---|---|---|---|
| Jefatura de Policía y Comisaría Seccional Primera | Centro | Saavedra 325, esquina Moreno (Municipalidad y Formosa Digital) | Georef, Saavedra y Moreno |
| Comisaría Seccional Segunda | — | Av. 25 de Mayo 1380 (Formosa Digital) | Waze |
| Comisaría Seccional Cuarta | — | Trinidad González y Rómulo Amadey (Formosa Digital) | Georef |
| Comisaría Seccional Quinta | Circuito Cinco (B° Eva Perón) | Raúl Viciconti y Vicente Solano Lima (Formosa Digital) | Georef |
| Comisaría Seccional Octava | La Nueva Formosa | B° La Nueva Formosa (Formosa Digital) | OpenStreetMap, nodo 4794199022 |
| Hospital de Alta Complejidad | — | Av. Dr. Néstor Kirchner y Av. Pantaleón Gómez (publicada por el hospital, IntraMed) | Georef |
| Hospital de la Madre y el Niño y Registro Civil Seccional Quinta | — | Córdoba 1450; Paraguay entre Córdoba y Roca (Formosa Digital) | Punto medio de las dos esquinas de Georef |
| Hospital Odontológico | — | Av. 28 de Junio y Coronel Bogado (Formosa Digital) | Georef |
| Centro de Salud La Nueva Formosa | La Nueva Formosa | B° La Nueva Formosa (Formosa Digital) | OpenStreetMap, vía 743459933 |
| Hospital Distrital N.º 8 | Circuito Cinco | Av. Ana Esther Elías de Cánepa s/n (Formosa Digital) | Sin punto |
| Registro Civil, sede central | Centro | Av. 25 de Mayo 162 (Formosa Digital) | Sin punto |
| Registro Civil Seccional Cuarta | Circuito Cinco | Mz. 65, casa 24, B° Eva Perón (Formosa Digital) | Sin punto |
| Terminal de Ómnibus | — | Av. Gutnisky 2615 (Municipalidad); esquina Av. Antártida Argentina (Unibus) | Georef |
| Aeropuerto El Pucú | Cerca de La Nueva Formosa | 7 km al sur del centro (Argentina.gob.ar) | Wikipedia |
| Colectivos: Plaza San Martín | Centro | Punto de conexión de las líneas (Municipalidad) | Parada comprobada por un estudiante del IPF (la misma del colectivo del IPF) |
| Colectivos: cabecera de la línea D | Centro | San Martín y Corrientes (El Destape, 07/11/2025) | Georef |
| Colectivos: cabecera de las líneas C y H | — | Av. Napoleón Uriburu y Córdoba (El Destape, 07/11/2025) | Georef |
| Instituto Superior de Arte «Oscar Alberto Albertazzi» | Centro | Av. 9 de Julio y España (publicación del instituto en archivos.formosa.gob.ar) | Georef |

Ficha «Las líneas de colectivo de la ciudad» (nueva): las líneas y su organización salen de la Municipalidad (https://www.formosatuciudad.gob.ar/servicios/transporte-urbano/8097-la-municipalidad-informo-como-sera-el-nuevo-sistema-de-transporte-publico-en-la-ciudad); las cabeceras actuales, de El Destape (07/11/2025); el recorrido de la línea H por el Circuito Cinco, de Guau Formosa (31/01/2025). La lista coincide con las líneas que la Secretaría de Transporte de la Nación nombró en octubre de 2025 (A, B, C, D, E, F, G, H, K y L). No se publican recorridos calle por calle de las demás líneas porque no hay una fuente que los dé completos.

Quedan pendientes (sin punto en el mapa hasta tener la ubicación): Hospital Distrital N.º 8, Registro Civil central y Registro Civil Seccional Cuarta.
