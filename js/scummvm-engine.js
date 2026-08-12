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
      // "autoplay" para el audio; "fullscreen" para que el toggle de
      // pantalla completa del propio menú de ScummVM (Ctrl+F5 → Options)
      // no quede bloqueado por el navegador al pedirse desde adentro del
      // iframe.
      iframe.setAttribute('allow', 'autoplay; fullscreen');
      iframe.allowFullscreen = true; // compat navegadores viejos
      iframe.addEventListener('error', () => reject(new Error('No se pudo cargar el iframe de ScummVM')));
 
      // Sin esto, el teclado se lo queda el documento principal (flechas/
      // Tab/Enter de la navegación estilo Norton Commander) y ni el juego
      // ni el menú de ScummVM (Ctrl+F5: Guardar/Cargar/Opciones) reciben
      // nada. Se enfoca al cargar y también cada vez que se hace click en
      // la ventana (ver focusScummvmFrame, llamado desde app.js).
      iframe.addEventListener('load', () => {
        try { iframe.contentWindow.focus(); } catch (e) { /* cross-origin improbable acá, pero por las dudas */ }
      });
 
      container.appendChild(iframe);
 
      resolve({
        exit: () => {
          iframe.remove();
        },
        // app.js llama esto cuando la ventana del juego pasa a primer
        // plano (mousedown), para que el teclado vuelva a apuntar al
        // iframe en vez de quedarse en el documento principal.
        focus: () => {
          try { iframe.contentWindow.focus(); } catch (e) { /* ignorar */ }
        },
      });
    });
  }
 
  return { run };
})();
