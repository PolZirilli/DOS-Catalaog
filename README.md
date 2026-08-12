# Catálogo DOS
Prototipo funcional de un catálogo de juegos DOS con estética de interface de DOS mediante Norton Commander, corriendo sobre [js-dos](https://js-dos.com) (DOSBox compilado a WebAssembly). Para uso personal, no comercial.

## Estructura
```
dos-catalog/
├── index.html          → página principal (escritorio + taskbar)
├── css/style.css        → estilos (sin gradientes, look Win2000)
├── js/app.js             → lógica del escritorio, ventanas y arranque de js-dos
├── data/games.json       → manifest del catálogo (acá se agregan juegos)
├── icons/                → íconos reales de cada juego (icons/<id>.png)
└── games/                → bundles .jsdos locales (opcional, ver abajo)
```

## Cómo correrlo

`index.html` carga `data/games.json` con `fetch()`, que **no funciona abriendo
el archivo directo con doble clic** (bloqueo CORS de `file://`). Hay que
servirlo con un servidor local:

```bash
cd dos-catalog
python3 -m http.server 8080
# o: npx serve .
```

Y abrir `http://localhost:8080` en el navegador de escritorio.

## Cómo agregar un juego

1. Sumá la entrada en `data/games.json`, dentro del array `games`:

```json
{ "id": "quake", "name": "Quake", "genre": "fps", "year": "1996", "bundle": null }
```

`genre` tiene que ser una de las claves definidas en el objeto `genres` del
mismo archivo (`fps`, `rts`, `adv`, `rpg`, `sim`, `race`, o una nueva que
agregues ahí).

2. Mientras `"bundle"` sea `null`, el ícono aparece en el catálogo pero al
   abrirlo muestra una pantalla de aviso ("todavía no tiene bundle asignado")
   en vez de arrancar el juego. Es el estado por defecto de todo el catálogo
   de muestra que viene cargado.

3. Cuando tengas el juego empaquetado como `.jsdos` (ver siguiente sección),
   poné la URL o ruta en `"bundle"`:

```json
{ "id": "quake", "name": "Quake", "genre": "fps", "year": "1996", "bundle": "games/quake.jsdos" }
```

A partir de ahí, doble clic en el ícono monta el motor real de js-dos y el
juego arranca en la ventana.

## Cómo empaquetar un juego en .jsdos

Un bundle `.jsdos` es simplemente un `.zip` con los archivos del juego más un
`.jsdos/dosbox.conf`. La forma más simple de armarlo:

- **Game Studio de dos.zone** (https://dos.zone/studio): subís los archivos
  del juego (tuyos, de un CD original o de un instalador DRM-free de GOG) y
  te genera el `.jsdos` con la config de ciclos/sonido ya ajustada.
- Si el juego viene de un instalador de GOG, primero extraelo con
  [`innoextract`](https://constexpr.org/innoextract/) para quedarte con los
  archivos DOS crudos (no el wrapper de Windows que trae GOG por default).

Guardá el `.jsdos` resultante en la carpeta `games/` del proyecto y apuntá
`"bundle"` a `"games/<archivo>.jsdos"`, o subilo a algún hosting propio y
poné la URL completa.

## Cómo agregar el ícono real de un juego

Poné un `.png` en `icons/<id>.png` (mismo `id` que en `games.json`, por
ejemplo `icons/quake.png`). Si no existe el archivo, el catálogo muestra
automáticamente una placa con las iniciales del juego como respaldo — no
hace falta tocar código en ningún caso.

## Entrada de prueba

`games.json` incluye una entrada `demo` (categoría "Pruebas del motor") que
apunta a un bundle público de test de js-dos, para confirmar que el motor de
emulación real funciona de punta a punta sin depender de tener juegos propios
todavía. Se puede borrar cuando el catálogo tenga contenido real.

## Alcance actual / próximos pasos

- **DOS puro a Win95/98** vía js-dos: cubierto por esta base.
- **Win98/2000 con juegos instalados** (RTS más pesados, 3D): requiere el
  segundo motor (v86 con imagen de disco persistente) que quedó pendiente de
  integrar como una segunda "capa" del mismo catálogo.
- **Bloqueo de acceso móvil**: ya está (`js/app.js`, función `mobileGuard`).

## Nota legal

Proyecto de uso personal. El catálogo de muestra no incluye ningún archivo de
juego — cada entrada usa juegos que vos ya tenés (discos originales o
instaladores DRM-free comprados), empaquetados por vos mismo siguiendo los
pasos de arriba.
