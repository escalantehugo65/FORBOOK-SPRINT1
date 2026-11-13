# Actualización del mapa y registro — 10 de noviembre de 2026

## Cambios solicitados

Se incorporan los seis lugares y las coordenadas aportadas por el usuario. Se limita el catálogo público de instituciones y los registros nuevos a Instituto Politécnico Formosa (IPF) y Universidad Nacional de Formosa (UNaF). No se modificó GitHub ni se creó develop.

Las cuentas existentes vinculadas a otros institutos mantienen acceso y sus datos. Esas instituciones y carreras no se borran de bases existentes; simplemente no se ofrecen para crear cuentas nuevas. La investigación de 49 sedes/anexos se conserva como material futuro, pero su carga está desactivada. Una instalación nueva contiene 2 instituciones y 38 carreras, además de los catálogos completos de países y localidades nacionales.

## Lugares incorporados

| Lugar | Categoría | Latitud aportada | Longitud aportada | Referencia |
|---|---|---:|---:|---|
| Instituto Politécnico Formosa | Instituciones | -26.079850910538635 | -58.277149903047906 | [Google Maps](https://maps.app.goo.gl/niTe8sPpV8FbY6to8) |
| Universidad Nacional de Formosa (UNaF) | Instituciones | -26.192002006073857 | -58.20026643372593 | [Google Maps](https://maps.app.goo.gl/n6kV8qgcebBVWT8SA) |
| Hospital Interdistrital Evita | Salud | -26.180464223743453 | -58.19786309750135 | [Google Maps](https://maps.app.goo.gl/YbSNr9g9JUp2ZKZ96) |
| Comisaría Seccional Tercera | Seguridad | -26.173694802166008 | -58.17709957420845 | [Google Maps](https://maps.app.goo.gl/9q6ARj213WZCxjJ78) |
| Registro Civil 2da Sección | Trámites | -26.176448191596958 | -58.175726354847235 | [Google Maps](https://maps.app.goo.gl/ugoAgYtYipttzNhG8) |
| Casita del Estudiante | Servicios | -26.194703087310458 | -58.20094207790234 | [Google Maps](https://maps.app.goo.gl/PKY97wKWwih8Mt356) |

Los identificadores de IPF y UNaF se resuelven por el nombre canónico de la institución en SQL; no se asumen números fijos.

## Alcance de la comprobación

Se abrieron las redirecciones de los enlaces de Maps: cinco llevan a fichas con los nombres indicados; el enlace de Casita del Estudiante lleva a la dirección José María Uriburu 3435, sin confirmar el servicio por nombre. Los pines de las redirecciones no coinciden exactamente con las coordenadas aportadas: hay desplazamientos de decenas de metros. Se conservaron las coordenadas del usuario, sin sustituirlas por el centro del pin ni afirmar que sean entradas verificadas de edificios.

La base almacena coordenadas a seis decimales según el esquema existente; el archivo JSON conserva el aporte original. La fecha es de revisión/carga, no una certificación de actividad actual.

Todos estos puntos se identifican como referencias comunitarias, con el enlace original de Google Maps. No se afirma que sean fuentes oficiales. No se agregan horarios, teléfonos, acceso a guardia, gratuidad, entrega de mercadería ni prestaciones sanitarias sin otra confirmación. Casita del Estudiante tiene una descripción general para consultar requisitos y prestaciones con el lugar.

No se inventan direcciones de calle que el usuario no proporcionó; el mapa y el enlace sirven como referencia. Falta completar domicilios textuales y, si corresponde, entradas de estudiantes. Las paradas y líneas de colectivos todavía no se aportaron en este lote y no se crean rutas automáticamente a partir de estos puntos.

## Aplicar a la copia que ya estabas usando

1. Detené frontend y backend con Ctrl+C. Guardá una copia de respaldo de la base actual.
2. Extraé este ZIP en otra carpeta. Conservá tu carpeta anterior.
3. Copiá tus archivos locales backend/.env y frontend/.env a la carpeta nueva. No los compartas ni los subas a GitHub.
4. Desde la raíz nueva, ejecutá uno por uno:

```powershell
npm run install:all
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev --prefix backend
```

5. En otra terminal desde la misma raíz:

```powershell
npm run dev --prefix frontend
```

6. Abrí http://localhost:5173. En el mapa deberían aparecer seis referencias de este lote. Para una instalación nueva, seguí INICIAR.md y el comando configurar:local.

No se necesita una nueva migración de estructura: el cambio utiliza las tablas y columnas existentes. Es importante ejecutar db:seed; migrar por sí solo no carga los nuevos puntos.

## Actualización segura de datos existentes

- Los lugares se identifican por slug, para que repetir la carga no duplique registros.
- Se completa el punto unaf-campus anterior solo si conserva exactamente sus datos iniciales sin ubicación ni modificaciones de administración. En ese caso pasa a usar las coordenadas aportadas y la referencia comunitaria.
- El antiguo punto unaf-rectorado inicial, sin coordenadas y sin cambios, pasa a borrador para dejar un solo punto de campus UNaF. No se elimina.
- Se conservan ubicaciones personalizadas, contenidos ocultos, cambios de fuente, notas y otras ediciones previas de administración. Si hay puntos personalizados adicionales, pueden seguir apareciendo además de los seis del lote.
- Las cuentas de instituciones retiradas del registro siguen funcionando. El backend rechaza intentar registrarse con sus identificadores, aunque se modifique manualmente la petición.

## Validación

- 36 pruebas backend aprobadas con SQL real, 0 fallidas y 0 omitidas.
- 4 pruebas frontend aprobadas y compilación de producción correcta.
- Prueba específica de carga de seis puntos, coordenadas redondeadas, fuente comunitaria, actualización del campus previo, ocultación del rectorado inicial, repetición sin duplicados y conservación de una edición de administración.
- Prueba de que el catálogo devuelve solo UNaF/IPF, se rechazan registros en otro instituto y una cuenta histórica de ese instituto puede seguir iniciando sesión.
- Dos ejecuciones de db:seed en una base nueva: 2 instituciones, 38 carreras, 6 lugares.
- Revisión en navegador: seis marcadores visibles y contador “6 de 6 en el mapa”; filtro Salud con “1 de 1 en el mapa”. La sesión sintética de revisión se cerró y la cuenta de prueba no forma parte del ZIP.

Las funciones restantes de la unión se conservan. Las propuestas de simplificar puntos, espacios o tarjetas de bienvenida todavía no se aplicaron: solo se ejecutaron el mapa y la reducción de instituciones que fueron autorizados.
