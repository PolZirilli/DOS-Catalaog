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
      // "autoplay" para el audio; "fullscreen" para que requestFullscreen()
      // funcione tanto desde adentro del iframe como pedido desde afuera
      // (ver requestFullscreen más abajo).
      iframe.setAttribute('allow', 'autoplay; fullscreen');
      iframe.allowFullscreen = true; // compat navegadores viejos
      iframe.addEventListener('error', () => reject(new Error('No se pudo cargar el iframe de ScummVM')));

      // Sin esto, el teclado se lo queda el documento principal (flechas/
      // Tab/Enter de la navegación estilo Norton Commander) y ni el juego
      // ni el menú de ScummVM reciben nada.
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
        // Pantalla completa pedida DIRECTO por nosotros sobre el iframe,
        // disparada por un click real del usuario (botón en la
        // titlebar). No depende del Alt+Enter interno de ScummVM, que en
        // este build es poco confiable (llamada asincrónica vía Asyncify,
        // el navegador exige que requestFullscreen() se dispare síncrono
        // dentro del gesto del usuario — por eso Alt+Enter a veces
        // funciona una vez y después no).
        requestFullscreen: () => {
          const req = iframe.requestFullscreen || iframe.webkitRequestFullscreen;
          if (req) {
            const r = req.call(iframe);
            if (r && r.catch) r.catch(err => console.warn('[scummvm] el navegador rechazó pantalla completa', err));
          }
          try { iframe.contentWindow.focus(); } catch (e) { /* ignorar */ }
        },
        // Simula Ctrl+F5 (Global Main Menu: Guardar/Cargar/Opciones) sin
        // depender de que el teclado físico lo mande bien (F5 suele estar
        // reservado por el navegador, y en Mac depende de fn). No hay
        // garantía de que el manejo de teclado de SDL2/Emscripten lo
        // acepte igual que un evento real, pero vale la pena como
        // alternativa.
        openMenu: () => {
          try {
            const doc = iframe.contentDocument;
            const target = (doc && doc.getElementById('canvas')) || (doc && doc.body) || iframe.contentWindow;
            ['keydown', 'keyup'].forEach(type => {
              target.dispatchEvent(new KeyboardEvent(type, {
                key: 'F5', code: 'F5', keyCode: 116, which: 116,
                ctrlKey: true, bubbles: true, cancelable: true,
              }));
            });
          } catch (e) {
            console.warn('[scummvm] no se pudo simular Ctrl+F5', e);
          }
        },
      });
    });
  }

  return { run };
})();
