(function mobileGuard() {
  const uaBlock = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (uaBlock || (coarsePointer && narrow)) {
    document.getElementById('mobileBlock').classList.add('show');
  }
})();

let GENRES = {};
let GAMES = [];
let LEFT_ITEMS = [];
let RIGHT_ITEMS = [];
let currentGenre = null;

const state = { focus: 'left', leftIndex: 0, rightIndex: 0 };
const openWins = {};
const dosInstances = {};
let zTop = 100;

const panelLeftList = document.getElementById('panelLeftList');
const panelRightList = document.getElementById('panelRightList');
const panelRightHeader = document.getElementById('panelRightHeader');
const panelLeftStatus = document.getElementById('panelLeftStatus');
const panelRightStatus = document.getElementById('panelRightStatus');
const cmdline = document.getElementById('cmdline');
const runningEl = document.getElementById('running');
const fkeysEl = document.getElementById('fkeys');

// Genera una fecha/hora ficticia pero estable para un id (no tenemos fecha real de archivo).
function fakeDate(id, year) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const month = (h % 12) + 1;
  const day = (h % 28) + 1;
  const hour = (h % 12) + 1;
  const min = (h * 7) % 60;
  const ampm = h % 2 === 0 ? 'a' : 'p';
  const yy = String(year).slice(-2);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(month)}-${pad(day)}-${yy}  ${hour}:${pad(min)}${ampm}`;
}

function buildLeftItems() {
  LEFT_ITEMS = Object.keys(GENRES).map(id => {
    const count = GAMES.filter(g => g.genre === id).length;
    return { id, label: GENRES[id], count };
  }).filter(item => item.count > 0);
}

function renderLeftPanel() {
  panelLeftList.innerHTML = '';
  LEFT_ITEMS.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row is-dir' + (state.focus === 'left' && i === state.leftIndex ? ' selected' : '');
    row.innerHTML = `<div class="col-name">${item.label.toUpperCase()}\\</div><div class="col-extra">${item.count}</div>`;
    row.addEventListener('click', () => {
      state.focus = 'left';
      state.leftIndex = i;
      selectGenre(item.id);
      render();
    });
    row.addEventListener('dblclick', () => {
      state.focus = 'right';
      render();
    });
    panelLeftList.appendChild(row);
  });
}

function selectGenre(genreId) {
  currentGenre = genreId;
  state.rightIndex = 0;
  RIGHT_ITEMS = GAMES.filter(g => g.genre === genreId);
  const label = GENRES[genreId] || genreId;
  panelRightHeader.textContent = `C:\\${label.toUpperCase()}`;
}

function renderRightPanel() {
  panelRightList.innerHTML = '';
  RIGHT_ITEMS.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row is-file' + (state.focus === 'right' && i === state.rightIndex ? ' selected' : '');
    row.innerHTML = `
      <div class="col-name">
        <span>${g.name}<span style="opacity:.6">.EXE</span></span>
      </div>
      <div class="col-extra">${g.year}</div>`;
    row.addEventListener('click', () => {
      state.focus = 'right';
      state.rightIndex = i;
      render();
    });
    row.addEventListener('dblclick', () => launchGame(g));
    panelRightList.appendChild(row);
  });
}

function updateCmdline() {
  let path = 'C:\\CATEGORIAS';
  if (currentGenre) {
    path += `\\${(GENRES[currentGenre] || currentGenre).toUpperCase()}`;
    if (state.focus === 'right' && RIGHT_ITEMS[state.rightIndex]) {
      path += `\\${RIGHT_ITEMS[state.rightIndex].id.toUpperCase()}.EXE`;
    }
  }
  cmdline.innerHTML = `${path}&gt;<span class="cursor-blink"></span>`;
}

function updateStatusBars() {
  const leftItem = LEFT_ITEMS[state.leftIndex];
  if (leftItem) {
    panelLeftStatus.innerHTML = `<span class="st-name">${leftItem.label.toUpperCase()}\\ &lt;DIR&gt;</span><span class="st-date">${fakeDate(leftItem.id, 1994)}</span>`;
  } else {
    panelLeftStatus.innerHTML = '';
  }
  const rightItem = RIGHT_ITEMS[state.rightIndex];
  if (rightItem) {
    panelRightStatus.innerHTML = `<span class="st-name">${rightItem.name.toUpperCase()}.EXE</span><span class="st-date">${fakeDate(rightItem.id, rightItem.year)}</span>`;
  } else {
    panelRightStatus.innerHTML = '';
  }
}

function render() {
  renderLeftPanel();
  renderRightPanel();
  updateCmdline();
  updateStatusBars();
}

function moveSelection(delta) {
  if (state.focus === 'left') {
    if (!LEFT_ITEMS.length) return;
    state.leftIndex = (state.leftIndex + delta + LEFT_ITEMS.length) % LEFT_ITEMS.length;
    selectGenre(LEFT_ITEMS[state.leftIndex].id);
  } else {
    if (!RIGHT_ITEMS.length) return;
    state.rightIndex = (state.rightIndex + delta + RIGHT_ITEMS.length) % RIGHT_ITEMS.length;
  }
  render();
}

function switchFocus() {
  if (state.focus === 'left') {
    if (!currentGenre && LEFT_ITEMS.length) selectGenre(LEFT_ITEMS[state.leftIndex].id);
    state.focus = 'right';
  } else {
    state.focus = 'left';
  }
  render();
}

function activateSelection() {
  if (state.focus === 'left') {
    switchFocus();
  } else if (RIGHT_ITEMS[state.rightIndex]) {
    launchGame(RIGHT_ITEMS[state.rightIndex]);
  }
}

document.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  switch (e.key) {
    case 'ArrowUp': e.preventDefault(); moveSelection(-1); break;
    case 'ArrowDown': e.preventDefault(); moveSelection(1); break;
    case 'Tab':
    case 'ArrowLeft':
    case 'ArrowRight': e.preventDefault(); switchFocus(); break;
    case 'Enter': e.preventDefault(); activateSelection(); break;
    case 'F1': e.preventDefault(); showHelp(); break;
    case 'F5': e.preventDefault(); render(); break;
  }
});

function showHelp() {
  cmdline.innerHTML = 'Flechas: moverse &nbsp;|&nbsp; Tab: cambiar panel &nbsp;|&nbsp; Enter: abrir/ejecutar<span class="cursor-blink"></span>';
  setTimeout(updateCmdline, 2500);
}

/* ---------- FKEYS ---------- */
const FKEYS = [
  { key: 'F1', label: 'Ayuda', action: showHelp },
  {
    key: 'F3', label: 'Info', action: () => {
      const g = RIGHT_ITEMS[state.rightIndex];
      if (state.focus === 'right' && g) {
        cmdline.innerHTML = `${g.name} — ${GENRES[g.genre] || g.genre} — ${g.year}<span class="cursor-blink"></span>`;
        setTimeout(updateCmdline, 2500);
      }
    }
  },
  { key: 'F4', label: 'Ejecutar', action: activateSelection },
  { key: 'F5', label: 'Refrescar', action: render },
  {
    key: 'F10', label: 'Cerrar activa', action: () => {
      const ids = Object.keys(openWins);
      if (ids.length) closeWin(ids[ids.length - 1]);
    }
  },
];

function renderFkeys() {
  fkeysEl.innerHTML = '';
  FKEYS.forEach(fk => {
    const el = document.createElement('div');
    el.className = 'fkey';
    el.innerHTML = `<span class="num">${fk.key.replace('F', '')}</span><span class="label">${fk.label}</span>`;
    el.addEventListener('click', fk.action);
    fkeysEl.appendChild(el);
  });
}

/* ---------- WINDOWS / MOTORES DE EMULACIÓN ---------- */
// Un juego corre con js-dos (DOSBox/WASM) por default. Si en games.json trae
// "engine": "scummvm", se usa el motor nativo de ScummVM (ver
// js/scummvm-engine.js) en vez de emular la PC completa.
function launchGame(g) {
  if (openWins[g.id]) {
    focusWin(g.id);
    restoreWin(g.id);
    return;
  }
  const win = document.createElement('div');
  win.className = 'window';
  const w = 520, h = 360;
  const left = 40 + Object.keys(openWins).length * 24;
  const top = 30 + Object.keys(openWins).length * 24;
  win.style.width = w + 'px'; win.style.height = h + 'px';
  win.style.left = left + 'px'; win.style.top = top + 'px';
  win.style.zIndex = ++zTop;

  const isScummvm = g.engine === 'scummvm';

  win.innerHTML = `
    <div class="titlebar">
      <div class="titlebar-title">${g.name.toUpperCase()}.EXE</div>
      <div class="win-controls">
        ${isScummvm ? '<span class="win-btn menu" title="Menu ScummVM (Guardar/Cargar/Opciones)">[≡]</span><span class="win-btn fs" title="Pantalla completa (ESC queda libre para el juego)">[⛶]</span>' : ''}
        <span class="win-btn max">[□]</span>
        <span class="win-btn close">[X]</span>
      </div>
    </div>
    <div class="win-body">
      <div class="boot-lines"></div>
      <div class="win-screen" style="display:none;">
        <div class="big-title">${g.name.toUpperCase()}</div>
        <div class="hint">Todavía no hay un bundle asignado a este juego. Agregalo en data/games.json (campo "bundle") o dejalo local en la carpeta games/ para que arranque acá el motor real.</div>
        <div style="margin-top:16px;">C:\\GAMES\\${g.id.toUpperCase()}&gt;<span class="cursor-blink"></span></div>
      </div>
    </div>
  `;
  document.body.appendChild(win);
  openWins[g.id] = win;

  const bootLines = win.querySelector('.boot-lines');
  const screen = win.querySelector('.win-screen');
  const body = win.querySelector('.win-body');
  const lines = [
    isScummvm ? 'ScummVM Engine v1.0' : 'MS-DOS Emulator v1.0',
    isScummvm ? 'Detectando motor del juego...' : 'Detectando controladora de sonido... Sound Blaster 16 OK',
    `Montando C:\\GAMES\\${g.id.toUpperCase()}...`,
    isScummvm ? 'Auto-detectando juego...' : `Cargando ${g.id.toUpperCase()}.EXE...`,
  ];
  lines.forEach((t, i) => {
    setTimeout(() => {
      const l = document.createElement('div');
      l.className = 'boot-line';
      l.textContent = t;
      bootLines.appendChild(l);
    }, i * 260);
  });

  setTimeout(() => {
    bootLines.style.display = 'none';
    if (g.bundle && isScummvm) {
      body.classList.add('no-pad');
      const container = document.createElement('div');
      container.className = 'jsdos-container';
      body.appendChild(container);
      if (window.ScummVMEngine) {
        dosInstances[g.id] = window.ScummVMEngine.run(container, g).catch(err => {
          console.error(err);
          container.innerHTML = '';
          container.style.color = '#f66';
          container.style.padding = '14px';
          container.textContent = 'No se pudo iniciar ScummVM: ' + err.message;
          return null;
        });
        // En cuanto la ventana quede activa (foco de mouse/teclado), que
        // el teclado apunte al iframe del juego, no al documento principal.
        dosInstances[g.id].then(inst => { if (inst && inst.focus) inst.focus(); });
      } else {
        container.style.color = '#f66';
        container.style.padding = '14px';
        container.textContent = 'No se pudo cargar el motor de ScummVM (js/scummvm-engine.js).';
      }
    } else if (g.bundle) {
      body.classList.add('no-pad');
      const container = document.createElement('div');
      container.className = 'jsdos-container';
      body.appendChild(container);
      if (window.Dos) {
        dosInstances[g.id] = Dos(container, {}).run(g.bundle);
      } else {
        container.style.color = '#f66';
        container.style.padding = '14px';
        container.textContent = 'No se pudo cargar js-dos (revisá la conexión a internet).';
      }
    } else {
      screen.style.display = 'block';
    }
  }, lines.length * 260 + 300);

  win.addEventListener('mousedown', () => focusWin(g.id));
  win.querySelector('.win-btn.close').addEventListener('click', e => { e.stopPropagation(); closeWin(g.id); });
  win.querySelector('.win-btn.max').addEventListener('click', e => { e.stopPropagation(); win.classList.toggle('maximized'); });
  if (isScummvm) {
    const menuBtn = win.querySelector('.win-btn.menu');
    const fsBtn = win.querySelector('.win-btn.fs');
    if (menuBtn) {
      menuBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (dosInstances[g.id]) dosInstances[g.id].then(inst => { if (inst && inst.openMenu) inst.openMenu(); });
      });
    }
    if (fsBtn) {
      fsBtn.addEventListener('click', e => {
        e.stopPropagation();
        // Pantalla completa "falsa" con CSS (.pseudo-fs), no la Fullscreen
        // API real del navegador -- así ESC no se lo come el navegador
        // para salir, y le sigue llegando entero al juego (ver nota en
        // js/scummvm-engine.js). El botón [⛶] queda visible arriba de
        // todo como única forma de entrar/salir.
        win.classList.toggle('pseudo-fs');
        const active = win.classList.contains('pseudo-fs');
        fsBtn.title = active ? 'Salir de pantalla completa' : 'Pantalla completa (ESC queda libre para el juego)';
        if (dosInstances[g.id]) dosInstances[g.id].then(inst => { if (inst && inst.focus) inst.focus(); });
      });
    }
  }
  makeDraggable(win, win.querySelector('.titlebar'));

  addRunningTab(g);
}

function addRunningTab(g) {
  if (!runningEl) return;
  const tab = document.createElement('div');
  tab.className = 'running-tab active';
  tab.dataset.id = g.id;
  tab.textContent = g.name.toUpperCase() + '.EXE';
  tab.addEventListener('click', () => {
    const win = openWins[g.id];
    if (!win) return;
    if (win.style.display === 'none') { restoreWin(g.id); }
    else if (parseInt(win.style.zIndex) === zTop) { minimizeWin(g.id); }
    else { focusWin(g.id); }
  });
  runningEl.appendChild(tab);
}

function focusWin(id) {
  const win = openWins[id];
  if (!win) return;
  win.style.zIndex = ++zTop;
  document.querySelectorAll('.running-tab').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  // Si es una ventana de ScummVM, devolverle el foco de teclado al iframe
  // del juego (si no, el menú Ctrl+F5 / Guardar / Opciones no recibe nada).
  if (dosInstances[id]) {
    dosInstances[id].then(inst => { if (inst && inst.focus) inst.focus(); });
  }
}
function minimizeWin(id) {
  const win = openWins[id];
  if (!win) return;
  win.style.display = 'none';
  const tab = runningEl ? runningEl.querySelector(`.running-tab[data-id="${id}"]`) : null;
  if (tab) tab.classList.remove('active');
}
function restoreWin(id) {
  const win = openWins[id];
  if (!win) return;
  win.style.display = 'flex';
  focusWin(id);
}
function closeWin(id) {
  const win = openWins[id];
  if (win) win.remove();
  delete openWins[id];
  if (dosInstances[id]) {
    // Tanto js-dos (CommandInterface) como el wrapper de ScummVM exponen
    // una promesa que resuelve a un objeto con .exit() — mismo contrato,
    // no hace falta bifurcar acá según el motor.
    dosInstances[id].then(ci => { if (ci && ci.exit) ci.exit(); }).catch(() => { });
    delete dosInstances[id];
  }
  const tab = runningEl ? runningEl.querySelector(`.running-tab[data-id="${id}"]`) : null;
  if (tab) tab.remove();
}

function makeDraggable(win, handle) {
  let dragging = false, ox = 0, oy = 0;
  handle.addEventListener('mousedown', e => {
    if (win.classList.contains('maximized')) return;
    dragging = true;
    ox = e.clientX - win.offsetLeft;
    oy = e.clientY - win.offsetTop;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    win.style.left = Math.max(0, e.clientX - ox) + 'px';
    win.style.top = Math.max(0, e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => dragging = false);
}

/* ---------- LOAD ---------- */
renderFkeys();

fetch('data/games.json')
  .then(r => r.json())
  .then(data => {
    GENRES = data.genres;
    GAMES = data.games;
    buildLeftItems();
    if (LEFT_ITEMS.length) selectGenre(LEFT_ITEMS[0].id);
    render();
  })
  .catch(err => {
    panelRightList.innerHTML = '<div class="panel-row" style="color:#fff;padding:20px;">No se pudo cargar data/games.json. Si abriste el archivo directo (file://), corré un servidor local — ver README.md.</div>';
    console.error(err);
  });
