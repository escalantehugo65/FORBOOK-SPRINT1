> Esta entrega actualiza la unión: solo UNaF/IPF en registros nuevos y seis ubicaciones en el mapa. El detalle vigente está en docs/MAPA_Y_REGISTRO.md.

# Probar Forbook unificado con XAMPP

Esta copia une la entrega de diseño nuevo y registro nacional/internacional con Rama-Gonzalo2 y rama-laurato. No reemplaza tu carpeta original. Incluye frontend, backend, migraciones y catálogos locales; no incluye cuentas, bases de datos, contraseñas, node_modules ni archivos .env.

## Primera ejecución

1. Extraé el ZIP completo en una carpeta nueva. Abrí esa carpeta en VS Code. La terminal debe estar donde están este archivo y package.json. Usá Node 24.15 o posterior de la rama 24 LTS (se probó con Node 24.16). Las pruebas también admiten Node 22.22.2 o posterior de la rama 22.
2. En XAMPP, iniciá MySQL. Para usar phpMyAdmin, iniciá también Apache. Los servidores de Forbook se ejecutan con Node.
3. Instalá las dependencias y creá la configuración para tu XAMPP local, con root sin contraseña:

```powershell
npm run install:all
npm run configurar:local
```

El segundo comando genera un secreto aleatorio de sesión sin mostrarlo y crea los .env solo si no existen. Usa la base nueva `forbook_final_prueba` para probar esta entrega de forma separada. Si tu MySQL tiene otra contraseña o puerto, editá backend/.env antes de continuar.

4. En phpMyAdmin, pestaña SQL, ejecutá:

```sql
CREATE DATABASE IF NOT EXISTS forbook_final_prueba
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. En la terminal de VS Code, desde la raíz del proyecto, prepará la base e iniciá el backend:

```powershell
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev --prefix backend
```

Dejá esa terminal abierta. Comprobación: http://localhost:3001/api/health.

6. Abrí una segunda terminal, también en la raíz, e iniciá el frontend:

```powershell
npm run dev --prefix frontend
```

7. Abrí **http://localhost:5173**. Usá localhost, como en FRONTEND_URL. Probá Crear cuenta → paso 2 → provincia y localidad; después “No soy de Argentina” → país. También podés buscar instituciones por nombre o localidad.

## Las próximas veces

Iniciá MySQL en XAMPP. Desde la raíz del proyecto, en dos terminales:

```powershell
npm run dev --prefix backend
```

```powershell
npm run dev --prefix frontend
```

Abrí http://localhost:5173. Detené cada servidor con Ctrl+C. Si el puerto está ocupado por tu otra copia de Forbook, detené primero aquella copia.

## Si querés usar tu base anterior

Primero hacé una copia de respaldo de esa base. Configurá su nombre en DB_NAME de backend/.env y ejecutá db:migrate y db:seed. No ejecutes una base anterior con el backend anterior y el nuevo a la vez. La migración 005 agrega columnas sin borrar cuentas; las procedencias históricas conservan su texto. No se cambia el nombre de IPF ni UNaF, para conservar sus vínculos y accesos.

## Qué incluye y qué falta confirmar

- 4.027 localidades **censales** de las 24 jurisdicciones, según la descarga nacional completa de Georef. No equivale a un inventario de todos los parajes/asentamientos o barrios.
- 249 países/territorios ISO 3166-1. Argentina está en el circuito nacional; el selector exterior ofrece los otros 248, con nombres en español.
- Solo UNaF e IPF como opciones para nuevas cuentas. Las cuentas previas de otros institutos se conservan. La investigación de los demás institutos queda archivada para futuras versiones.
- 38 carreras de referencia de UNaF/IPF en una instalación nueva. El catálogo no implica inscripción abierta.
- Cuando una institución no tiene carreras cargadas, el registro permite continuar y guarda “Carrera pendiente de catálogo”. Si tiene carreras cargadas, hay que elegir una de su lista. No existe campo de carrera libre.
- El detalle de instituciones, fuentes y pendientes está en docs/INSTITUCIONES_FORMOSA.md. Las diferencias y la validación están en docs/INTEGRACION_FINAL.md.

## Verificación

```powershell
npm run build
npm test --prefix frontend
npm test --prefix backend
```

El backend omite la integración SQL si TEST_DB_NAME no está configurada. Para ejecutarla, creá una base exclusiva cuyo nombre termine en `_test` y configurá TEST_DB_NAME, TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER y TEST_DB_PASSWORD en esa terminal. Nunca uses la base de tus alumnos para pruebas. No se incluyen usuarios de demostración.


## Funciones que se suman con las ramas

- Preguntas públicas, respuestas y votos “me fue útil”.
- Reportes, cola de moderación, decisiones con motivo e historial.
- Administración de categorías, fuentes y lugares del mapa según el rol.
- Mapa con filtros, colores por categoría y encuadre estable al filtrar.
- Rutas orientativas y espacios sugeridos por institución, procedencia y llegada.

El seed incorpora seis lugares con coordenadas aportadas por el usuario: IPF, UNaF, Hospital Interdistrital Evita, Comisaría Seccional Tercera, Registro Civil 2da Sección y Casita del Estudiante. Son referencias comunitarias con enlaces de Google Maps. Las rutas de colectivos siguen pendientes.

Para probar la moderación, primero creá una cuenta normal en esta copia. Luego, desde backend, asignale un rol a esa cuenta con:

```powershell
npm run user:role -- correo-de-tu-cuenta@example.com admin
```

Reemplazá ese correo por el de la cuenta de prueba que creaste. Cerrá sesión y volvé a ingresar. No se incluye ningún administrador ni contraseña predefinidos. El registro público siempre crea estudiantes.

La guía temática ampliada, puntos/tienda, sanciones públicas y chat privado no se implementan por esta unión; se conservan los avisos de “Próximamente” que corresponden.
