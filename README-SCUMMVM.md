# Integración de ScummVM en DOSVault

Este paquete agrega un segundo motor de emulación al proyecto, pensado para
aventuras gráficas: **ScummVM**. A diferencia de js-dos (que emula la PC
completa vía DOSBox y corre el `.EXE` original), ScummVM reimplementa el
motor del juego de forma nativa — no hay DOS de por medio, se le dan los
archivos de datos crudos del juego y él los auto-detecta.

## Por qué es distinto a agregar un juego con js-dos

No existe un paquete npm listo tipo js-dos para ScummVM. Hay que compilarlo
desde su código fuente con Emscripten (su propio proyecto trae un script
oficial para esto: `dists/emscripten/build.sh`). Por eso este paquete incluye
un workflow de GitHub Actions que hace esa compilación por vos, corriendo en
la infraestructura de GitHub (no hace falta instalar nada localmente).

## Pipeline completo, paso a paso

### 1. Compilar ScummVM a WebAssembly (una sola vez, y de nuevo si querés sumar motores)

1. Copiá `.github/workflows/build-scummvm.yml` a tu repo `dosvault`.
2. En GitHub, pestaña **Actions** → **Build ScummVM (WebAssembly)** → **Run workflow**.
   Podés dejar los valores por default (motores de aventuras clásicas: SCUMM,
   SCI, AGI, AGOS, Beneath a Steel Sky, Flight of the Amazon Queen, etc.) o
   ajustar la lista de `engines` si te falta o sobra alguno.
3. **Tarda mucho** — compilar ScummVM completo con Emscripten fácilmente lleva
   45-90+ minutos en un runner gratuito. Dejalo correr en segundo plano.
4. Cuando termine, te va a dejar un **Release** en el repo (tag
   `scummvm-wasm-v1` por default) con un archivo `scummvm-wasm.zip` adjunto.

### 2. Vendorizar el build en el sitio

1. Descargá `scummvm-wasm.zip` del Release y descomprimilo.
2. Copiá su contenido (`scummvm.js`, `scummvm.wasm`, `scummvm.data`, y lo que
   más haya generado) a `js/vendor/scummvm/` en tu repo del sitio — mismo
   patrón que ya usás con `js/vendor/js-dos/`.
3. Copiá también `js/vendor/fflate/fflate.min.js` (ya viene armado en este
   paquete) a esa misma ruta en tu repo.

### 3. Sumar los archivos de código de este paquete

Copiá al repo:
- `js/scummvm-engine.js` (nuevo)
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

### 5. Probar

Abrí el sitio, entrá al juego y mirá la consola del navegador. Ver la
siguiente sección si algo no coincide.

## Puntos a verificar (no pude probarlo end-to-end)

No tengo forma de compilar ni correr ScummVM-WASM en este entorno de chat, así
que `js/scummvm-engine.js` está escrito contra el comportamiento **estándar**
de un build de Emscripten, pero hay 2-3 detalles que varían según cómo
`build.sh` haya generado el glue code. Están marcados con comentarios `NOTA`
en el archivo, resumidos acá:

- **Cómo se pasa la configuración (`Module`)**: asumí que el script generado
  lee un objeto `window.Module` global si ya existe antes de ejecutarse (el
  patrón más común de Emscripten). Algunos builds en cambio exportan una
  función factory (`createScummVM({...}).then(mod => ...)`). Si al cargar
  `scummvm.js` no pasa nada, abrí el archivo generado y buscá cómo arranca al
  final (o mirá el `<script>` de ejemplo dentro de `build-emscripten/*.html`
  que trae el zip del Release — ese HTML de referencia es la fuente de verdad
  más confiable).
- **Acceso al filesystem virtual** (`Module.FS.mkdir` / `.writeFile`): es el
  nombre estándar en Emscripten, pero confirmalo corriendo `Module.FS` en la
  consola del navegador una vez que cargue.
- **Argumentos de arranque** (`--auto-detect --path=/game --fullscreen`):
  deberían saltar el launcher gráfico y arrancar directo el juego montado en
  `/game`, pero confirmalo con `scummvm --help` (podés correrlo local si
  tenés ScummVM nativo instalado — los argumentos de línea de comando son los
  mismos que en la versión de escritorio).

Si alguno de estos tres puntos no coincide, pasame el error de consola
después de tu primer intento y lo ajustamos — es un cambio acotado a
`js/scummvm-engine.js`, no afecta nada de js-dos ni del resto del sitio.
