# Diseño de Forbook

Guía corta del sistema visual del frontend: colores, tipografías, componentes y dónde está cada cosa.

## Colores

Los colores salen de variables CSS en `frontend/src/styles/tokens.css`. El modo oscuro solo cambia esos valores (`:root[data-theme='dark']`), así que los componentes no necesitan estilos aparte.

| Variable | Claro | Uso |
|---|---|---|
| `--primary` | `#2447d6` | Botones principales, marca y bandas azules. |
| `--mint` | `#bdebd5` | Etiquetas "Disponible" y "Fuente oficial", avatar. |
| `--yellow` | `#ffd84d` | Etiqueta "Opinión o experiencia", llamado final, pasos. |
| `--tint` | `#c9d6ff` | Etiqueta "Comunitaria verificable" e íconos. |
| `--ink` | `#0e1a3f` | Texto principal. |
| `--ink-2` / `--ink-3` | `#3f4a70` / `#4a5578` | Texto secundario y textos chicos. |
| `--bg-soft` | `#eef2ff` | Fondo de secciones alternadas. |

Todos los textos cumplen un contraste de al menos 4.5:1 en los dos modos.

## Tipografías

- **Bricolage Grotesque** para títulos (`--font-display`).
- **Nunito Sans** para el resto del texto (`--font-body`).

Se instalan con npm (`@fontsource-variable/...`) y se sirven desde el mismo proyecto: no dependen de Google Fonts ni de internet para verse bien.

## Archivos de estilos

| Archivo | Contenido |
|---|---|
| `styles/tokens.css` | Variables de color, tipografía y radios (claro y oscuro). |
| `styles/base.css` | Texto, enlaces, foco, botones, etiquetas, campos y estados de carga/error/vacío. |
| `styles/layout.css` | Cabecera, menú del celular y pie. |
| `styles/landing.css` | Bienvenida (`/`). |
| `styles/access.css` | Ventana de ingreso y registro. |
| `styles/pages.css` | Mi inicio, Conozcamos Formosa, detalle y 404. |

## Componentes y clases

- Botones: `btn` más una variante: `btn-primary`, `btn-outline`, `btn-light` (sobre azul) o `btn-navy` (sobre amarillo). Tamaños: `btn-small` y `btn-large`.
- Etiquetas de fuente: `badge-official`, `badge-community` y `badge-experience`. Los nombres que ve el usuario están en `src/utils/content.js`.
- "Próximamente": `badge-soon` (o `badge-on-band` sobre fondo azul).
- Filtros: `chip` con `aria-pressed` para marcar el elegido.
- Íconos: `src/components/Icons.jsx`. Son decorativos; el texto del botón da el significado.

## Pantallas

- **Bienvenida (`/`)**: muestra lo que ya funciona (Conozcamos Formosa e inicio personalizado) y, con la etiqueta "Próximamente", el mapa, las comunidades, las preguntas, la guía y los puntos.
- **Ingreso y registro**: se abren en una ventana superpuesta desde "Ingresar" y "Crear cuenta", arriba a la derecha. `/ingresar` y `/registro` siguen funcionando y abren la misma ventana.
- **Mi inicio, Conozcamos Formosa y detalle**: mismas funciones del sprint, con el diseño nuevo.

En celular (hasta 900 px) los enlaces pasan a un menú. Se revisó sin desborde horizontal a 390 px y a 320 px.
