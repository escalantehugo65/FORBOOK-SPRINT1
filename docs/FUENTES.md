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
| El «pa» de las preguntas | Experiencia de Lautaro Villalba | Uso de «pa» al final de las preguntas. El origen guaraní (partícula interrogativa -pa) coincide con Paz y Vidal, «Interrogative Constructions in Guaraní», Languages, 2022 (UNaF y CONICET). |
| ¿Te faltan útiles? Capítulo, en el centro | Experiencia de Lautaro Villalba | Solo la recomendación. No se cargó dirección ni horario porque nadie los comprobó. |

Quedan pendientes, por falta de datos comprobados: qué banco recomendar y dónde, el nombre exacto y la ubicación de la biblioteca del Colegio Nacional, la dirección de Capítulo y las paradas del turno tarde.
