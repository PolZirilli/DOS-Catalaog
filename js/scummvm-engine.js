/*
 * Motor ScummVM para DOSVault.
 *
 * A diferencia de js-dos (que emula la PC completa vía DOSBox), ScummVM
 * reimplementa los motores de las aventuras gráficas de forma nativa: no
 * corre un .EXE, sino que recibe directamente los archivos de datos del
 * juego (RESOURCE.MAP, *.LFL, etc.) y los auto-detecta.
 *
 * Carga todo de forma "lazy": scummvm.js/.wasm (pesados) recién se piden la
 * primera vez que se lanza un juego con engine:"scummvm", no al abrir el
 * sitio.
 *
 * IMPORTANTE - a verificar tras generar el primer build real con
 * .github/workflows/build-scummvm.yml (ver README-SCUMMVM.md):
 *   - El nombre exacto del objeto de configuración que espera el glue code
 *     generado por Emscripten (acá se asume la convención estándar `Module`
 *     global, pero algunas versiones usan un factory: `ScummVM({...})
 *     .then(mod => ...)`. Revisar el <script> de ejemplo que trae
 *     build-emscripten/*.html dentro del zip del Release.
 *   - El acceso al filesystem virtual (`FS.mkdir`, `FS.writeFile`) — en la
 *     mayoría de los builds de Emscripten estas funciones quedan colgadas
 *     del objeto Module (`Module.FS`) una vez que corre; si no están
 *     disponibles todavía en `preRun`, puede hacer falta usar
 *     `Module.FS_createPath` / `Module.FS_createDataFile` en su lugar.
 *   - Los argumentos de línea de comando para saltar el launcher y arrancar
 *     directo un juego (`--auto-detect --path=/game`) — confirmar contra
 *     `scummvm --help` corriendo el build generado.
 */

window.ScummVMEngine = (function () {
  let scummvmLoad = null;
  let fflateLoad = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.body.appendChild(s);
    });
  }

  function loadScummVMRuntime() {
    if (!scummvmLoad) {
      scummvmLoad = loadScript('js/vendor/scummvm/scummvm.js');
    }
    return scummvmLoad;
  }

  function loadFflate() {
    if (window.fflate) return Promise.resolve();
    if (!fflateLoad) {
      fflateLoad = loadScript('js/vendor/fflate/fflate.min.js');
    }
    return fflateLoad;
  }

  // Escribe cada entrada del zip descomprimido dentro del FS virtual de
  // Emscripten, recreando la estructura de carpetas del juego en /game.
  function mountGameFiles(FS, entries) {
    FS.mkdir('/game');
    Object.keys(entries).forEach(path => {
      if (path.endsWith('/')) return; // entrada de carpeta vacía en el zip
      const parts = path.split('/');
      let dir = '/game';
      for (let i = 0; i < parts.length - 1; i++) {
        dir += '/' + parts[i];
        try { FS.mkdir(dir); } catch (e) { /* ya existe */ }
      }
      FS.writeFile('/game/' + path, entries[path]);
    });
  }

  async function run(container, game) {
    // 1) Traer fflate y los datos del juego ANTES de tocar scummvm.js: el
    // glue code de Emscripten arranca a ejecutarse apenas se inyecta el
    // <script>, así que el objeto `Module` tiene que estar listo primero.
    await loadFflate();

    const resp = await fetch(game.bundle);
    if (!resp.ok) {
      throw new Error('No se pudo descargar el bundle de ' + game.id + ' (' + resp.status + ')');
    }
    const zipBytes = new Uint8Array(await resp.arrayBuffer());
    const entries = window.fflate.unzipSync(zipBytes);

    const canvas = document.createElement('canvas');
    canvas.className = 'scummvm-canvas';
    canvas.id = 'scummvm-canvas-' + game.id;
    canvas.tabIndex = -1;
    container.appendChild(canvas);

    return new Promise((resolve, reject) => {
      const Module = {
        canvas,
        arguments: ['--auto-detect', '--path=/game', '--fullscreen'],
        print: (...args) => console.log('[scummvm:' + game.id + ']', ...args),
        printErr: (...args) => console.error('[scummvm:' + game.id + ']', ...args),
        preRun: [
          function () {
            try {
              mountGameFiles(Module.FS, entries);
            } catch (err) {
              reject(new Error('No se pudieron montar los archivos del juego: ' + err.message));
            }
          },
        ],
        onRuntimeInitialized: () => {
          resolve({
            exit: () => {
              try {
                if (typeof Module.pauseMainLoop === 'function') Module.pauseMainLoop();
                if (typeof Module._emscripten_force_exit === 'function') {
                  Module._emscripten_force_exit(0, false);
                }
              } catch (e) {
                console.warn('[scummvm] error al cerrar la instancia', e);
              }
              container.innerHTML = '';
            },
          });
        },
      };

      // 2) Recién ahora se define el `Module` global y se inyecta el script
      // real de scummvm.js, que lo va a leer al arrancar. Ver nota al
      // inicio del archivo sobre variantes con factory function en vez de
      // un `Module` global.
      window.Module = Module;
      loadScummVMRuntime().catch(reject);
    });
  }

  return { run };
})();
