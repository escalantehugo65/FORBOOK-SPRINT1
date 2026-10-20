# Cómo funciona Forbook

Esta guía acompaña la implementación completa. Podés recorrerla en este orden y estudiar una tarea pequeña por vez. No hace falta comprender todos los archivos al mismo tiempo.

## 1. Dos programas y una base de datos

El navegador ejecuta React. Node.js ejecuta Express en el servidor. MySQL conserva los datos aunque se cierre el navegador. Sequelize es un ORM: permite describir tablas y relaciones con JavaScript y ejecutar operaciones SQL mediante modelos.

No son tres copias de los mismos datos. React mantiene lo necesario para presentar una pantalla; la información persistente y la validación real viven en el servidor y la base.

`app.js` crea la aplicación Express; `server.js` abre el puerto con `listen`. Separarlos permite probar los endpoints sin arrancar el servidor habitual.

## 2. Componentes, props y listas

Un componente es una función que describe una parte de la interfaz. `ContentCard` recibe una ficha mediante la prop `content`. Una prop es un dato que el componente padre entrega al hijo; el hijo no debe modificar ese objeto para cambiar el estado del padre.

En ExplorePage, `.map()` transforma cada registro de la respuesta en una tarjeta. `key={content.id}` permite a React reconocer cada tarjeta entre actualizaciones. El ID es estable; un índice de posición puede cambiar al filtrar o reordenar.

Los campos y mensajes se reutilizan porque aparecen en varias pantallas. No se crearon componentes ni módulos para funcionalidades futuras.

Tarea de lectura: buscá dónde se entrega `content` a ContentCard y dónde se lee `content.title`.

## 3. Formularios controlados y useState

Un formulario controlado obtiene el valor de cada campo desde el estado de React:

```jsx
<input name="email" value={values.email} onChange={onChange} />
```

`value` indica qué mostrar. `onChange` recibe un evento cuando cambia el campo. `event.target` identifica el elemento y permite leer `name` y `value`. El hook `useState` conserva valores entre renderizados; su función de actualización solicita a React un nuevo render.

En `useForm`, `setValues(previous => ({ ...previous, [name]: value }))` conserva los demás campos y reemplaza solo el que cambió. Se crea un objeto nuevo para no modificar el estado anterior directamente. La forma funcional usa el estado más reciente.

`useForm` es un custom hook propio, no una biblioteca instalada. Comienza con `use` porque utiliza hooks de React. Recibe los valores iniciales y devuelve `values`, `onChange`, errores, su actualizador y `reset`. Evita repetir esa lógica en registro y login.

Al enviar, `event.preventDefault()` evita que el navegador ejecute el envío HTML tradicional y recargue la página. Así React puede validar y enviar JSON con fetch. Sin ese control, una recarga podría interrumpir la experiencia.

Los atributos HTML `required`, `type="email"`, `minLength` y `maxLength` ayudan al usuario. Las validaciones de JavaScript y del backend siguen siendo necesarias: cualquier persona puede enviar solicitudes sin usar el formulario.

## 4. Qué viaja por HTTP

HTTP es el protocolo de mensajes entre cliente y servidor. Una URL identifica el recurso: por ejemplo `http://localhost:3001/api/contents/1` contiene protocolo, host, puerto y ruta.

- GET consulta datos. Los filtros se envían en la URL después de `?`.
- POST solicita una operación, como crear una cuenta o autenticar.
- Los headers describen características del mensaje. `Content-Type: application/json` indica cómo interpretar el cuerpo; `Origin` identifica el origen del navegador.
- El body es el contenido de la solicitud. Para un registro incluye los campos del formulario, no un objeto React completo.
- `JSON.stringify(values)` convierte el objeto JavaScript a texto JSON. No cifra ni protege por sí mismo: en producción necesitamos HTTPS.

`request()` centraliza la URL y la configuración. La URL base procede de `import.meta.env.VITE_API_URL`. Vite sustituye estas variables al construir el frontend; todo dato `VITE_` debe considerarse público. Las credenciales MySQL y el secreto de sesión solo existen en el backend.

`fetch()` devuelve una promesa. `await` permite esperar su resultado sin bloquear el hilo como una espera activa. El objeto `Response` contiene estado HTTP, headers y acceso al cuerpo; no es directamente el usuario ni la lista.

`response.ok` indica un estado entre 200 y 299. `await response.json()` interpreta el cuerpo JSON y produce un objeto JavaScript. Si el servidor responde 400 o 500, fetch normalmente resuelve con una Response: hay que comprobar `ok`. Un fallo de red rechaza la promesa sin esa respuesta. Forbook distingue ambos casos y muestra mensajes comprensibles.

El hook `useFetch` controla carga, resultado y error para consultas asociadas a una pantalla. Cancela consultas al desmontar mediante AbortController. Los POST de los formularios se ejecutan desde el evento de envío, no automáticamente desde useFetch.

## 5. Express recibe la solicitud

Este es el recorrido completo de registro:

1. Usuario escribe en AuthPage.
2. El evento actualiza el estado de useForm.
3. El envío llama a `register` del contexto y al servicio.
4. El cliente HTTP serializa el body y realiza POST.
5. Express comprueba origen, tamaño y JSON.
6. La ruta selecciona el controlador.
7. El controlador valida el cuerpo y consulta la institución.
8. bcryptjs crea el hash; Sequelize inserta el usuario en MySQL.
9. Se regenera y guarda la sesión SQL.
10. El controlador devuelve 201 y el perfil público.
11. El servicio interpreta la respuesta.
12. El contexto actualiza el usuario.
13. React Router navega al inicio y React muestra su perfil.

`req.body` contiene el JSON interpretado; `req.params.id` obtiene el segmento dinámico de `/contents/:id`; `req.query.categoryId` obtiene un filtro de URL. Ninguno de ellos debe considerarse confiable sin validación.

Un middleware es una función que participa en el recorrido de la petición. `next()` entrega el control al siguiente middleware o controlador. `next(error)` lleva el fallo al manejador de errores. Si un middleware responde, no debe continuar y volver a responder.

La restricción única de correo en MySQL es indispensable: dos solicitudes simultáneas podrían superar una comprobación previa. La base impide crear el duplicado y el servidor lo transforma en 409.

## 6. Autenticación, autorización y sesión

Autenticar responde “¿quién sos?”. Autorizar responde “¿podés consultar este recurso?”. El login verifica la contraseña mediante `bcrypt.compare`; no intenta recuperar una contraseña original desde el hash.

Una cookie es un dato que el navegador guarda y envía según su dominio, ruta y otras reglas. La cookie Forbook contiene un identificador opaco firmado. La firma detecta modificaciones; no debe interpretarse como cifrado de datos privados. No contiene la contraseña ni el perfil completo.

HttpOnly impide que JavaScript lea la cookie. Secure indica que solo debe enviarse mediante HTTPS; en desarrollo local HTTP está desactivado. SameSite limita en qué contextos entre sitios se envía. La configuración actual presupone frontend y API dentro del mismo sitio.

El backend guarda una fila SQL de sesión con `userId`, datos técnicos de cookie y vencimiento. Al recibir la cookie, express-session verifica la firma y consulta el almacén. La API rechaza sesiones ausentes o vencidas.

`credentials: "include"` permite a fetch enviar y recibir cookies cuando la API está en otro origen. No permite leer cookies HttpOnly ni evita las reglas del navegador.

Al arrancar React, AuthProvider ejecuta `me()` desde `useEffect`. El efecto sincroniza la aplicación con un sistema externo después del render. Primero se muestra carga; luego usuario, acceso público o error de conexión. Un error de red no se convierte automáticamente en “no estás autenticado”.

El contexto permite que navegación, guardas e inicio compartan el mismo usuario. Los valores del formulario no necesitan Context: son locales y no interesan a toda la aplicación.

Al cerrar sesión, Express elimina la fila SQL y limpia la cookie. Solo después del éxito React elimina su usuario. Si falla el cierre, se informa y se permite reintentar. Borrar únicamente el estado de React dejaría la sesión del servidor activa.

Una recarga pierde el estado en memoria de React, pero recupera el usuario con la cookie. Reiniciar el servidor no destruye las sesiones SQL vigentes; cambiar el secreto o borrar las sesiones sí invalida el acceso.

## 7. CORS y orígenes

Un origen combina protocolo, host y puerto. `http://localhost:5173` y `http://localhost:3001` son orígenes diferentes. También lo son `localhost` y `127.0.0.1`.

El navegador restringe qué respuestas puede usar un script de otro origen. Express configura CORS para permitir el frontend exacto y las credenciales. Un wildcard no es adecuado para respuestas con cookies. Los POST JSON pueden provocar una solicitud previa OPTIONS; el middleware CORS la responde.

CORS controla el acceso del navegador a respuestas; no es un sistema de autenticación y no impide por sí mismo todos los envíos. Por eso el backend también verifica Origin en las mutaciones y exige JSON.

## 8. Entorno, dependencias y scripts

`dotenv` carga backend/.env al iniciar. Sequelize recibe host, puerto, base, usuario y contraseña; `authenticate()` verifica conexión. Las tablas no se crean silenciosamente al iniciar el servidor: primero se aplican migraciones.

`dependencies` contiene paquetes requeridos por la aplicación. `devDependencies` contiene herramientas de desarrollo o pruebas. El frontend transforma su código con Vite antes de desplegarlo.

`npm install` descarga dependencias y conserva versiones exactas en package-lock.json. `npm ci` reproduce ese lock en una instalación limpia. `npm run dev` ejecuta el script de desarrollo; no instala paquetes. Backend usa node --watch; frontend usa Vite. Ambos necesitan terminales o procesos propios.

El build crea frontend/dist. `npm run preview` permite revisar ese build localmente, pero cambia el puerto habitual: si lo usás, ajustá el origen permitido del backend o ejecutá preview en 5173. Un servidor de desarrollo no es el despliegue de producción.

## 9. Interpretar errores

| Código | Uso en Forbook |
|---|---|
| 200 | Consulta u operación completada. |
| 201 | Cuenta creada. |
| 400 | Datos o filtros inválidos. |
| 401 | Credenciales incorrectas o falta de sesión. |
| 403 | Origen de mutación no permitido; en futuras funciones, falta de permiso. |
| 404 | Ruta o contenido no disponible. |
| 409 | Correo ya registrado. |
| 500 | Fallo interno; el navegador recibe un mensaje sin detalles sensibles. |

Si falla el almacenamiento de sesión después de crear la cuenta, la API devuelve 201 con `sessionStarted: false`: informa que la cuenta existe y dirige al login. No pide registrarse de nuevo y provocar un duplicado.

## 10. Cómo continuar aprendiendo

Primero recorré bienvenida y registro. Después seguí una petición en la pestaña Network del navegador y compará sus campos con el controlador. Luego estudiá login y sesión. Recién después revisá categorías y asociaciones.

Para probar con Thunder Client, enviá `Origin: http://localhost:5173` y `Content-Type: application/json` en los POST, y conservá la cookie entre peticiones. No pegues contraseñas reales en capturas ni commits.
