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
