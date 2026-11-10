# Integración final para revisar — 10 de noviembre de 2026

## Fuentes exactas

1. Entrega local V1.1 con diseño nuevo, procedencias nacionales/internacionales e institutos: copia preservada en work/Forbook_Integrado de este chat. Sus catálogos se conservan completos y con las mismas fechas de revisión, sin presentar esta unión como una investigación nueva de datos educativos.
2. [Rama-Gonzalo2, commit a37f2e7](https://github.com/escalantehugo65/FORBOOK-SPRINT1/commit/a37f2e72cd69cd49c469f75d3e48a68ab975578b).
3. [rama-laurato, commit b0fbbb4](https://github.com/escalantehugo65/FORBOOK-SPRINT1/commit/b0fbbb4f223eaf0c816020960dc65d06a9bb9846).
4. Ancestro común del diseño usado para comparar cambios: [diseño-nuevo, 70089f6](https://github.com/escalantehugo65/FORBOOK-SPRINT1/commit/70089f68c42b4682f765f70703eec16f7a13f45c).

Se verificó con el historial Git que rama-laurato es ancestro de Rama-Gonzalo2. No había commits exclusivos de rama-laurato que faltaran en Rama-Gonzalo2. Se tomó el contenido completo de Gonzalo como base acumulada de ambas ramas y se incorporó la diferencia de la entrega local mediante comparación de tres versiones.

No se hizo push, no se creó develop, no se modificaron archivos ni ramas en GitHub. El clon descargado se mantuvo solo para consulta, comparación y exportación de archivos. El ZIP carece de metadatos .git.

## Resultado funcional

| Procedencia | Funciones conservadas |
|---|---|
| V1.1 local | Diseño nuevo, modo oscuro, registro/login modal, 4.027 localidades censales, 249 países/territorios, IPF/UNaF y 49 sedes/anexos adicionales, carreras canónicas y carrera pendiente si no hay catálogo, accesos institucionales separados. |
| rama-laurato, ya incluida en Gonzalo | Inicio según llegada, preguntas, respuestas, votos útiles, reportes, moderación, historial, administración de categorías y fuentes, roles student/moderator/admin. |
| Rama-Gonzalo2 | Mapa Leaflet, filtros, colores por categoría y encuadre estable, rutas orientativas, espacios sugeridos, administración de lugares y selector de ubicación. |

## Conflictos resueltos

1. **Migraciones:** se preservan tanto `005-national-origin` de la entrega local como `005-questions` de las ramas. Aunque comparten prefijo numérico, sus claves completas en schema_migrations son distintas. No se renombraron migraciones ya publicadas/aplicadas, evitando que se repitan o se pierdan al actualizar. El ejecutor declara explícitamente el orden de las 12 migraciones.
2. **Perfil de sesión:** el DTO público conserva originCountryCode y role. El primer dato es necesario para el registro internacional; el segundo controla la navegación de moderación. La autorización del backend sigue consultando el rol en SQL.
3. **Registro:** se conserva el catálogo nacional y de países, la validación de combinaciones y la selección de carrera por institución. Los demás validadores de preguntas, reportes, fuentes y lugares se incorporan sin reemplazarlos.
4. **Contenidos:** se conservan a la vez el filtro por institución y la exclusión de fichas ocultas por moderación.
5. **Espacios:** se corrigió la suposición anterior de que tener cualquier originLocalityId significaba ser de Formosa. Solo un identificador canónico de provincia 34 se considera local; las demás provincias y países se consideran de afuera.
6. **Datos iniciales:** se combinan instituciones/carreras/localidades con lugares y espacios de las ramas. Las cargas son repetibles y no crean cuentas de demostración ni reemplazan contenidos o coordenadas cargados a mano.
7. **Dependencias y comandos:** se conserva Leaflet junto con las fuentes y herramientas de pruebas; se regeneraron lockfiles. Se mantienen user:role y place:location. La raíz permite correr ambas suites de pruebas.
8. **Modal en pantalla angosta:** se corrigió el ancho mínimo que imponían nombres largos de países/instituciones y se permite que los botones de acción pasen de fila. Se comprobó en el navegador a 319 píxeles de ancho que el modal tiene el mismo clientWidth y scrollWidth, sin desborde horizontal. No se cambió la paleta ni la tipografía.

## Comprobaciones completadas

- **35 pruebas backend aprobadas, 0 fallidas, 0 omitidas**, con MySQL 8 real en una instancia aislada de trabajo, sin acceso a una base de alumnos.
- **4 pruebas frontend aprobadas** con Vitest/DOM simulado, conservando los controles del registro nacional e internacional.
- Compilación de producción correcta: incluye las páginas nuevas y el mapa, cargado aparte cuando se abre.
- **Actualización desde V1.1 nacional:** se crean las tablas de preguntas, moderación, lugares y espacios; se conserva el perfil anterior, su carrera y su procedencia.
- **Actualización desde el esquema de las ramas:** se agrega el país/provincia; se conserva un usuario moderador y una pregunta anterior.
- Ambas actualizaciones se migraron y sembraron dos veces. Se conservaron los registros existentes, con 12 migraciones registradas y sin duplicar catálogos: 4.027 localidades, 81 entradas de carreras, 51 instituciones iniciales (52 en el ensayo que tenía una institución ficticia anterior).
- npm audit de ambas aplicaciones: 0 vulnerabilidades al verificar esta entrega.
- Prueba real en navegador: alta de un perfil sintético de Paraguay en IPF, inicio con país/carrera, accesos Aprende/IPF Conecta, navegación al mapa, modo oscuro, sugerencias Antes de llegar/IPF/otra provincia o país y cierre de sesión. Solo se utilizaron datos sintéticos en la base aislada.
- No se inspeccionó cada pantalla administrativa en navegador: sus permisos y operaciones se comprobaron mediante las pruebas SQL/HTTP heredadas de las ramas.

## Pendientes que no se convierten en funciones por unir archivos

- El catálogo inicial del mapa trae dos referencias de la UNaF sin coordenadas verificadas. La lista muestra su dirección y fuente; no se colocan pines ficticios. IPF y los institutos nuevos no reciben automáticamente un punto de mapa.
- No se cargan rutas inventadas. Si no hay una ruta para la institución, se informa en pantalla. La sección y API de rutas funcionan con datos que se carguen y verifiquen.
- Los espacios son directorios y enlaces a secciones públicas: no hay membresías, conversaciones privadas ni chat privado.
- Puntos, tienda/canje, sanciones públicas y guía temática ampliada siguen como próximos desarrollos. Los votos útiles de respuestas sí están integrados; no equivalen a un sistema de puntos.
- El directorio educativo y las carreras son referencias parciales de las fuentes originales. No se afirma que todas tengan inscripción abierta ni que el padrón sea exhaustivo. Ver INSTITUCIONES_FORMOSA.md.
- Las teselas del mapa dependen de OpenStreetMap y de conexión de red; los catálogos del registro están incluidos localmente.

## Cómo revisar y eventualmente publicar manualmente

Descomprimí en una carpeta distinta y seguí INICIAR.md. configurar:local propone `forbook_final_prueba`, dejando la base anterior separada. Para actualizar una base anterior, respaldala primero y ejecutá las migraciones/carga en la copia nueva; revertir código no revierte los cambios de la base.

Si la revisión resulta satisfactoria, la creación de develop y la subida se harán manualmente por el equipo, como pidió el usuario. Este paquete no ejecuta operaciones Git ni publica nada por sí mismo.


## Actualización posterior: mapa y alcance institucional

El estado vigente está en MAPA_Y_REGISTRO.md: seis lugares con coordenadas aportadas; nuevos registros solo UNaF/IPF; 40 pruebas aprobadas. Los conteos y pendientes anteriores de este documento describen la primera unión, no el catálogo actual.
