# V1 → V1.1 — registro de cambios

## 03/11/2026 — prueba visual de la bienvenida

Estado: implementado para evaluación en Rama-Hugo. La aprobación visual definitiva queda pendiente del usuario.

| Parte | V1 | Propuesta V1.1 |
|---|---|---|
| Bienvenida | Hero extenso, ilustración geométrica y tres bloques de explicación. | Título breve, descripción, una acción principal e imagen ribereña discreta. |
| Identidad | Blanco verdoso y verde azulado. | Crema cálido y verde bosque; oscuro espresso y botón salvia. |
| Cabecera pública | Símbolo y botones Ingresar/Crear cuenta. | Marca tipográfica, Ingresar y selector de tema. |
| Temas | Un único estilo claro. | Claro y oscuro solo en bienvenida; preferencia local persistida si el navegador permite almacenamiento. |
| Adaptación | Hero de dos columnas y bloques inferiores. | Dos columnas en escritorio y una en móvil, con más espacio libre. |

### Alcance acordado

Solo se modifica la bienvenida `/` y su marco visual. El botón Empezar sigue llevando al registro existente; Ingresar conserva su ruta. Con sesión válida, ambos accesos llevan a Mi inicio. Las demás pantallas y la API conservan su comportamiento.

Archivos: `frontend/src/components/Layout.jsx` selecciona el marco según la ruta; `WelcomeLayout.jsx` administra cabecera, pie y tema; `pages/WelcomePage.jsx` contiene el contenido; `WelcomePage.css` tiene estilos limitados a clases welcome; `assets/ribera-bienvenida.webp` contiene el paisaje optimizado.

### Imagen y procedencia

Paisaje generado con la herramienta integrada de imágenes: río tranquilo, horizonte bajo y vegetación ribereña inspirados en Formosa. No es una fotografía documental ni representa una ubicación verificable. El texto alternativo explicita que es generado. Se puede sustituir por una fotografía real con derechos de uso acordados.

Prompt de producción: “Paisaje panorámico fotográfico atmosférico inspirado en la ribera del río Paraguay, agua tranquila, horizonte plano con vegetación subtropical, cielo cálido suave y ramas en la esquina superior derecha; paleta oliva y crema, sin personas, edificios, texto ni hitos inventados”. Generación integrada, sin CLI. El PNG original se convirtió a WebP para uso web.

### Pendiente, sin implementar en esta tarea

- Modales de registro e ingreso.
- Incorporación del IPF y catálogo de carreras reales por institución.
- Mejoras de formularios que aún requieren acuerdo.
- Extender el nuevo tema a pantallas privadas, si se aprueba este estilo.

### Volver al estilo V1

Antes de editar se guardó `Forbook_Bienvenida_V1_Respaldo.zip` en la carpeta outputs del chat, con los originales de `Layout.jsx` y `WelcomePage.jsx`. Restaurar esos dos archivos devuelve la bienvenida anterior. Los archivos nuevos quedan sin referencias y pueden retirarse después. No usar un reset general de la rama: hay cambios de package-lock anteriores a esta tarea que deben conservarse.

### Verificación

Compilación de producción aprobada (Vite, 61 módulos). Revisión en navegador a 390 × 844 y 1440 × 900; verificación adicional a 320 px sin desbordamiento horizontal. Cambio claro/oscuro y persistencia al recargar comprobados. Ingresar abre el formulario existente y Empezar abre el registro, cuyo catálogo sigue llegando desde la API. Imagen cargada correctamente. No se enviaron formularios ni se crearon cuentas. El backend y la base de datos no se modifican por este experimento.



## 03/11/2026 — circuito público completo

Estado: implementado y probado para evaluación del usuario. Esta entrada amplía el experimento de bienvenida anterior.

| Parte | V1 | V1.1 |
|---|---|---|
| Ingreso y registro | Páginas independientes con diseño V1. | Dialog modal nativo sobre la bienvenida, heredando tema claro/oscuro, verde bosque/salvia y campos redondeados. |
| Navegación | Enlaces a `/ingresar` y `/registro`. | Los botones abren estado local sin cambiar URL. Los enlaces antiguos redirigen a `/` abriendo el modal correspondiente. |
| Registro | Formulario largo en una pantalla. | Paso 1: nombre, correo y contraseña; paso 2: procedencia, institución, carrera y llegada. Volver conserva los datos. |
| Contraseña | Campo oculto fijo. | Botón Mostrar/Ocultar en ingreso y registro. |
| Cierre | No existía modal. | X o Escape; si hay cambios se pide confirmar descarte. Seguir completando conserva campos y paso. El fondo no cierra accidentalmente el formulario. |
| Accesibilidad | Pantallas independientes. | Dialog nativo con foco dentro del modal, título asociado y restauración del foco al cerrar; cuerpo de fondo sin desplazamiento. |
| Instituciones | UNaF. | UNaF e Instituto Politécnico Formosa (IPF), persistidos en la base. |
| Carrera | Texto libre enviado por el estudiante. | Selector dependiente de institución, alimentado desde SQL. Cambiar institución limpia carrera. El servidor rechaza carreras inexistentes o de otra institución. |

### API, datos y compatibilidad

- Nueva tabla `careers`, relacionada con `institutions`; migración aditiva `002-careers`. No se borran ni modifican las cuentas existentes.
- Nuevo endpoint público `GET /api/institutions/:id/careers`, necesario antes de autenticarse.
- El registro recibe `careerId` en lugar de `career`. El backend busca esa carrera dentro de la institución elegida y guarda su nombre canónico en el campo histórico `users.career`.
- Se conserva el campo existente de perfiles V1 para que sus cuentas, sesiones y textos de carrera continúen funcionando. No se reasignan carreras históricas automáticamente.
- El frontend antiguo que envíe texto libre debe actualizarse junto con el backend: ese contrato ya no se acepta en registros nuevos.
- Si una carrera no aparece, se informa que no se puede completar el registro con una carrera distinta. No hay una opción libre que saltee el catálogo.
- Los datos de formularios y contraseñas no se guardan en localStorage. Solo se persiste la preferencia de tema. Cambiar entre ingreso y registro reinicia el formulario por privacidad.
- Después del éxito se navega al inicio privado `/inicio`. Esa pantalla y Conozcamos Formosa conservan su diseño anterior; la tarea actual comprende el circuito previo a HomePage.
- Si la cuenta se crea pero falla la apertura de sesión, se abre el ingreso con un aviso para no pedir crear otra cuenta.

### Catálogo y fuentes

Consulta realizada el 03/11/2026:

- IPF: https://www.ipf.edu.ar/carreras y referencia institucional https://ipfconecta.formosa.gob.ar/. Cuatro tecnicaturas superiores: Mecatrónica, Desarrollo de Software Multiplataforma, Química Industrial y Telecomunicaciones.
- UNaF: listado público de SIU Guaraní https://guarani.unf.edu.ar/autogestion/horarios_cursadas/buscar_carreras. Se cargaron 34 denominaciones académicas; se excluyeron módulos introductorios, reválidas, posgrados, complementos con nombres truncados y Gestión Universitaria dirigida al personal.
- Se unificaron las dos entradas de Prótesis Dental y se normalizaron mayúsculas/tildes. Algunas denominaciones del SIU son históricas: se conservan como referencia académica y no se afirma que tengan ingreso abierto, sede confirmada o cursado vigente. Se deberá revisar con las instituciones antes de convertirlo en una guía de oferta de ingreso.
- Los catálogos guardan fuente y fecha de revisión por carrera. La página académica del IPF contiene avisos de fechas antiguas: solo se usaron los nombres, no requisitos ni calendarios de inscripción.

### Verificación ejecutada

- Migración `002-careers` aplicada y catálogo cargado en la base local de la aplicación. Nuevas instituciones/carreras agregadas sin sobrescribir usuarios ni contenidos anteriores.
- 11 pruebas aprobadas con MySQL/MariaDB real en la base exclusiva `forbook_v11_test`; 0 fallidas, 0 omitidas. Incluyen carrera ajena, inexistente y rechazo de texto libre, además de sesiones, perfil y contenido.
- Navegador: apertura sin cambio de URL, validación de campos vacíos, Mostrar/Ocultar, pasos, IPF, selección de carrera y limpieza al cambiar institución.
- Registro real con una cuenta técnica de prueba, perfil institucional correcto, recuperación al recargar, logout, login incorrecto y login correcto. La cuenta técnica se elimina al terminar; no se usan credenciales del usuario.
- Enlace antiguo `/registro` comprobado: termina en `/` con el modal de registro.
- Revisión en escritorio y móvil 390 px; diálogo desplazable y sin desbordamiento horizontal.
- No se agregaron dependencias ni se modificó el diseño del inicio privado.

### Cómo ejecutar esta versión en otra copia

En `backend/`: `npm run db:migrate`, luego `npm run db:seed` y reiniciar el backend si no usa watch. Iniciar también el frontend. No necesita reinstalar paquetes nuevos.

### Reversión

Se creó `Forbook_Antes_Modal_V1_1.zip` en outputs del chat con los archivos previos a este cambio. Restaurar solo lo relacionado con la tarea y retirar archivos nuevos sin referencias; no resetear toda la rama ni los package-lock que ya tenían cambios propios. La tabla nueva puede permanecer sin uso si se vuelve al código V1; no hace falta borrar datos para revertir el diseño.

Cierre de verificación: cuenta técnica eliminada; 38 carreras disponibles (34 UNaF y 4 IPF). Compilación final aprobada, 62 módulos. Cierre con Escape y conservación de datos al elegir Seguir completando comprobados en navegador.

## 03/11/2026 — accesos y contenido según institución

Estado: implementado. Se agrega al inicio la sección “Accesos de tu institución”, alimentada por MySQL y la sesión autenticada.

| Perfil | Accesos del inicio | Contenidos visibles en Conozcamos Formosa |
|---|---|---|
| IPF | Aprende Formosa e IPF Conecta. | Fichas del IPF e información general de la ciudad. |
| UNaF | SIU Guaraní, UNaF Virtual y portal UNaF. | Fichas de UNaF e información general de la ciudad. |

- Aprende: https://aprende.formosa.gob.ar/ . IPF Conecta: https://ipfconecta.formosa.gob.ar/ . Enlaces aportados por el usuario; no se comprobó disponibilidad ni se simula un estado en tiempo real. El usuario informó que estaban caídos; se mantienen visibles con una nota condicional y se abren en pestaña nueva.
- No se solicita ninguna contraseña institucional dentro de Forbook.
- Tabla nueva `institution_resources`, relacionada con instituciones; migración aditiva `003-institution-resources`, sin borrar cuentas o fichas. Seeds agregan cinco accesos sin sobrescribir registros existentes.
- Endpoint privado `GET /api/institution-resources`: determina la institución mediante el usuario de la sesión. No acepta otra institución como autoridad desde el navegador.
- El listado de contenidos, su total y el detalle aplican en SQL la misma regla: publicado y de la institución propia o general (`institution_id IS NULL`). Una ficha ajena devuelve 404 incluso con su URL directa. Un filtro de otra institución devuelve lista vacía, no sus fichas.
- No se usan IDs fijos en React ni se ocultan tarjetas después de haber enviado fichas ajenas al navegador. Los enlaces de las otras instituciones no se devuelven a este perfil.
- Los catálogos públicos de instituciones/carreras siguen disponibles para permitir el registro; no contienen datos privados de estudiantes.
- Comprobación: 12 pruebas SQL aprobadas, incluyendo ambos sentidos de separación, conteos, filtros y detalle ajeno; compilación del frontend aprobada. Revisión en navegador con un perfil técnico IPF: dos accesos correctos y ausencia de SIU/UNaF en su inicio.
- Pendiente editorial: cargar fichas propias del IPF dentro de Conozcamos Formosa. Los accesos nuevos están en el inicio; no se inventaron artículos para llenar categorías.

Revisión final: perfil IPF mostró Aprende e IPF Conecta y solo 1 ficha general en el catálogo actual; ninguna ficha de UNaF. Se cerró sesión y se retiró la cuenta técnica. Captura guardada en outputs/Forbook_Accesos_IPF.jpg.

## Experimento visual — dirección editorial

Estado: aplicado para evaluación del usuario; reversible, sin reemplazar la lógica del producto.

- React y CSS convencional, sin Tailwind ni dependencias nuevas. `frontend/src/editorial.css` se importa al final desde `main.jsx`, por lo que permite retirar el experimento de forma puntual.
- Composición con grilla de 12 columnas, alineaciones escalonadas, imagen desplazada y título superpuesto a su área. En móvil se conserva la asimetría por sangrías y encuadre, sin forzar columnas estrechas.
- Tipografía: Georgia (serif disponible en el sistema, con fallback) para títulos y marca; DM Sans existente para lectura y formularios. No se agregó otra descarga de fuentes. Se usan títulos grandes, cursivas y diferencias claras de escala.
- Paleta terrosa: fondo lino #f3f0e7, verde bosque #254236 y detalles salvia. La bienvenida conserva modo oscuro con fondo verde profundo y texto crema.
- Botones con radios alternados, sombras desplazadas y hover breve. Se respeta prefers-reduced-motion. El foco de teclado sigue visible.
- Inicio privado: bloque de exploración dominante y perfil lateral más pequeño/desplazado. Accesos institucionales separados por líneas en lugar de tarjetas repetidas, con desfase en escritorio.
- Guía: fichas con anchos alternados y separación por líneas; detalle con tipografía editorial y fuente a un lado. Formularios modales reciben la misma tipografía y geometría.
- Se conservan autenticación, registro en dos pasos, instituciones/carreras, accesos IPF/UNaF y separación de contenidos. No se modificaron archivos del backend ni la estructura de MySQL.
- Verificación: compilación Vite aprobada (65 módulos), navegación real de ingreso/inicio/guía/detalle y logout; revisión a 1440 y 390 px sin desbordamiento horizontal; registro modal abierto y estilos de tema comprobados. Se retiró la cuenta técnica al terminar.

### Volver al diseño previo

Respaldo: `Forbook_Respaldo_Antes_Editorial.zip` en outputs del chat. Contiene las versiones anteriores de main.jsx, Layout.jsx, WelcomePage.jsx y HomePage.jsx. Restaurar esos cuatro archivos y retirar editorial.css (ya sin importación) devuelve el diseño anterior a este experimento, manteniendo las funciones institucionales. No es necesario revertir la base ni los cambios funcionales de V1.1.

### Ajuste posterior — minimalismo y color vivo

A pedido del usuario, se conserva la combinación tipográfica Georgia/DM Sans y se retira la imagen de la bienvenida (incluida su importación, por lo que ya no entra en el bundle). Se simplifica la composición a texto y acción principal; sin sombras decorativas ni bloques de paisaje.

Nueva paleta: fondo claro #f7fbf8, verde fresco #087443, texto #18382c y acento lima #d7f16b en acciones secundarias o modo oscuro. La paleta se aplica a la bienvenida, formularios y estilos de pantallas privadas; se mantienen los accesos institucionales y las reglas de filtrado.

Se redujeron los radios irregulares a bordes discretos de 8 px en botones/campos. Compilación aprobada (64 módulos), revisión de escritorio y móvil a 390 px sin desbordamiento y apertura del registro en modo oscuro comprobadas. No hubo cambios funcionales ni de datos.

Respaldo de esta iteración: Forbook_Respaldo_Editorial_Con_Imagen.zip (WelcomePage.jsx y editorial.css anteriores). El archivo del paisaje sigue disponible en assets para permitir revertir, pero no se muestra ni se descarga en la bienvenida actual.

### Tema compartido y evaluación de localidades

Implementado: ThemeProvider común a toda la aplicación y ThemeToggle reutilizable en cabecera pública y privada. La preferencia anterior se conserva, se aplica al inicio privado, Conozcamos Formosa, detalle, mensajes, botones, fichas y accesos institucionales, y persiste al recargar. Compilación aprobada (66 módulos). Probado en navegador el paso de bienvenida oscura a inicio privado oscuro, recarga, guía y detalle, y cambio a claro. Cuenta técnica retirada.

Localidades: investigación, sin modificar todavía el formulario ni los perfiles. Fuente oficial Georef, documentación https://www.argentina.gob.ar/georef y https://georef.argentina.apidocs.ar/operations/get-localidades-censales. Consulta https://apis.datos.gob.ar/georef/api/localidades-censales?provincia=Formosa&max=1000&orden=nombre. La respuesta consultada devolvió 89 registros censales y se guardó en outputs/Formosa_Localidades_Censales_Georef.json para revisión. No equivale a un listado de municipios ni a todos los asentamientos; antes de importar se acuerda el alcance y la categoría territorial. No deduplicar solo por nombre.

Propuesta pendiente: seleccionar provincia y localidad mediante IDs oficiales, guardar catálogo en MySQL para no depender de disponibilidad de Georef durante el registro, filtrar localidades por provincia y validar relación en backend. Formosa continúa siendo el destino fijo; la procedencia puede ser de otra provincia o país. Los perfiles anteriores deben conservar su procedencia histórica hasta una normalización revisada.

### Procedencia controlada — localidades de Formosa

Estado: implementado para registros nuevos en esta versión. Alcance territorial: únicamente Formosa, con los 89 registros de localidades censales de la consulta Georef guardada el 03/11/2026. No se afirma que sea una lista de todos los asentamientos o parajes; es el catálogo censal acordado para esta iteración.

- El paso 2 del registro reemplaza la procedencia escrita por búsqueda y selección de localidad. La búsqueda encuentra nombre o departamento, sin exigir tildes, y las opciones se agrupan por departamento. Lo escrito en el buscador solo filtra: no se guarda como procedencia.
- El nuevo endpoint público `GET /api/origin-localities` consulta MySQL y devuelve solo provincia 34 (Formosa). El registro envía `originLocalityId` como cadena con el código oficial, nunca un nombre libre.
- Nuevo modelo/tabla `Locality`/`localities`: ID oficial de ocho caracteres, nombre, provincia, departamento, fuente y fecha de revisión. Los datos quedan versionados en backend/seeders/data/formosa-localities.json. No se consulta Georef durante el registro, por lo que una caída del servicio externo no afecta las opciones disponibles.
- Migración aditiva `004-origin-localities`: tabla nueva y columna nullable users.origin_locality_id, con clave foránea. No se modificaron migraciones ya aplicadas ni se borraron datos.
- El backend exige una localidad existente de Formosa y genera la procedencia visible a partir del nombre canónico. Se conserva users.origin como texto histórico/snapshot para mostrar el perfil y mantener compatibilidad. Las cuentas anteriores conservan su procedencia, incluso si es de otra provincia, con ID nulo; no se les asigna una localidad automáticamente.
- Seed con findOrCreate por código oficial; reejecutar no duplica registros ni sobrescribe cuentas. Las provincias y países restantes se mantienen fuera de esta iteración.
- Pruebas: compilación frontend aprobada (66 módulos); 12 pruebas SQL aprobadas sin omisiones. Se comprueban rechazo de localidad inexistente, dato territorial inconsistente y texto libre, catálogo limitado a Formosa, ID y nombre canónico guardados, y conservación del origen histórico. Las pruebas también siguen comprobando sesiones, contenido y separación por institución.
- Navegador: 89 opciones verificadas, búsqueda sin coincidencias, búsqueda sin tilde para Pirané, selección de carrera IPF, registro completo y recuperación de Pirané, Formosa al recargar. Se retiró la cuenta técnica al terminar. Migración y seed reejecutados sin duplicados.
- Para otra copia: ejecutar npm run db:migrate y npm run db:seed en backend, actualizar frontend y reiniciar API si no está en modo watch. El contrato de registro deja de aceptar origin libre.

Fuente del snapshot: https://apis.datos.gob.ar/georef/api/localidades-censales?provincia=Formosa&max=1000&orden=nombre . Fecha de consulta: 03/11/2026.
Respaldo previo: Forbook_Respaldo_Antes_Localidades.zip en outputs del chat. Para revertir, restaurar el código previo; la tabla y la columna nuevas pueden permanecer sin uso para preservar datos, sin necesidad de eliminarlas.
