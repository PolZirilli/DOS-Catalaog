/*
 * Motor ScummVM para DOSVault.
 *
 * A diferencia de js-dos (que emula la PC completa vía DOSBox y corre el
 * .EXE original), ScummVM reimplementa el motor del juego de forma nativa:
 * recibe los archivos de datos crudos del juego (RESOURCE.MAP, *.LFL, etc.)
 * y los auto-detecta, sin pasar por DOS.
 *
 * El build real de scummvm.js (generado por
 * .github/workflows/build-scummvm.yml) resuelve sus propios assets
 * ("data/gui-icons.dat", etc.) con rutas relativas a la página que lo
 * carga — no al script en sí. Por eso, en vez de inyectar scummvm.js
 * directo en esta página, lo corremos en un <iframe> apuntando a
 * js/vendor/scummvm/launcher.html, que vive en la misma carpeta que el
 * build vendorizado. Así las rutas relativas siempre caen bien, sin
 * importar la estructura del resto del sitio, y cada partida queda en su
 * propio contexto de JS aislado (cerrar = sacar el iframe del DOM, sin
 * necesidad de llamar ninguna función de salida especial de Emscripten).
 */

window.ScummVMEngine = (function () {
  function run(container, game) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.className = 'scummvm-frame';
      iframe.src = 'js/vendor/scummvm/launcher.html?bundle=' + encodeURIComponent(game.bundle);
      iframe.allow = 'autoplay';
      iframe.addEventListener('error', () => reject(new Error('No se pudo cargar el iframe de ScummVM')));
      container.appendChild(iframe);

      // No hay un evento confiable de "el juego ya arrancó" cruzando el
      // iframe sin tocar launcher.html (postMessage), así que resolvemos
      // apenas el iframe está en el DOM: launcher.html se encarga de
      // mostrar su propio estado de carga (barra de progreso / errores).
      resolve({
        exit: () => {
          iframe.remove();
        },
      });
    });
  }

  return { run };
})();
