(function mobileGuard() {
  const uaBlock = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (uaBlock || (coarsePointer && narrow)) {
    document.getElementById('mobileBlock').classList.add('show');
  }
})();

const desktop = document.getElementById('desktop');
const taskItems = document.getElementById('taskItems');
let zTop = 100;
const openWins = {};
let GENRES = {};
let GAMES = [];

function initials(name) {
  return name.replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Intenta cargar icons/<id>.png|jpg; si no existe, muestra las iniciales del juego.
// Cuando tengas el icono real de un juego, poné el archivo en icons/<id>.png y aparece solo.
function iconArtHTML(g, withArrow) {
  return `<img src="icons/${g.id}.png" alt=""
      onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';"
    ><span class="icon-fallback">${initials(g.name)}</span>${withArrow ? '<span class="arrow"></span>' : ''}`;
}

function selectIcon(el) {
  document.querySelectorAll('.icon.selected').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
}

document.body.addEventListener('click', () => {
  document.querySelectorAll('.icon.selected').forEach(i => i.classList.remove('selected'));
  closeStartMenu();
});

function launchGame(g) {
  if (openWins[g.id]) {
    focusWin(g.id);
    restoreWin(g.id);
    return;
  }
  const win = document.createElement('div');
  win.className = 'window';
  const w = 520, h = 360;
  const left = 60 + Object.keys(openWins).length * 24;
  const top = 40 + Object.keys(openWins).length * 24;
  win.style.width = w + 'px'; win.style.height = h + 'px';
  win.style.left = left + 'px'; win.style.top = top + 'px';
  win.style.zIndex = ++zTop;

  win.innerHTML = `
    <div class="titlebar">
      <div class="titlebar-title"><span class="icon-art g-${g.genre}" style="width:16px;height:16px;font-size:10px;">${iconArtHTML(g, false)}</span> ${g.name}</div>
      <div class="win-controls">
        <div class="win-btn min">_</div>
        <div class="win-btn max">\u25A1</div>
        <div class="win-btn close">\u2715</div>
      </div>
    </div>
    <div class="win-body">
      <div class="boot-lines"></div>
      <div class="win-screen" style="display:none;">
        <div class="icon-art g-${g.genre} big-icon">${iconArtHTML(g, false)}</div>
        <div class="big-title">${g.name.toUpperCase()}</div>
        <div class="hint">Todavía no hay un bundle .jsdos asignado a este juego. Agregalo en data/games.json (campo "bundle") o dejalo local en la carpeta games/ para que arranque acá el motor real.</div>
        <div style="margin-top:16px;">C:\\GAMES\\${g.id.toUpperCase()}&gt;<span class="cursor-blink"></span></div>
      </div>
    </div>
  `;
  desktop.parentElement.insertBefore(win, document.getElementById('taskbar'));
  openWins[g.id] = win;

  const bootLines = win.querySelector('.boot-lines');
  const screen = win.querySelector('.win-screen');
  const body = win.querySelector('.win-body');
  const lines = [
    'MS-DOS Emulator v1.0',
    'Detectando controladora de sonido... Sound Blaster 16 OK',
    `Montando C:\\GAMES\\${g.id.toUpperCase()}...`,
    `Cargando ${g.id.toUpperCase()}.EXE...`,
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
    if (g.bundle) {
      // Hay un bundle .jsdos real: montamos el motor de emulación de verdad.
      body.classList.add('no-pad');
      const container = document.createElement('div');
      container.className = 'jsdos-container';
      body.appendChild(container);
      if (window.Dos) {
        Dos(container, {}).run(g.bundle);
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
  win.querySelector('.win-btn.min').addEventListener('click', e => { e.stopPropagation(); minimizeWin(g.id); });
  win.querySelector('.win-btn.max').addEventListener('click', e => { e.stopPropagation(); win.classList.toggle('maximized'); });
  makeDraggable(win, win.querySelector('.titlebar'));

  addTaskButton(g);
  closeStartMenu();
}

function addTaskButton(g) {
  const btn = document.createElement('div');
  btn.className = 'task-btn pressed';
  btn.dataset.id = g.id;
  btn.innerHTML = `<span class="icon-art g-${g.genre}" style="width:16px;height:16px;font-size:9px;">${iconArtHTML(g, false)}</span><span>${g.name}</span>`;
  btn.addEventListener('click', () => {
    const win = openWins[g.id];
    if (!win) return;
    if (win.style.display === 'none') { restoreWin(g.id); }
    else if (parseInt(win.style.zIndex) === zTop) { minimizeWin(g.id); }
    else { focusWin(g.id); }
  });
  taskItems.appendChild(btn);
}

function focusWin(id) {
  const win = openWins[id];
  if (!win) return;
  win.style.zIndex = ++zTop;
  document.querySelectorAll('.task-btn').forEach(b => b.classList.toggle('pressed', b.dataset.id === id));
}
function minimizeWin(id) {
  const win = openWins[id];
  if (!win) return;
  win.style.display = 'none';
  const btn = taskItems.querySelector(`.task-btn[data-id="${id}"]`);
  if (btn) btn.classList.remove('pressed');
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
  const btn = taskItems.querySelector(`.task-btn[data-id="${id}"]`);
  if (btn) btn.remove();
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

const startMenu = document.getElementById('startMenu');
const startMenuList = document.getElementById('startMenuList');
const startBtn = document.getElementById('startBtn');

function renderCatalog() {
  const byGenre = {};
  GAMES.forEach(g => { (byGenre[g.genre] = byGenre[g.genre] || []).push(g); });

  desktop.innerHTML = '';
  GAMES.forEach(g => {
    const el = document.createElement('div');
    el.className = 'icon';
    el.innerHTML = `<div class="icon-art g-${g.genre}">${iconArtHTML(g, true)}</div><div class="icon-label">${g.name}</div>`;
    el.addEventListener('click', e => { e.stopPropagation(); selectIcon(el); });
    el.addEventListener('dblclick', e => { e.stopPropagation(); launchGame(g); });
    desktop.appendChild(el);
  });

  startMenuList.innerHTML = '';
  Object.keys(GENRES).forEach(genre => {
    if (!byGenre[genre]) return;
    const header = document.createElement('div');
    header.className = 'menu-item';
    header.style.fontWeight = 'bold';
    header.style.opacity = '0.75';
    header.textContent = GENRES[genre];
    startMenuList.appendChild(header);
    byGenre[genre].forEach(g => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.innerHTML = `<span class="icon-art g-${g.genre}" style="width:18px;height:18px;font-size:10px;">${iconArtHTML(g, false)}</span><span>${g.name}</span>`;
      item.addEventListener('click', e => { e.stopPropagation(); launchGame(g); });
      startMenuList.appendChild(item);
    });
    const sep = document.createElement('div');
    sep.className = 'menu-sep';
    startMenuList.appendChild(sep);
  });
}

startBtn.addEventListener('click', e => {
  e.stopPropagation();
  startMenu.classList.toggle('open');
  startBtn.classList.toggle('active');
});
function closeStartMenu() {
  startMenu.classList.remove('open');
  startBtn.classList.remove('active');
}
startMenu.addEventListener('click', e => e.stopPropagation());

function tick() {
  const d = new Date();
  document.getElementById('clock').textContent = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 15000);

fetch('data/games.json')
  .then(r => r.json())
  .then(data => {
    GENRES = data.genres;
    GAMES = data.games;
    renderCatalog();
  })
  .catch(err => {
    desktop.innerHTML = '<div style="color:#fff;padding:20px;max-width:420px;">No se pudo cargar data/games.json. Si abriste el archivo directo (file://), corré un servidor local — ver README.md.</div>';
    console.error(err);
  });
