# Integración de ScummVM en DOSVault

Este paquete agrega un segundo motor de emulación al proyecto, pensado para
aventuras gráficas: **ScummVM**. A diferencia de js-dos (que emula la PC
completa vía DOSBox y corre el `.EXE` original), ScummVM reimplementa el
motor del juego de forma nativa — no hay DOS de por medio, se le dan los
archivos de datos crudos del juego y él los auto-detecta.

Esta versión del paquete ya está verificada contra el build real generado
por `.github/workflows/build-scummvm.yml` (no son suposiciones genéricas de
"así funciona Emscripten normalmente" — se inspeccionó el `scummvm.js` y
`scummvm.html` reales que produjo tu Action).

## Cómo funciona

ScummVM corre en un **iframe** apuntando a `js/vendor/scummvm/launcher.html`,
no inyectado directo en el DOM de tu página principal. Es así por una razón
concreta: el propio `scummvm.wasm` hace `fetch()` de rutas relativas como
`data/gui-icons.dat`, y esas rutas se resuelven contra la URL de la página
que lo carga — no contra la carpeta del script. Metiendo todo (launcher,
scummvm.js/wasm, data/) en una única carpeta y cargándola como página propia
en un iframe, esas rutas siempre caen bien sin importar cómo esté organizado
el resto del sitio.

`launcher.html` recibe el juego a lanzar por query string
(`?bundle=<url-del-zip>`), descarga ese `.zip`, lo descomprime en el
navegador con fflate, monta los archivos en `/game` dentro del filesystem
virtual de ScummVM, y lo arranca directo en ese juego (sin pasar por su
launcher gráfico) vía el argumento `--auto-detect --path=/game`.

Cerrar la ventana del juego en DOSVault simplemente saca el iframe del DOM
— eso mata la instancia completa (audio incluido) sin necesitar ninguna
función de salida especial.

## Pipeline completo, paso a paso

### 1. Compilar ScummVM a WebAssembly

Ya lo hiciste: corriste `.github/workflows/build-scummvm.yml` desde la
pestaña Actions de tu repo y bajaste `scummvm-wasm.zip` (31MB) del Release.

### 2. Vendorizar el build en el sitio

1. Descomprimí `scummvm-wasm.zip`. Vas a ver algo así:
   ```
   data/            (carpeta con .dat, .zip de temas, plugins/*.so, etc.)
   doc/
   scummvm.js
   scummvm.wasm
   scummvm.html     (no se usa — DOSVault tiene su propio launcher.html)
   favicon.ico, logo.svg, manifest.json, scummvm-*.png  (tampoco se usan)
   ```
2. Copiá **`data/`**, **`scummvm.js`** y **`scummvm.wasm`** a
   `js/vendor/scummvm/` en tu repo del sitio (creá esa carpeta si no existe).
3. De este paquete, copiá también a esa misma carpeta:
   - `js/vendor/scummvm/launcher.html`
   - `js/vendor/scummvm/fflate.min.js`

   Al final, `js/vendor/scummvm/` en tu repo debe tener: `data/`,
   `scummvm.js`, `scummvm.wasm`, `launcher.html`, `fflate.min.js`. (El resto
   de lo que trae el zip del Release — `doc/`, `scummvm.html`, los íconos,
   `manifest.json` — no hace falta, podés no copiarlo.)

### 3. Sumar los archivos de código de este paquete

Copiá al repo:
- `js/scummvm-engine.js` (nuevo — reemplaza cualquier versión anterior que
  hayas subido de un intento previo)
- `js/app.js` (reemplaza al actual — ya tiene la rama para `engine:"scummvm"`
  integrada, el resto del archivo es idéntico a tu versión productiva 1.1)
- `index.html` (reemplaza al actual — el único cambio real es una línea
  `<script src="js/scummvm-engine.js"></script>` antes de `app.js`)
- Contenido de `css/style-additions.css` → pegalo al final de tu
  `css/style.css` actual (no lo reemplaces entero, solo agregá ese bloque)

### 4. Empaquetar un juego para ScummVM

A diferencia de un `.jsdos`, acá **no** armás un zip con `.jsdos/dosbox.conf`.
El bundle es directamente un `.zip` con los archivos de datos del juego tal
cual los detecta ScummVM (por ejemplo, para un juego SCUMM: `000.LFL`,
`DISK01.LEC`, etc.; para un juego Sierra SCI: `RESOURCE.MAP`,
`RESOURCE.001`, etc.). Si tenés el juego instalado o su CD, esos son
justamente los archivos que hay en esa carpeta — no hace falta instalador ni
autoexec.

1. Metés todos los archivos de datos del juego en una carpeta.
2. La comprimís en zip (`zip -r kq1sci.zip .` parado adentro de esa carpeta,
   igual que ya hacías para los bundles de js-dos, pero sin la carpeta
   `.jsdos/`).
3. La subís a tu bucket de R2 (mismo lugar que los `.jsdos`).
4. Agregás la entrada en `data/games.json` con `"engine": "scummvm"` — ver
   `data/games.json.example` en este paquete para el formato exacto.

Motores incluidos en este build (van a auto-detectar juegos de estas
franquicias/formatos): SCUMM (LucasArts: Monkey Island, Indy, Full Throttle
temprano...), SCI (Sierra: King's Quest, Space Quest, Gabriel Knight...),
AGI (Sierra clásico: King's Quest I-III, Leisure Suit Larry 1...), AGOS
(Simon the Sorcerer), Beneath a Steel Sky, Flight of the Amazon Queen,
Drascula, Lure of the Temptress, Gobliiins, Bud Tucker, Touché, Cruise for a
Corpse, Broken Sword-style Cine engine, Kyrandia, Nippon Safes (Parallaction).

### 5. Probar

Abrí el sitio, entrá al juego. `launcher.html` muestra su propio estado de
carga (barra de progreso / texto) dentro de la ventana mientras descarga y
monta los datos. Si algo falla, mirá la consola del navegador — los logs de
ScummVM van prefijados, y `launcher.html` también imprime el motivo si no
pudo bajar o montar el bundle.
