# Sprint 1 — trazabilidad y trabajo del equipo

## Objetivo propuesto

Permitir que un estudiante que llega a Formosa cree una cuenta, inicie sesión, acceda a un inicio contextualizado y consulte información organizada con fuente y revisión en Conozcamos Formosa.

Se implementó el alcance técnico solicitado. No se declara que el equipo haya comprometido ni cerrado formalmente un Sprint: falta validar capacidad, duración, estimaciones y revisión por otro integrante.

## Historias y evidencias

| Historia | Implementación | Evidencia automatizada |
|---|---|---|
| HU-01 | AuthPage, authController.register, validación, Usuario/Institución, bcrypt y sesión SQL. | Cuenta persistida, hash comprobado, correo duplicado, institución inválida, contraseña corta y rol prohibido. |
| HU-02 | Formulario, login, verificación de hash, cookie y actualización de Context antes de navegar. | Credenciales válidas e inválidas y mensaje común para correo inexistente. |
| HU-03 | AuthProvider, GET me, guardas React, middleware y MysqlSessionStore. | Recuperación del perfil usando la misma cookie en otra aplicación Express con el mismo almacén SQL; vencimiento. |
| HU-04 | Botón global, destrucción SQL y limpieza de cookie y contexto. | Acceso rechazado después de logout. |
| HU-06 | HomePage usa nombre, origen, institución, carrera y estado de llegada recibidos del servidor. | API devuelve ambos estados y relación institucional. Validación visual manual pendiente. |
| HU-11 | Categorías persistidas, filtros GET y listas con estados de carga/error/vacío. | Lista filtrada y categoría vacía desde MySQL. |
| HU-13 | Detalle publicado, tipo de fuente, referencia, autoría y fecha opcional. | Detalle, fecha desconocida, inexistente y borrador oculto. |

HU-06 se implementó con los criterios reducidos del pedido actual: perfil real, texto según llegada y acceso a la guía. No calcula recomendaciones ni presenta preguntas, rutas, grupos o misiones. El equipo debe reflejar este refinamiento y las dependencias actualizadas en Jira antes de comprometer la historia.

Los identificadores HU y EP son internos; Jira asigna sus propias claves. Esta entrega no modifica Jira ni elimina historias del backlog original. Las funcionalidades futuras permanecen allí.

## Dependencias y orden seguido

Entorno → modelos y migración → catálogo de instituciones → registro/login/sesiones → recuperación y protección → categorías y detalle → inicio contextualizado → integración SQL y build.

La bienvenida y el CSS son transversales. Las tareas técnicas de conexión, migraciones, seguridad y pruebas acompañan las historias; no se inventan historias de usuario para cada archivo.

## Decisiones adoptadas para construir esta entrega

- Formosa es el destino fijo; procedencia es texto libre.
- Registro con inicio de sesión automático cuando el almacén responde correctamente.
- Consultas de contenido privadas; instituciones públicas para registro.
- Sesiones SQL de 24 horas, cookie HttpOnly y sin JWT.
- Cinco categorías del pedido con nombre Movilidad; sin mapa avanzado.
- Catálogo inicial pequeño: UNaF y referencias oficiales disponibles.
- Sin panel de administración ni endpoints de escritura de contenido; carga controlada mediante seed.
- Sin fechas o autores inventados.

Son decisiones explícitas de implementación revisables; no se atribuyen al profesor ni se presentan como acuerdos previos del equipo.

## Scrum

Durante Sprint Planning, Product Owner y Developers revisan objetivo, criterios, dependencias y capacidad. Los Developers estiman y seleccionan cuánto pueden terminar. No se fijan responsables ni fechas sin el equipo. Los puntos sugeridos del backlog no se convierten en compromiso automático.

El Sprint Backlog incluye objetivo, historias seleccionadas y plan adaptable. La Daily Scrum dura como máximo 15 minutos y sirve para inspeccionar avance hacia el objetivo y adaptar el plan.

En Sprint Review se inspecciona el incremento con interesados y se analiza qué cambiar del producto. En Retrospective se revisa cómo trabajó el equipo y qué mejorar. La configuración inicial no necesita inventar un Sprint 0 como exigencia de Scrum.

Product Owner maximiza valor y gestiona el Product Backlog; Scrum Master ayuda a establecer Scrum y mejorar efectividad; Developers construyen un incremento utilizable. No se asignaron esas responsabilidades a personas concretas.

## Definition of Done

Antes de marcar una historia Done, verificar criterios acordados, integración real, persistencia SQL, validaciones, autorización, errores, carga y vacío, móvil y accesibilidad, ausencia de secretos expuestos, pruebas y revisión por otro integrante. El build y las pruebas técnicas no reemplazan revisión del equipo ni aceptación del producto.

La implementación no incluye comunidades, preguntas públicas, mensajería, IA, mapas avanzados, recorridos de colectivos, reportes, gamificación, alquileres, empleos, pagos ni eventos. Se mantienen como trabajo posterior.
