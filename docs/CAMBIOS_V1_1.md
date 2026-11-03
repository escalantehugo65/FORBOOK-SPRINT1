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
