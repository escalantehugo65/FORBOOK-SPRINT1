# Informe de verificación — 20/10/2026

## Ejecutado

- Node.js 24.16.0 y MySQL Community Server 8.0.45 en Windows.
- MySQL aislado dentro de la carpeta de trabajo, sin usar ni modificar las bases preexistentes del equipo.
- Migración inicial aplicada y reejecutada: segunda ejecución sin cambios.
- Seed ejecutado dos veces: instituciones, categorías y contenidos sin duplicados.
- **11 pruebas aprobadas, 0 fallidas y 0 omitidas** con base de pruebas MySQL configurada. La suite se ejecutó nuevamente después de endurecer validación de IDs y comprobar recuperación HTTP entre instancias.
- Build de producción Vite aprobado: 58 módulos transformados.
- Auditoría npm: 0 vulnerabilidades reportadas en backend y frontend al instalar/verificar esta entrega. El backend utiliza un override transitivo de uuid documentado en Arquitectura.
- Arranque real de la API y Vite junto a la base aislada comprobado en los logs.

No se declara revisión visual aprobada: el navegador de la herramienta no pudo acceder a los puertos locales y devolvió timeout. El CSS contiene reglas adaptables, pero la inspección visual de escritorio/móvil y la navegación completa mediante el navegador quedan pendientes. Tampoco se declara revisión por otro integrante ni aceptación formal del Sprint.

## Qué verifican las pruebas SQL

1. Recursos privados sin cookie devuelven 401; mutaciones sin origen permitido devuelven 403.
2. Registro no acepta rol administrativo, institución inexistente ni contraseña corta.
3. Registro crea usuario SQL, hash válido, rol estudiante y cookie HttpOnly/SameSite; la respuesta excluye el hash; el correo repetido devuelve 409.
4. `/auth/me` recupera perfil e institución. Otra instancia Express con otro adaptador y la misma cookie recupera el mismo usuario desde MySQL.
5. Listado por categoría devuelve solo publicados; categoría vacía devuelve lista vacía; detalle inexistente y borrador devuelven 404; filtro inválido devuelve 400.
6. Logout invalida acceso a recursos privados. Login incorrecto informa lo mismo para correo inexistente y contraseña equivocada. Login correcto recupera sesión; ambos estados de llegada se reflejan en el perfil.
7. Sesión con vencimiento SQL pasado devuelve 401.

Cuatro pruebas adicionales verifican normalización, contraseña sin recorte, rechazo de cuerpos/campos inesperados, validaciones y límites de identificadores, incluyendo arrays y entradas de inyección.

## Reproducción

Seguí README para configurar una base terminada en `_test` y ejecutar `npm test` dentro de backend. Sin `TEST_DB_NAME` se ejecutan cuatro pruebas unitarias y la integración aparece como omitida; eso no equivale a haber probado SQL.

La base de pruebas debe ser exclusiva. La suite crea datos ficticios identificados y los elimina al terminar. Las bases de aplicación y pruebas están separadas.

## Matriz manual antes de declarar Done

| Área | Escenario y resultado esperado |
|---|---|
| Bienvenida | Se entiende el público y destino; registro e ingreso navegan. |
| Registro | Todos los campos etiquetados; vacío, email inválido, contraseña inválida e institución no seleccionada impiden continuar. |
| Registro válido | Cuenta propia creada en MySQL; inicio muestra esos datos sin hashes. |
| Catálogo | Si falla la API o está vacío el catálogo de instituciones, se informa y no se envía un registro incompleto. |
| Login | Carga visible, botón bloqueado mientras procesa, error comprensible y navegación solo después del éxito. |
| Recuperación | Recargar en `/inicio` o detalle mantiene acceso con cookie válida; no hay contenido privado mientras se comprueba. |
| Red | Cortar la API durante comprobación muestra fallo y reintento, no mensaje de credenciales incorrectas. |
| Inicio | Probar perfiles `arrived` y `not_arrived`; texto y datos académicos corresponden al perfil. |
| Sin contenido institucional | La guía general sigue disponible y el inicio no promete una recomendación inexistente. |
| Exploración | Seleccionar cada categoría; verificar resultados, estados vacíos y filtros en la URL. |
| Detalle | Fuente, revisión y tipo visibles; abrir fuente oficial en pestaña nueva. Verificar ausencia de fecha sin inventarla. |
| Errores | ID inexistente, ruta desconocida, error interno y desconexión no dejan la pantalla sin explicación. |
| Logout | Destruye sesión; volver con el navegador y recargar no restaura recursos privados. Si falla el logout, se informa. |
| Adaptación | Revisar 390, 768 y 1440 px: sin desbordamiento, campos y navegación utilizables. |
| Accesibilidad | Recorrer con Tab, comprobar foco visible, etiquetas, enlace para saltar al contenido y lectura de errores. |
| Publicación | Solo se muestran contenidos publicados; no se confunden pruebas ni borradores con datos oficiales. |

La revisión visual, fallos de red en navegador y accesibilidad necesitan ejecución manual o una futura suite de navegador. No se presentan como escenarios ya aprobados.
