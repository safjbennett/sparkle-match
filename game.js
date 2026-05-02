/* ====================================================================
 *  Sparkle Match — Game Engine
 *  Match-3 with Candy-Crush-style specials, blockers, level types,
 *  Sugar Crush bonus, stars, world map. Single-file, vanilla JS.
 * ==================================================================== */
(function () {
'use strict';

// ====================== Themes ======================
const THEMES = {
  unicorn: {
    key: 'unicorn',
    name: 'Unicorn Meadow',
    icon: '🦄',
    symbols: ['🦄', '🧚', '🌈', '⭐', '🌸', '💖'],
    particles: ['✨', '💖', '⭐', '🌟', '💫'],
    garden: ['🌸','🦋','🌺','🌷','💖','✨','🌈'],
    music: 'audio/unicorn.mp3',
    vars: {
      '--bg': 'linear-gradient(135deg, #ffd1f0 0%, #d6b8ff 50%, #b8e0ff 100%)',
      '--accent': '#ff6fb1', '--accent2': '#a26bff', '--accent3': '#5fb8ff',
      '--text': '#5a2e7a', '--soft': '#9b59b6',
      '--btn-shadow': '#a85a98', '--btn-shadow2': '#5d9fcf'
    }
  },
  mermaid: {
    key: 'mermaid',
    name: 'Mermaid Lagoon',
    icon: '🧜‍♀️',
    symbols: ['🧜‍♀️', '🐚', '🐠', '🌊', '⭐', '🐬'],
    particles: ['💧', '🫧', '✨', '⭐', '💙'],
    garden: ['🐚','🐠','🌊','💙','⭐','🐬','🪸'],
    music: 'audio/mermaid.mp3',
    vars: {
      '--bg': 'linear-gradient(135deg, #c5f0ff 0%, #8ec5ff 50%, #c5a8ff 100%)',
      '--accent': '#3aa8d8', '--accent2': '#5a8fd6', '--accent3': '#8b6fd6',
      '--text': '#1e4a6b', '--soft': '#3a78a8',
      '--btn-shadow': '#1e6a98', '--btn-shadow2': '#4a5d9f'
    }
  },
  winter: {
    key: 'winter',
    name: 'Winter Wonder',
    icon: '❄️',
    symbols: ['❄️', '⛸️', '🦢', '💎', '🌨️', '⭐'],
    particles: ['❄️', '✨', '💎', '🤍', '⭐'],
    garden: ['❄️','💎','🌨️','🤍','⭐','✨'],
    music: 'audio/winter.mp3',
    vars: {
      '--bg': 'linear-gradient(135deg, #eaf4ff 0%, #c8d8f0 50%, #b8c5e8 100%)',
      '--accent': '#5a9fd6', '--accent2': '#7a8fc6', '--accent3': '#9bb8e0',
      '--text': '#2a4a7a', '--soft': '#4a6a9a',
      '--btn-shadow': '#3a6f9f', '--btn-shadow2': '#5a7fa8'
    }
  },
  fairy: {
    key: 'fairy',
    name: 'Fairy Garden',
    icon: '🧚',
    symbols: ['🧚', '🌸', '🌼', '🍄', '🦋', '🌻'],
    particles: ['🦋', '🌸', '✨', '🌼', '💫'],
    garden: ['🧚','🦋','🌸','🌼','🍄','🌿','🌻'],
    music: 'audio/fairy.mp3',
    vars: {
      '--bg': 'linear-gradient(135deg, #d6f0c8 0%, #ffd6e8 50%, #e8c8ff 100%)',
      '--accent': '#e879b8', '--accent2': '#a26bff', '--accent3': '#7ac88b',
      '--text': '#4a6a3a', '--soft': '#7e6aa0',
      '--btn-shadow': '#9c5a90', '--btn-shadow2': '#5a9870'
    }
  }
};

const TOAST_WORDS = ['Magical!','Sparkly!','Wow!','Beautiful!','Super!','Amazing!','Twinkle!','Yay!','Pretty!','Fabulous!','Lovely!','Brilliant!','Shine!'];

const SIZE = 6;

// Special piece types
const SP = {
  STRIPED_H:  'striped-h',
  STRIPED_V:  'striped-v',
  WRAPPED:    'wrapped',
  COLORBOMB:  'colorbomb',
  JELLYFISH:  'jellyfish'
};

// Blocker types
const BL = {
  CHOCOLATE: 'chocolate',
  MERINGUE:  'meringue'
};

// ====================== Cell helpers ======================
// Board cell is either null (empty) or an object {sym, special?, blocker?, hp?}
// Symbol cells:  {sym: '🦄', special: 'striped-h'?}
// Blocker cells: {blocker: 'chocolate'} or {blocker: 'meringue', hp: 2}
function makeCandy(sym, special) {
  const c = { sym };
  if (special) c.special = special;
  return c;
}
function makeBlocker(type, hp) {
  return { blocker: type, hp: hp || (type === BL.MERINGUE ? 1 : 0) };
}
function isCandy(c)   { return !!(c && c.sym); }
function isBlocker(c) { return !!(c && c.blocker); }
function isChocolate(c) { return c && c.blocker === BL.CHOCOLATE; }
function isMeringue(c)  { return c && c.blocker === BL.MERINGUE; }
function isSpecial(c) { return !!(c && c.special); }
function isMatchable(c) { return isCandy(c); }
function cellSym(c) { return c ? c.sym : null; }
function cellSpecial(c) { return c ? c.special : null; }

// ====================== Game state ======================
let board = [];                  // 2D array of cells (or nulls)
let jelly = [];                  // 2D array of jelly layer counts
let cellElems = [];              // 2D array of DOM elements
let selected = null;
let dragging = null;
const DRAG_THRESHOLD_FRAC = 0.30;

// Run state
let currentLevel = null;         // level definition object
let currentTheme = THEMES.unicorn;
let SYMBOLS = currentTheme.symbols.slice();
let score = 0;
let moves = 25;
let busy = false;
let combo = 0;
let bonusMultiplier = 1;
let orderProgress = {};          // {0: 3, 2: 5, ...}
let chocolateClearedThisTurn = false;
let pendingDoublePop = [];       // [{r, c}] cells where wrapped should re-explode after gravity

// Persistent
let progress = loadProgress();   // {levels: {1: {stars: 3, best: 5500}}}
let sfxOn   = localStorage.getItem('sm_sfx')   !== '0';
let musicOn = localStorage.getItem('sm_music') !== '0';

// Audio
let audioCtx = null;
let sfxGain  = null;
const musicElements = {};

// Idle hint
let idleTimer = null;
let hintCells = null;

const $ = (id) => document.getElementById(id);
let boardEl, toastEl;

// ====================== Persistence ======================
function loadProgress() {
  try {
    const raw = localStorage.getItem('sm_progress');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { levels: {}, lastUnlocked: 1 };
}
function saveProgress() {
  try { localStorage.setItem('sm_progress', JSON.stringify(progress)); } catch (e) {}
}
function isLevelUnlocked(id) {
  if (id === 1) return true;
  return !!(progress.levels[id - 1] && progress.levels[id - 1].stars > 0);
}
function levelStars(id) {
  return (progress.levels[id] && progress.levels[id].stars) || 0;
}
function levelBest(id) {
  return (progress.levels[id] && progress.levels[id].best) || 0;
}
function recordLevelResult(id, stars, finalScore) {
  const cur = progress.levels[id] || { stars: 0, best: 0 };
  cur.stars = Math.max(cur.stars, stars);
  cur.best  = Math.max(cur.best, finalScore);
  progress.levels[id] = cur;
  saveProgress();
}

// ====================== Background animations ======================
function buildStars() {
  const container = $('stars');
  container.innerHTML = '';
  const symbols = ['✨','⭐','🌟','💫','✦'];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span');
    s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    s.style.left = Math.random() * 100 + '%';
    s.style.top  = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 4) + 's';
    s.style.fontSize = (10 + Math.random() * 14) + 'px';
    container.appendChild(s);
  }
}
function buildGarden() {
  const container = $('garden');
  container.innerHTML = '';
  const bits = currentTheme.garden;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.textContent = bits[Math.floor(Math.random() * bits.length)];
    s.style.left = (Math.random() * 100) + '%';
    s.style.top  = (Math.random() * 100) + '%';
    s.style.fontSize = (18 + Math.random() * 22) + 'px';
    s.style.animationDuration = (5 + Math.random() * 5) + 's';
    s.style.animationDelay = (Math.random() * 3) + 's';
    container.appendChild(s);
  }
}

// ====================== Theme application ======================
function applyTheme(themeKey) {
  const newTheme = THEMES[themeKey] || THEMES.unicorn;
  const themeChanged = newTheme.key !== currentTheme.key;
  currentTheme = newTheme;
  SYMBOLS = currentTheme.symbols.slice();
  const root = document.documentElement;
  Object.entries(currentTheme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  buildGarden();
  if (themeChanged && musicOn && !$('game').classList.contains('hidden')) {
    playThemeMusic();
  }
}

// ====================== Audio ======================
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = sfxOn ? 1 : 0;
      sfxGain.connect(audioCtx.destination);
    } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function setSfxGain() {
  if (sfxGain && audioCtx) {
    sfxGain.gain.linearRampToValueAtTime(sfxOn ? 1 : 0, audioCtx.currentTime + 0.05);
  }
}
function chime(freq, dur, type, vol) {
  const ctx = ensureAudio();
  if (!ctx || !sfxOn) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const v = vol == null ? 0.18 : vol;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain); gain.connect(sfxGain);
  osc.start(); osc.stop(ctx.currentTime + dur + 0.05);
}
function soundSwap()      { chime(660, 0.12, 'sine'); }
function soundMatch(c)    { const f = 523 + c * 80; chime(f, 0.18, 'triangle'); setTimeout(() => chime(f * 1.5, 0.16, 'sine'), 80); }
function soundFail()      { chime(220, 0.15, 'sawtooth', 0.10); }
function soundSelect()    { chime(880, 0.06, 'sine', 0.10); }
function soundLightning() { [880, 1320, 1760].forEach((f, i) => setTimeout(() => chime(f, 0.14, 'sawtooth', 0.12), i * 60)); }
function soundBomb()      { chime(110, 0.4, 'sawtooth', 0.18); setTimeout(() => chime(80, 0.3, 'sine', 0.14), 100); }
function soundRainbow()   { [392, 494, 587, 698, 880, 1047, 1319].forEach((f, i) => setTimeout(() => chime(f, 0.22, 'triangle', 0.14), i * 70)); }
function soundFish()      { [880, 1100, 1320].forEach((f, i) => setTimeout(() => chime(f, 0.15, 'sine', 0.10), i * 70)); }
function soundLevelWin()  { [523, 659, 784, 1046, 1319, 1568].forEach((f, i) => setTimeout(() => chime(f, 0.25, 'triangle'), i * 110)); }
function soundSugarCrush(){ [262, 330, 392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => chime(f, 0.3, 'triangle', 0.14), i * 60)); }

function getMusicEl(themeKey) {
  if (!musicElements[themeKey]) {
    const a = new Audio(THEMES[themeKey].music);
    a.loop = true; a.volume = 0; a.preload = 'auto';
    musicElements[themeKey] = a;
  }
  return musicElements[themeKey];
}
function fadeAudio(el, target, ms) {
  if (!el) return;
  const start = el.volume, startTime = performance.now();
  const step = () => {
    const t = Math.min((performance.now() - startTime) / ms, 1);
    el.volume = Math.max(0, Math.min(1, start + (target - start) * t));
    if (t < 1) requestAnimationFrame(step);
    else if (target === 0) { try { el.pause(); } catch (e) {} }
  };
  if (target > 0 && el.paused) el.play().catch(() => {});
  requestAnimationFrame(step);
}
function playThemeMusic() {
  if (!musicOn) return;
  const el = getMusicEl(currentTheme.key);
  Object.entries(musicElements).forEach(([k, a]) => {
    if (k !== currentTheme.key && !a.paused) fadeAudio(a, 0, 350);
  });
  fadeAudio(el, 0.4, 600);
}
function stopMusic() {
  Object.values(musicElements).forEach(a => fadeAudio(a, 0, 200));
}

// ====================== Board generation ======================
function randSym() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }
function randCandy() { return makeCandy(randSym()); }

function genBoard(blockers) {
  blockers = blockers || {};
  let attempts = 0;
  do {
    board = [];
    for (let r = 0; r < SIZE; r++) {
      board[r] = [];
      for (let c = 0; c < SIZE; c++) {
        let sym, tries = 0;
        do { sym = randSym(); tries++; } while (tries < 30 && wouldMatch(r, c, sym));
        board[r][c] = makeCandy(sym);
      }
    }
    // Place blockers
    if (blockers.chocolate) {
      blockers.chocolate.forEach(({r, c}) => { board[r][c] = makeBlocker(BL.CHOCOLATE); });
    }
    if (blockers.meringue) {
      blockers.meringue.forEach(({r, c, hp}) => { board[r][c] = makeBlocker(BL.MERINGUE, hp || 1); });
    }
    attempts++;
  } while (attempts < 8 && (findMatchGroups().length > 0 || !findHint()));
}
function wouldMatch(r, c, sym) {
  if (c >= 2 && cellSym(board[r][c-1]) === sym && cellSym(board[r][c-2]) === sym) return true;
  if (r >= 2 && board[r-1] && cellSym(board[r-1][c]) === sym && board[r-2] && cellSym(board[r-2][c]) === sym) return true;
  return false;
}

// ====================== Match detection ======================
/**
 * Returns array of match groups:
 *   {type: 'line', cells, orientation, length, center}
 *   {type: 'cross', cells, center}    // L/T
 *   {type: 'square', cells, center}   // 2x2
 * Cells are deduped across groups.
 */
function findMatchGroups() {
  const hLines = [];
  const vLines = [];

  // Find horizontal lines of 3+
  for (let r = 0; r < SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= SIZE; c++) {
      const cur = c < SIZE ? cellSym(board[r][c]) : null;
      const startSym = cellSym(board[r][runStart]);
      if (c === SIZE || cur !== startSym || !startSym) {
        if (c - runStart >= 3 && startSym) {
          const cells = [];
          for (let k = runStart; k < c; k++) cells.push({r, c: k});
          hLines.push({cells, orientation: 'h', length: cells.length});
        }
        runStart = c;
      }
    }
  }
  // Vertical lines
  for (let c = 0; c < SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= SIZE; r++) {
      const cur = r < SIZE ? cellSym(board[r][c]) : null;
      const startSym = cellSym(board[runStart][c]);
      if (r === SIZE || cur !== startSym || !startSym) {
        if (r - runStart >= 3 && startSym) {
          const cells = [];
          for (let k = runStart; k < r; k++) cells.push({r: k, c});
          vLines.push({cells, orientation: 'v', length: cells.length});
        }
        runStart = r;
      }
    }
  }

  const groups = [];
  const claimed = new Set();
  const key = cell => cell.r + ',' + cell.c;

  // Crosses (L/T): horizontal + vertical sharing a cell
  for (const hl of hLines) {
    if (hl._claimed) continue;
    const hSet = new Set(hl.cells.map(key));
    for (const vl of vLines) {
      if (vl._claimed) continue;
      const inter = vl.cells.find(c => hSet.has(key(c)));
      if (inter) {
        const allCells = [...hl.cells];
        for (const c of vl.cells) if (!hSet.has(key(c))) allCells.push(c);
        groups.push({type: 'cross', cells: allCells, center: inter});
        allCells.forEach(c => claimed.add(key(c)));
        hl._claimed = true;
        vl._claimed = true;
        break;
      }
    }
  }
  // Remaining lines
  function addLine(line) {
    if (line._claimed) return;
    const cells = line.cells.filter(c => !claimed.has(key(c)));
    if (cells.length < 3) return;
    const center = cells[Math.floor(cells.length / 2)];
    groups.push({type: 'line', cells, orientation: line.orientation, length: cells.length, center});
    cells.forEach(c => claimed.add(key(c)));
  }
  hLines.forEach(addLine);
  vLines.forEach(addLine);

  // Detect 2x2 squares (jelly fish) — only among unclaimed cells
  for (let r = 0; r < SIZE - 1; r++) {
    for (let c = 0; c < SIZE - 1; c++) {
      const s = cellSym(board[r][c]);
      if (!s) continue;
      if (cellSym(board[r][c+1]) === s &&
          cellSym(board[r+1][c]) === s &&
          cellSym(board[r+1][c+1]) === s) {
        const cells = [{r,c},{r,c:c+1},{r:r+1,c},{r:r+1,c:c+1}];
        if (cells.every(p => !claimed.has(key(p)))) {
          groups.push({type: 'square', cells, center: cells[0]});
          cells.forEach(p => claimed.add(key(p)));
        }
      }
    }
  }
  return groups;
}

function swapVals(r1, c1, r2, c2) {
  const t = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = t;
}

function isAdjacent(a, b) {
  return (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1;
}

// ====================== Rendering ======================
function buildBoard() {
  boardEl.innerHTML = '';
  cellElems = [];
  for (let r = 0; r < SIZE; r++) {
    cellElems[r] = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      attachCellHandlers(cell);
      boardEl.appendChild(cell);
      cellElems[r][c] = cell;
      applyCellAppearance(r, c);
    }
  }
}

function applyCellAppearance(r, c) {
  const cell = cellElems[r][c];
  if (!cell) return;
  const data = board[r][c];
  cell.classList.remove(
    'special-striped-h','special-striped-v','special-wrapped',
    'special-colorbomb','special-jellyfish',
    'blocker-chocolate','blocker-meringue',
    'hp1','hp2','hp3','jelly1','jelly2','hint'
  );
  cell.removeAttribute('data-hp');

  // Jelly underlay
  const j = (jelly[r] && jelly[r][c]) || 0;
  if (j === 1) cell.classList.add('jelly1');
  else if (j >= 2) cell.classList.add('jelly2');

  if (!data) {
    cell.textContent = '';
    return;
  }
  if (isBlocker(data)) {
    cell.textContent = '';
    if (data.blocker === BL.CHOCOLATE) cell.classList.add('blocker-chocolate');
    else if (data.blocker === BL.MERINGUE) {
      cell.classList.add('blocker-meringue');
      cell.classList.add('hp' + Math.min(3, data.hp || 1));
      cell.dataset.hp = String(data.hp || 1);
    }
    return;
  }
  // Candy
  cell.textContent = data.sym;
  if (data.special) cell.classList.add('special-' + data.special);
}
function refreshAll() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      applyCellAppearance(r, c);
}

// ====================== Input: drag + tap ======================
function attachCellHandlers(cell) {
  cell.addEventListener('pointerdown',  onPointerDown);
  cell.addEventListener('pointermove',  onPointerMove);
  cell.addEventListener('pointerup',    onPointerUp);
  cell.addEventListener('pointercancel', onPointerCancel);
}
function cellSize() {
  return cellElems[0] && cellElems[0][0] ? cellElems[0][0].offsetWidth : 60;
}
function clearHint() {
  if (hintCells) {
    hintCells.forEach(({r, c}) => cellElems[r] && cellElems[r][c] && cellElems[r][c].classList.remove('hint'));
    hintCells = null;
  }
}
function bumpIdle() {
  clearHint();
  clearTimeout(idleTimer);
  if (busy) return;
  idleTimer = setTimeout(() => {
    if (busy) return;
    const hint = findHint();
    if (hint) {
      hintCells = hint;
      hint.forEach(({r, c}) => cellElems[r] && cellElems[r][c] && cellElems[r][c].classList.add('hint'));
    }
  }, 5000);
}

function onPointerDown(e) {
  if (busy) return;
  const cell = e.currentTarget;
  const r = +cell.dataset.r, c = +cell.dataset.c;
  if (!isCandy(board[r][c]) && !isSpecial(board[r][c])) return; // can't grab blockers
  ensureAudio();
  bumpIdle();
  dragging = {r, c, startX: e.clientX, startY: e.clientY, moved: false};
  try { cell.setPointerCapture(e.pointerId); } catch (err) {}
  cell.classList.add('lifted');
}
function onPointerMove(e) {
  if (!dragging || busy) return;
  const dx = e.clientX - dragging.startX;
  const dy = e.clientY - dragging.startY;
  const dist = Math.hypot(dx, dy);
  const threshold = cellSize() * DRAG_THRESHOLD_FRAC;
  if (dist > threshold) {
    let dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
    else dr = dy > 0 ? 1 : -1;
    const targetR = dragging.r + dr, targetC = dragging.c + dc;
    const start = {r: dragging.r, c: dragging.c};
    cellElems[start.r][start.c].classList.remove('lifted');
    dragging.moved = true;
    dragging = null;
    if (selected) {
      cellElems[selected.r][selected.c].classList.remove('selected');
      selected = null;
    }
    if (targetR >= 0 && targetR < SIZE && targetC >= 0 && targetC < SIZE) {
      attemptSwap(start, {r: targetR, c: targetC});
    }
  }
}
function onPointerUp(e) {
  if (!dragging) return;
  const r = dragging.r, c = dragging.c;
  cellElems[r][c].classList.remove('lifted');
  if (!dragging.moved) handleTap(r, c);
  dragging = null;
}
function onPointerCancel(e) {
  if (!dragging) return;
  cellElems[dragging.r][dragging.c].classList.remove('lifted');
  dragging = null;
}
function handleTap(r, c) {
  if (busy) return;
  bumpIdle();
  if (!isCandy(board[r][c]) && !isSpecial(board[r][c])) return;
  if (!selected) {
    selected = {r, c};
    cellElems[r][c].classList.add('selected');
    soundSelect();
  } else if (selected.r === r && selected.c === c) {
    cellElems[r][c].classList.remove('selected');
    selected = null;
  } else if (isAdjacent(selected, {r, c})) {
    const a = selected;
    cellElems[a.r][a.c].classList.remove('selected');
    selected = null;
    attemptSwap(a, {r, c});
  } else {
    cellElems[selected.r][selected.c].classList.remove('selected');
    selected = {r, c};
    cellElems[r][c].classList.add('selected');
    soundSelect();
  }
}

function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

// ====================== Swap flow ======================
async function attemptSwap(a, b) {
  busy = true;
  clearHint();
  if (!isMatchable(board[a.r][a.c]) && !isSpecial(board[a.r][a.c])) { busy = false; return; }
  if (!isMatchable(board[b.r][b.c]) && !isSpecial(board[b.r][b.c])) { busy = false; return; }

  soundSwap();
  swapVals(a.r, a.c, b.r, b.c);
  applyCellAppearance(a.r, a.c);
  applyCellAppearance(b.r, b.c);
  cellElems[a.r][a.c].classList.add('dropping');
  cellElems[b.r][b.c].classList.add('dropping');
  await delay(180);
  cellElems[a.r][a.c].classList.remove('dropping');
  cellElems[b.r][b.c].classList.remove('dropping');

  const dataA = board[a.r][a.c];
  const dataB = board[b.r][b.c];
  const specA = cellSpecial(dataA);
  const specB = cellSpecial(dataB);

  // Special + Special combination?
  if (specA && specB) {
    moves--;
    bumpPill('pillMoves');
    updateHUD();
    combo = 0;
    bonusMultiplier = 1;
    chocolateClearedThisTurn = false;
    await processSpecialCombo(a, b, specA, specB);
    await postTurnSequence();
    busy = false;
    bumpIdle();
    checkEndStates();
    return;
  }

  // Single special swapped → activate it
  // Color bomb: swapped with any candy, clears all of that color
  if (specA === SP.COLORBOMB || specB === SP.COLORBOMB) {
    moves--;
    bumpPill('pillMoves');
    updateHUD();
    combo = 0;
    bonusMultiplier = 1;
    chocolateClearedThisTurn = false;
    const bombPos = (specA === SP.COLORBOMB) ? a : b;
    const otherPos = (specA === SP.COLORBOMB) ? b : a;
    const otherSym = cellSym(board[otherPos.r][otherPos.c]);
    await activateColorBomb(bombPos, otherSym);
    await postTurnSequence();
    busy = false;
    bumpIdle();
    checkEndStates();
    return;
  }

  // Find regular matches
  const groups = findMatchGroups();
  const hasSpecialInvolved = !!(specA || specB);

  if (groups.length === 0 && !hasSpecialInvolved) {
    soundFail();
    swapVals(a.r, a.c, b.r, b.c);
    applyCellAppearance(a.r, a.c);
    applyCellAppearance(b.r, b.c);
    shake(cellElems[a.r][a.c]);
    shake(cellElems[b.r][b.c]);
    await delay(250);
    busy = false;
    bumpIdle();
    return;
  }

  moves--;
  bumpPill('pillMoves');
  updateHUD();
  combo = 0;
  bonusMultiplier = 1;
  chocolateClearedThisTurn = false;
  pendingDoublePop = [];

  if (groups.length === 0 && hasSpecialInvolved) {
    // Single striped/wrapped/jellyfish swapped without a match → activate at swap target
    const triggerCells = [];
    if (specA) triggerCells.push({pos: a, sp: specA});
    if (specB) triggerCells.push({pos: b, sp: specB});
    await activateSpecials(triggerCells);
  } else {
    // Identify swap target cell as the place to spawn specials
    const swapTarget = b; // by convention the dragged-to position
    await processMatches(groups, swapTarget);
  }
  await postTurnSequence();
  busy = false;
  bumpIdle();
  checkEndStates();
}

async function postTurnSequence() {
  // Spread chocolate if no chocolate was cleared this turn
  await spreadChocolate();
  if (!findHint()) {
    showToast('Shuffle! ✨');
    await delay(400);
    do {
      // Reshuffle non-blocker cells while preserving blockers and jelly
      reshuffleCandies();
    } while (findMatchGroups().length > 0);
    refreshAll();
    animateAllDrop();
  }
}

function reshuffleCandies() {
  const symbols = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isCandy(board[r][c]) && !isSpecial(board[r][c])) symbols.push(board[r][c].sym);
    }
  }
  // Fisher-Yates
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }
  let idx = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isCandy(board[r][c]) && !isSpecial(board[r][c])) {
        board[r][c] = makeCandy(symbols[idx++]);
      }
    }
  }
}

function shake(el) {
  el.animate(
    [{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(-5px)'},{transform:'translateX(0)'}],
    {duration: 240, easing: 'ease-in-out'}
  );
}

// ====================== Match processing ======================
async function processMatches(initialGroups, swapTarget) {
  let groups = initialGroups || findMatchGroups();
  while (groups.length > 0) {
    combo++;

    const cellsToClear = new Set();
    const specialsToSpawn = []; // {pos, kind, sym}
    const specialsTriggered = []; // {pos, sp} for matched-with specials
    const key = cell => cell.r + ',' + cell.c;

    for (const g of groups) {
      // Determine if a special should be spawned for this group
      let spawnAt = null, spawnKind = null;
      if (swapTarget && g.cells.some(c => c.r === swapTarget.r && c.c === swapTarget.c)) {
        spawnAt = swapTarget;
      } else {
        // pick the center cell of the group
        spawnAt = g.center;
      }
      const sym = cellSym(board[g.cells[0].r][g.cells[0].c]) || cellSym(board[g.cells[g.cells.length-1].r][g.cells[g.cells.length-1].c]);

      if (g.type === 'line') {
        if (g.length >= 5) {
          spawnKind = SP.COLORBOMB;
          drawLightningTrail(g.cells, '#a26bff');
          showToast('🌟 Color Bomb!');
        } else if (g.length === 4) {
          spawnKind = (g.orientation === 'h') ? SP.STRIPED_H : SP.STRIPED_V;
          drawLightningTrail(g.cells, '#ffd84d');
          showToast(g.orientation === 'h' ? '⚡ Striped (row)!' : '⚡ Striped (col)!');
        } else {
          drawLightningTrail(g.cells, '#ffffff');
        }
      } else if (g.type === 'cross') {
        spawnKind = SP.WRAPPED;
        drawLightningTrail(g.cells, '#ff6fb1');
        showToast('🎁 Wrapped!');
      } else if (g.type === 'square') {
        spawnKind = SP.JELLYFISH;
        drawLightningTrail(g.cells, '#5fb8ff');
        showToast('🐠 Jelly Fish!');
      }

      // Mark all match cells for clearing EXCEPT the spawn cell
      for (const cell of g.cells) {
        if (spawnKind && cell.r === spawnAt.r && cell.c === spawnAt.c) continue;
        cellsToClear.add(key(cell));
      }
      // If a special piece is in the match (other than the spawn target), trigger it
      for (const cell of g.cells) {
        const data = board[cell.r][cell.c];
        if (isSpecial(data) && !(cell.r === spawnAt.r && cell.c === spawnAt.c)) {
          specialsTriggered.push({pos: cell, sp: data.special});
        }
      }
      if (spawnKind) {
        specialsToSpawn.push({pos: spawnAt, kind: spawnKind, sym: sym});
      }
    }

    // Handle triggered specials chain (recursive expansion)
    const expandedExtra = await expandSpecials(specialsTriggered, cellsToClear);

    // Convert to array
    const matchCells = [];
    cellsToClear.forEach(s => {
      const [r, c] = s.split(',').map(Number);
      matchCells.push({r, c});
    });

    const points = matchCells.length * 20 * Math.max(1, combo) * bonusMultiplier;
    score += points;

    soundMatch(combo);
    if (combo >= 2) {
      const word = combo >= 4 ? TOAST_WORDS[Math.floor(Math.random() * TOAST_WORDS.length)] : null;
      showToast('Combo x' + combo + (word ? ' — ' + word : '!') + ' ' + (combo >= 3 ? '💖' : '✨'));
    }
    if (combo >= 3) screenFlash();

    // Track orders
    for (const m of matchCells) {
      const data = board[m.r][m.c];
      if (isCandy(data)) {
        const sym = data.sym;
        const idx = SYMBOLS.indexOf(sym);
        if (idx >= 0) orderProgress[idx] = (orderProgress[idx] || 0) + 1;
      }
    }

    // Hit blockers adjacent to cleared cells
    damageBlockers(matchCells);

    // Damage jelly under cleared cells
    for (const m of matchCells) {
      if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
    }

    // Clear & cascade
    await clearAndCascade(matchCells, points, specialsToSpawn);

    // Apply double-pop wrapped re-explosion
    if (pendingDoublePop.length > 0) {
      const second = new Set();
      for (const p of pendingDoublePop) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = p.r + dr, nc = p.c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) second.add(nr + ',' + nc);
          }
      }
      pendingDoublePop = [];
      const secondCells = Array.from(second).map(s => { const [r,c] = s.split(',').map(Number); return {r, c}; });
      const extraPoints = secondCells.length * 30 * Math.max(1, combo);
      score += extraPoints;
      damageBlockers(secondCells);
      for (const m of secondCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
      soundBomb();
      screenFlash();
      await clearAndCascade(secondCells, extraPoints, []);
    }

    swapTarget = null; // only first iteration uses swap target
    groups = findMatchGroups();
  }
  updateHUD();
}

// Expand specials triggered by matches: recursively add their effect cells
async function expandSpecials(triggered, cellsToClear) {
  if (!triggered || triggered.length === 0) return;
  const visited = new Set();
  const queue = [...triggered];
  while (queue.length > 0) {
    const {pos, sp} = queue.shift();
    const k = pos.r + ',' + pos.c;
    if (visited.has(k)) continue;
    visited.add(k);
    cellsToClear.add(k);
    const newCells = applySpecialEffect(pos, sp, board[pos.r][pos.c]);
    for (const nc of newCells) {
      cellsToClear.add(nc.r + ',' + nc.c);
      const data = board[nc.r][nc.c];
      if (isSpecial(data)) {
        if (!visited.has(nc.r + ',' + nc.c)) {
          queue.push({pos: nc, sp: data.special});
        }
      }
    }
  }
}

// Returns cells affected by activating a special at pos.
function applySpecialEffect(pos, sp, data) {
  const cells = [];
  if (sp === SP.STRIPED_H) {
    for (let c = 0; c < SIZE; c++) cells.push({r: pos.r, c});
    soundLightning();
  } else if (sp === SP.STRIPED_V) {
    for (let r = 0; r < SIZE; r++) cells.push({r, c: pos.c});
    soundLightning();
  } else if (sp === SP.WRAPPED) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const nr = pos.r + dr, nc = pos.c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) cells.push({r: nr, c: nc});
      }
    pendingDoublePop.push({r: pos.r, c: pos.c});
    soundBomb();
    screenFlash();
  } else if (sp === SP.COLORBOMB) {
    // Without a swap target color, clear a random color
    const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (cellSym(board[r][c]) === sym) cells.push({r, c});
    soundRainbow();
    screenFlash();
  } else if (sp === SP.JELLYFISH) {
    // Pick 3 random target cells - prefer blockers/jellied cells
    const targets = [];
    const candidates = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (r === pos.r && c === pos.c) continue;
        const cell = board[r][c];
        if (!cell) continue;
        let weight = 1;
        if (jelly[r] && jelly[r][c] > 0) weight = 5;
        if (isBlocker(cell)) weight = 8;
        candidates.push({r, c, weight});
      }
    }
    for (let i = 0; i < 3 && candidates.length > 0; i++) {
      // weighted random
      const total = candidates.reduce((s, x) => s + x.weight, 0);
      let pick = Math.random() * total;
      let idx = 0;
      for (idx = 0; idx < candidates.length; idx++) {
        pick -= candidates[idx].weight;
        if (pick <= 0) break;
      }
      idx = Math.min(idx, candidates.length - 1);
      const t = candidates.splice(idx, 1)[0];
      targets.push({r: t.r, c: t.c});
      cells.push({r: t.r, c: t.c});
    }
    soundFish();
    // Visual fish swim
    for (const t of targets) {
      flyFishToTarget(pos, t);
    }
  }
  return cells;
}

// Activate specials directly when player swapped them without a match
async function activateSpecials(triggers) {
  combo = 1;
  const cellsToClear = new Set();
  for (const t of triggers) {
    cellsToClear.add(t.pos.r + ',' + t.pos.c);
    const newCells = applySpecialEffect(t.pos, t.sp, board[t.pos.r][t.pos.c]);
    newCells.forEach(c => cellsToClear.add(c.r + ',' + c.c));
  }
  // Chain through specials in the affected cells
  const queue = [];
  cellsToClear.forEach(k => {
    const [r, c] = k.split(',').map(Number);
    const data = board[r][c];
    if (isSpecial(data) && !triggers.some(t => t.pos.r === r && t.pos.c === c)) {
      queue.push({pos: {r, c}, sp: data.special});
    }
  });
  await expandSpecials(queue, cellsToClear);

  const matchCells = [];
  cellsToClear.forEach(s => { const [r, c] = s.split(',').map(Number); matchCells.push({r, c}); });
  const points = matchCells.length * 25 * bonusMultiplier;
  score += points;
  for (const m of matchCells) {
    const data = board[m.r][m.c];
    if (isCandy(data)) {
      const idx = SYMBOLS.indexOf(data.sym);
      if (idx >= 0) orderProgress[idx] = (orderProgress[idx] || 0) + 1;
    }
  }
  damageBlockers(matchCells);
  for (const m of matchCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
  await clearAndCascade(matchCells, points, []);

  if (pendingDoublePop.length > 0) {
    const second = new Set();
    for (const p of pendingDoublePop) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = p.r + dr, nc = p.c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) second.add(nr + ',' + nc);
        }
    }
    pendingDoublePop = [];
    const secondCells = Array.from(second).map(s => { const [r,c] = s.split(',').map(Number); return {r, c}; });
    const extraPoints = secondCells.length * 30;
    score += extraPoints;
    damageBlockers(secondCells);
    for (const m of secondCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
    soundBomb();
    screenFlash();
    await clearAndCascade(secondCells, extraPoints, []);
  }

  // Cascade further matches
  let groups = findMatchGroups();
  if (groups.length > 0) await processMatches(groups, null);
}

// Activate color bomb swapped with a regular candy
async function activateColorBomb(bombPos, targetSym) {
  combo = 1;
  showToast('🌟 Color Bomb!');
  soundRainbow();
  screenFlash();
  const cellsToClear = new Set();
  cellsToClear.add(bombPos.r + ',' + bombPos.c);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (cellSym(board[r][c]) === targetSym) cellsToClear.add(r + ',' + c);
    }
  }
  // Trigger any specials within
  const queue = [];
  cellsToClear.forEach(k => {
    const [r, c] = k.split(',').map(Number);
    if (isSpecial(board[r][c]) && !(r === bombPos.r && c === bombPos.c)) {
      queue.push({pos: {r, c}, sp: board[r][c].special});
    }
  });
  await expandSpecials(queue, cellsToClear);

  const matchCells = [];
  cellsToClear.forEach(s => { const [r, c] = s.split(',').map(Number); matchCells.push({r, c}); });
  const points = matchCells.length * 50;
  score += points;
  for (const m of matchCells) {
    const data = board[m.r][m.c];
    if (isCandy(data)) {
      const idx = SYMBOLS.indexOf(data.sym);
      if (idx >= 0) orderProgress[idx] = (orderProgress[idx] || 0) + 1;
    }
  }
  damageBlockers(matchCells);
  for (const m of matchCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
  await clearAndCascade(matchCells, points, []);
  let groups = findMatchGroups();
  if (groups.length > 0) await processMatches(groups, null);
}

// ====================== Special + Special combos ======================
async function processSpecialCombo(a, b, spA, spB) {
  bonusMultiplier = 2;
  showToast('💥 Super Combo!');
  screenFlash();
  const cellsToClear = new Set();
  cellsToClear.add(a.r + ',' + a.c);
  cellsToClear.add(b.r + ',' + b.c);

  const isStriped = sp => sp === SP.STRIPED_H || sp === SP.STRIPED_V;
  const center = b; // landing position

  if (spA === SP.COLORBOMB && spB === SP.COLORBOMB) {
    // Clear entire board
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        cellsToClear.add(r + ',' + c);
    soundRainbow();
    showToast('🌈 Galaxy!');
  } else if (spA === SP.COLORBOMB || spB === SP.COLORBOMB) {
    const cb = (spA === SP.COLORBOMB) ? a : b;
    const other = (spA === SP.COLORBOMB) ? b : a;
    const otherSp = (spA === SP.COLORBOMB) ? spB : spA;
    const otherSym = cellSym(board[other.r][other.c]);
    if (isStriped(otherSp)) {
      // Convert all of color → striped, activate
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          if (cellSym(board[r][c]) === otherSym) {
            // Random orientation
            const sp = Math.random() < 0.5 ? SP.STRIPED_H : SP.STRIPED_V;
            board[r][c] = makeCandy(otherSym, sp);
            cellsToClear.add(r + ',' + c);
            const cells = applySpecialEffect({r, c}, sp, board[r][c]);
            cells.forEach(p => cellsToClear.add(p.r + ',' + p.c));
          }
        }
      soundLightning();
    } else if (otherSp === SP.WRAPPED) {
      // Convert all of color → wrapped, explode (single explosion to keep it simple)
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          if (cellSym(board[r][c]) === otherSym) {
            cellsToClear.add(r + ',' + c);
            // Add 3x3 around
            for (let dr = -1; dr <= 1; dr++)
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) cellsToClear.add(nr + ',' + nc);
              }
          }
        }
      soundBomb();
    } else if (otherSp === SP.JELLYFISH) {
      // Eat lots
      const cells = applySpecialEffect(other, SP.JELLYFISH, board[other.r][other.c]);
      cells.forEach(p => cellsToClear.add(p.r + ',' + p.c));
      // Repeat for each color symbol
      for (const sym of SYMBOLS) {
        for (let r = 0; r < SIZE; r++)
          for (let c = 0; c < SIZE; c++)
            if (cellSym(board[r][c]) === sym && Math.random() < 0.3) cellsToClear.add(r + ',' + c);
      }
      soundFish();
    }
  } else if (isStriped(spA) && isStriped(spB)) {
    // Cross: clear row + column
    for (let c = 0; c < SIZE; c++) cellsToClear.add(center.r + ',' + c);
    for (let r = 0; r < SIZE; r++) cellsToClear.add(r + ',' + center.c);
    soundLightning();
    showToast('⚡ Cross!');
  } else if ((isStriped(spA) && spB === SP.WRAPPED) || (spA === SP.WRAPPED && isStriped(spB))) {
    // Plus sign 3 wide
    for (let dr = -1; dr <= 1; dr++) {
      for (let c = 0; c < SIZE; c++) {
        const r = center.r + dr;
        if (r >= 0 && r < SIZE) cellsToClear.add(r + ',' + c);
      }
    }
    for (let dc = -1; dc <= 1; dc++) {
      for (let r = 0; r < SIZE; r++) {
        const c = center.c + dc;
        if (c >= 0 && c < SIZE) cellsToClear.add(r + ',' + c);
      }
    }
    soundLightning();
    showToast('⚡💣 Mega Plus!');
  } else if (spA === SP.WRAPPED && spB === SP.WRAPPED) {
    // 5x5 around center
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const nr = center.r + dr, nc = center.c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) cellsToClear.add(nr + ',' + nc);
      }
    pendingDoublePop.push({r: center.r, c: center.c});
    soundBomb();
    showToast('💣💣 Mega Bomb!');
  } else {
    // Default: union of effects
    for (const {p, sp} of [{p: a, sp: spA}, {p: b, sp: spB}]) {
      if (sp) {
        const cells = applySpecialEffect(p, sp, board[p.r][p.c]);
        cells.forEach(c => cellsToClear.add(c.r + ',' + c.c));
      }
    }
  }

  const queue = [];
  cellsToClear.forEach(k => {
    const [r, c] = k.split(',').map(Number);
    if (isSpecial(board[r][c]) && !(r === a.r && c === a.c) && !(r === b.r && c === b.c)) {
      queue.push({pos: {r, c}, sp: board[r][c].special});
    }
  });
  await expandSpecials(queue, cellsToClear);

  const matchCells = [];
  cellsToClear.forEach(s => { const [r, c] = s.split(',').map(Number); matchCells.push({r, c}); });
  const points = matchCells.length * 60;
  score += points;
  for (const m of matchCells) {
    const data = board[m.r][m.c];
    if (isCandy(data)) {
      const idx = SYMBOLS.indexOf(data.sym);
      if (idx >= 0) orderProgress[idx] = (orderProgress[idx] || 0) + 1;
    }
  }
  damageBlockers(matchCells);
  for (const m of matchCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
  await clearAndCascade(matchCells, points, []);
  if (pendingDoublePop.length > 0) {
    const second = new Set();
    for (const p of pendingDoublePop) {
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const nr = p.r + dr, nc = p.c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) second.add(nr + ',' + nc);
        }
    }
    pendingDoublePop = [];
    const secondCells = Array.from(second).map(s => { const [r,c] = s.split(',').map(Number); return {r, c}; });
    const extraPoints = secondCells.length * 50;
    score += extraPoints;
    damageBlockers(secondCells);
    for (const m of secondCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
    soundBomb();
    await clearAndCascade(secondCells, extraPoints, []);
  }
  let groups = findMatchGroups();
  if (groups.length > 0) await processMatches(groups, null);
}

// ====================== Blocker damage ======================
function damageBlockers(matchCells) {
  // Adjacent blockers take a hit
  const hit = new Set();
  for (const m of matchCells) {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = m.r + dr, nc = m.c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const data = board[nr][nc];
      if (isBlocker(data)) hit.add(nr + ',' + nc);
    }
  }
  hit.forEach(k => {
    const [r, c] = k.split(',').map(Number);
    const data = board[r][c];
    if (isChocolate(data)) {
      board[r][c] = null;
      chocolateClearedThisTurn = true;
      // Light particle at position
      spawnParticlesAtRC(r, c);
    } else if (isMeringue(data)) {
      data.hp = (data.hp || 1) - 1;
      if (data.hp <= 0) {
        board[r][c] = null;
        spawnParticlesAtRC(r, c);
      }
      applyCellAppearance(r, c);
    }
  });
}

async function spreadChocolate() {
  // Find chocolate cells. If none cleared this turn, spread to a random adjacent candy.
  const chocCells = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (isChocolate(board[r][c])) chocCells.push({r, c});
  if (chocCells.length === 0) return;
  if (chocolateClearedThisTurn) return;
  // Pick a random chocolate, spread to random adjacent candy
  const pickFrom = chocCells.slice();
  while (pickFrom.length > 0) {
    const idx = Math.floor(Math.random() * pickFrom.length);
    const choc = pickFrom.splice(idx, 1)[0];
    const adj = [];
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = choc.r + dr, nc = choc.c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const data = board[nr][nc];
      if (isCandy(data) && !isSpecial(data)) adj.push({r: nr, c: nc});
    }
    if (adj.length > 0) {
      const target = adj[Math.floor(Math.random() * adj.length)];
      board[target.r][target.c] = makeBlocker(BL.CHOCOLATE);
      applyCellAppearance(target.r, target.c);
      cellElems[target.r][target.c].animate(
        [{transform: 'scale(0.3)', opacity: 0.4},{transform: 'scale(1)', opacity: 1}],
        {duration: 350, easing: 'ease-out'}
      );
      await delay(360);
      return;
    }
  }
}

// ====================== Clear & cascade ======================
async function clearAndCascade(matchCells, totalPoints, specialsToSpawn) {
  // Filter to only cells that aren't blocker-only / locked
  // Glow effect on matched candy cells
  const animatable = matchCells.filter(m => isCandy(board[m.r][m.c]));
  for (const m of animatable) cellElems[m.r][m.c].classList.add('glowing');
  await delay(200);

  // Score popup at centroid of cleared cells
  if (totalPoints && matchCells.length > 0) {
    const cx = matchCells.reduce((a, m) => a + m.c, 0) / matchCells.length;
    const cy = matchCells.reduce((a, m) => a + m.r, 0) / matchCells.length;
    spawnScorePopup(Math.round(cx), Math.round(cy), totalPoints);
  }

  // Pop animation, particles, fly-to-score
  for (const m of animatable) {
    const cell = cellElems[m.r][m.c];
    cell.classList.remove('glowing');
    spawnParticles(cell);
    cell.classList.add('matched');
    flyToScore(cell);
  }
  await delay(320);

  // Clear cells
  for (const m of matchCells) {
    const cell = cellElems[m.r][m.c];
    if (cell) cell.classList.remove('matched');
    if (isCandy(board[m.r][m.c])) board[m.r][m.c] = null;
    applyCellAppearance(m.r, m.c);
  }

  // Spawn special pieces
  if (specialsToSpawn && specialsToSpawn.length > 0) {
    for (const sp of specialsToSpawn) {
      board[sp.pos.r][sp.pos.c] = makeCandy(sp.sym, sp.kind);
      applyCellAppearance(sp.pos.r, sp.pos.c);
      cellElems[sp.pos.r][sp.pos.c].animate(
        [{transform: 'scale(0)', opacity: 0},{transform: 'scale(1.3)', opacity: 1},{transform: 'scale(1)', opacity: 1}],
        {duration: 400, easing: 'ease-out'}
      );
    }
  }

  // Gravity (only candy cells move; blockers stay put)
  for (let c = 0; c < SIZE; c++) {
    let writeRow = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const cell = board[r][c];
      if (cell !== null) {
        if (isBlocker(cell)) {
          // Blocker stays in place; reset write pointer above it
          writeRow = r - 1;
          continue;
        }
        if (writeRow !== r) {
          board[writeRow][c] = cell;
          board[r][c] = null;
        }
        writeRow--;
      }
    }
    // Refill above writeRow with random candy, but only above the next blocker wall
    for (let r = writeRow; r >= 0; r--) {
      if (isBlocker(board[r][c])) {
        // skip blocker (shouldn't happen since blockers are preserved above)
        continue;
      }
      if (board[r][c] === null) board[r][c] = makeCandy(randSym());
    }
  }

  refreshAll();
  animateAllDrop();
  bumpPill('pillScore');
  updateHUD();
  await delay(360);
}

// ====================== Animations ======================
function animateAllDrop() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const cell = cellElems[r][c];
      if (!cell) continue;
      cell.classList.remove('dropping');
      void cell.offsetWidth;
      cell.classList.add('dropping');
    }
}
function spawnParticles(cell) {
  const rect = cell.getBoundingClientRect();
  const wrapRect = boardEl.getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top  - wrapRect.top  + rect.height / 2;
  const sparkles = currentTheme.particles;
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
    p.style.left = cx + 'px';
    p.style.top  = cy + 'px';
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 70;
    p.style.setProperty('--tx', (Math.cos(angle) * dist - rect.width / 2) + 'px');
    p.style.setProperty('--ty', (Math.sin(angle) * dist - rect.height / 2) + 'px');
    boardEl.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}
function spawnParticlesAtRC(r, c) {
  const cell = cellElems[r] && cellElems[r][c];
  if (cell) spawnParticles(cell);
}
function spawnScorePopup(boardCol, boardRow, points) {
  const r = Math.max(0, Math.min(SIZE - 1, boardRow));
  const c = Math.max(0, Math.min(SIZE - 1, boardCol));
  const cell = cellElems[r][c];
  if (!cell) return;
  const rect = cell.getBoundingClientRect();
  const wrapRect = boardEl.getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top  - wrapRect.top  + rect.height / 2;
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = '+' + points.toLocaleString();
  popup.style.left = cx + 'px';
  popup.style.top  = cy + 'px';
  boardEl.appendChild(popup);
  setTimeout(() => popup.remove(), 1100);
}
function flyToScore(cell) {
  const cellRect = cell.getBoundingClientRect();
  const scoreRect = $('pillScore').getBoundingClientRect();
  const fromX = cellRect.left + cellRect.width / 2;
  const fromY = cellRect.top  + cellRect.height / 2;
  const toX = scoreRect.left + scoreRect.width / 2;
  const toY = scoreRect.top  + scoreRect.height / 2;
  const sparkle = document.createElement('div');
  sparkle.className = 'fly-sparkle';
  sparkle.textContent = currentTheme.particles[Math.floor(Math.random() * currentTheme.particles.length)];
  sparkle.style.left = fromX + 'px';
  sparkle.style.top  = fromY + 'px';
  document.body.appendChild(sparkle);
  const duration = 600;
  const startTime = performance.now();
  const arcHeight = 60 + Math.random() * 30;
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    const x = fromX + (toX - fromX) * eased;
    const y = fromY + (toY - fromY) * eased - Math.sin(eased * Math.PI) * arcHeight;
    sparkle.style.transform = 'translate(' + (x - fromX) + 'px,' + (y - fromY) + 'px) scale(' + (1 + t * 0.3) + ') rotate(' + (t * 540) + 'deg)';
    sparkle.style.opacity = t < 0.8 ? '1' : (1 - (t - 0.8) / 0.2).toString();
    if (t < 1) requestAnimationFrame(step);
    else sparkle.remove();
  }
  requestAnimationFrame(step);
}
function flyFishToTarget(from, to) {
  const fromCell = cellElems[from.r][from.c];
  const toCell   = cellElems[to.r][to.c];
  if (!fromCell || !toCell) return;
  const a = fromCell.getBoundingClientRect();
  const b = toCell.getBoundingClientRect();
  const fromX = a.left + a.width / 2;
  const fromY = a.top  + a.height / 2;
  const toX = b.left + b.width / 2;
  const toY = b.top  + b.height / 2;
  const fish = document.createElement('div');
  fish.className = 'fly-sparkle';
  fish.textContent = '🐠';
  fish.style.left = fromX + 'px';
  fish.style.top  = fromY + 'px';
  fish.style.fontSize = '28px';
  document.body.appendChild(fish);
  const duration = 500;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
    const x = fromX + (toX - fromX) * eased;
    const y = fromY + (toY - fromY) * eased - Math.sin(eased * Math.PI) * 30;
    fish.style.transform = 'translate(' + (x - fromX) + 'px,' + (y - fromY) + 'px) scaleX(' + (toX > fromX ? 1 : -1) + ')';
    if (t < 1) requestAnimationFrame(step);
    else fish.remove();
  }
  requestAnimationFrame(step);
}
function drawLightningTrail(cells, color) {
  if (cells.length < 2) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('lightning-line');
  svg.style.width = window.innerWidth + 'px';
  svg.style.height = window.innerHeight + 'px';
  svg.setAttribute('viewBox', '0 0 ' + window.innerWidth + ' ' + window.innerHeight);
  const filterId = 'glow' + Date.now() + Math.random().toString(36).slice(2, 6);
  const defs = document.createElementNS(svgNS, 'defs');
  const filter = document.createElementNS(svgNS, 'filter');
  filter.setAttribute('id', filterId);
  filter.innerHTML = '<feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>';
  defs.appendChild(filter);
  svg.appendChild(defs);
  const path = document.createElementNS(svgNS, 'path');
  let d = '';
  cells.forEach((cellPos, i) => {
    const el = cellElems[cellPos.r] && cellElems[cellPos.r][cellPos.c];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    d += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
  });
  path.setAttribute('d', d);
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('fill', 'none');
  path.setAttribute('filter', 'url(#' + filterId + ')');
  path.style.strokeDasharray = '500';
  path.style.strokeDashoffset = '500';
  svg.appendChild(path);
  document.body.appendChild(svg);
  path.animate(
    [{strokeDashoffset: 500, opacity: 0.2},{strokeDashoffset: 0, opacity: 1},{strokeDashoffset: -500, opacity: 0}],
    {duration: 500, easing: 'ease-out'}
  );
  setTimeout(() => svg.remove(), 520);
}
function screenFlash() {
  const f = $('comboFlash');
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
}
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
}
function bumpPill(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ====================== Hint finder ======================
// Returns 2 cells [{r,c},{r,c}] that, when swapped, would create a match
function findHint() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      // Special pieces are always usable
      if (isSpecial(board[r][c])) return [{r, c}, {r, c}]; // signal that one cell is enough
      if (!isCandy(board[r][c])) continue;
      if (c < SIZE - 1 && isMatchable(board[r][c+1])) {
        swapVals(r, c, r, c+1);
        const has = findMatchGroups().length > 0;
        swapVals(r, c, r, c+1);
        if (has) return [{r, c}, {r, c: c+1}];
      }
      if (r < SIZE - 1 && isMatchable(board[r+1][c])) {
        swapVals(r, c, r+1, c);
        const has = findMatchGroups().length > 0;
        swapVals(r, c, r+1, c);
        if (has) return [{r, c}, {r: r+1, c}];
      }
    }
  }
  return null;
}

// ====================== HUD ======================
function updateHUD() {
  $('score').textContent = score.toLocaleString();
  $('moves').textContent = Math.max(0, moves);
  $('level').textContent = currentLevel ? currentLevel.id : 0;
  // Stars on HUD: show stars earned by score against thresholds
  const stars = computeStars();
  $('stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  // Progress bar tracks star 3 threshold
  let target = 1000;
  if (currentLevel) {
    if (currentLevel.starThresholds) target = currentLevel.starThresholds[2];
    else if (currentLevel.goal) target = currentLevel.goal;
  }
  const pct = Math.min(100, (score / target) * 100);
  $('progress').style.width = pct + '%';
  // Objective HUD
  renderObjective();
}

function computeStars() {
  if (!currentLevel || !currentLevel.starThresholds) return 0;
  const t = currentLevel.starThresholds;
  if (score >= t[2]) return 3;
  if (score >= t[1]) return 2;
  if (score >= t[0]) return 1;
  return 0;
}

function renderObjective() {
  const el = $('objective');
  if (!currentLevel) { el.textContent = ''; return; }
  const parts = [];
  if (currentLevel.type === 'score') {
    parts.push('🎯 Reach ' + currentLevel.goal.toLocaleString() + ' points');
  }
  if (currentLevel.type === 'jelly' || (currentLevel.type === 'mixed' && currentLevel.jelly)) {
    let remain = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) remain += (jelly[r] && jelly[r][c]) || 0;
    parts.push('🟪 Jelly: ' + remain);
  }
  if (currentLevel.type === 'order' || (currentLevel.type === 'mixed' && currentLevel.orders)) {
    const items = (currentLevel.orders || []).map(o => {
      const sym = SYMBOLS[o.sym];
      const have = Math.min(o.count, orderProgress[o.sym] || 0);
      const done = have >= o.count ? 'done' : '';
      return '<span class="order-item ' + done + '"><span class="order-emoji">' + sym + '</span> ' + have + '/' + o.count + '</span>';
    }).join('');
    parts.push(items);
  }
  if (currentLevel.type === 'mixed' && currentLevel.goal) {
    parts.push('🎯 ' + score.toLocaleString() + '/' + currentLevel.goal.toLocaleString());
  }
  el.innerHTML = parts.join(' ');
}

// ====================== Win/Lose checks ======================
function isObjectiveMet() {
  if (!currentLevel) return false;
  if (currentLevel.type === 'score') {
    return score >= currentLevel.goal;
  }
  if (currentLevel.type === 'jelly') {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if ((jelly[r] && jelly[r][c]) > 0) return false;
    return true;
  }
  if (currentLevel.type === 'order') {
    for (const o of currentLevel.orders) {
      if ((orderProgress[o.sym] || 0) < o.count) return false;
    }
    return true;
  }
  if (currentLevel.type === 'mixed') {
    if (currentLevel.goal && score < currentLevel.goal) return false;
    if (currentLevel.jelly) {
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if ((jelly[r] && jelly[r][c]) > 0) return false;
    }
    if (currentLevel.orders) {
      for (const o of currentLevel.orders) {
        if ((orderProgress[o.sym] || 0) < o.count) return false;
      }
    }
    return true;
  }
  return false;
}

async function checkEndStates() {
  if (busy) return;
  if (isObjectiveMet()) {
    busy = true;
    await sugarCrush();
    onWin();
  } else if (moves <= 0) {
    busy = true;
    onLose();
  }
}

// ====================== Sugar Crush ======================
async function sugarCrush() {
  if (moves <= 0) return;
  showToast('🍭 Sugar Crush!');
  soundSugarCrush();
  await delay(800);
  // Convert each remaining move into a striped piece, activate
  while (moves > 0) {
    moves--;
    updateHUD();
    // Pick a random regular candy cell
    const cands = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (isCandy(board[r][c]) && !isSpecial(board[r][c])) cands.push({r, c});
    if (cands.length === 0) break;
    const target = cands[Math.floor(Math.random() * cands.length)];
    const sp = Math.random() < 0.5 ? SP.STRIPED_H : SP.STRIPED_V;
    board[target.r][target.c] = makeCandy(board[target.r][target.c].sym, sp);
    applyCellAppearance(target.r, target.c);
    cellElems[target.r][target.c].animate(
      [{transform: 'scale(0.3)', opacity: 0.4},{transform: 'scale(1.3)', opacity: 1},{transform: 'scale(1)', opacity: 1}],
      {duration: 220, easing: 'ease-out'}
    );
    await delay(140);
    // Activate it
    const cellsToClear = new Set();
    cellsToClear.add(target.r + ',' + target.c);
    const effected = applySpecialEffect(target, sp, board[target.r][target.c]);
    effected.forEach(p => cellsToClear.add(p.r + ',' + p.c));
    const matchCells = [];
    cellsToClear.forEach(s => { const [r,c] = s.split(',').map(Number); matchCells.push({r,c}); });
    score += matchCells.length * 50;
    damageBlockers(matchCells);
    for (const m of matchCells) if (jelly[m.r] && jelly[m.r][m.c] > 0) jelly[m.r][m.c]--;
    await clearAndCascade(matchCells, matchCells.length * 50, []);
    let g = findMatchGroups();
    if (g.length > 0) await processMatches(g, null);
  }
  await delay(400);
}

// ====================== Modals ======================
function onWin() {
  const stars = computeStars();
  recordLevelResult(currentLevel.id, stars, score);
  if (currentLevel.id >= progress.lastUnlocked && stars > 0) {
    progress.lastUnlocked = Math.max(progress.lastUnlocked, currentLevel.id + 1);
    saveProgress();
  }
  $('winScore').textContent = score.toLocaleString();
  $('winLevel').textContent = currentLevel.id;
  const titles = ['You Did It!','Magical!','Sparkle Queen!','Wow!','Amazing!'];
  const subs = [
    'Wow, you sparkled all the way!',
    "You're a real unicorn princess!",
    'The fairies are cheering for you!',
    'The mermaids are SO impressed!',
    'That was beautifully done!'
  ];
  $('winTitle').textContent = titles[Math.floor(Math.random() * titles.length)];
  $('winText').textContent = subs[Math.floor(Math.random() * subs.length)];
  // Render stars one by one
  const starsEl = $('winStars');
  starsEl.innerHTML = '<span class="star">⭐</span><span class="star">⭐</span><span class="star">⭐</span>';
  setTimeout(() => {
    const allStars = starsEl.querySelectorAll('.star');
    for (let i = 0; i < stars; i++) {
      setTimeout(() => allStars[i].classList.add('lit'), 300 * i);
    }
  }, 100);
  soundLevelWin();
  $('winModal').classList.add('show');
}
function onLose() {
  $('loseScore').textContent = score.toLocaleString();
  $('loseGoal').textContent = (currentLevel.starThresholds ? currentLevel.starThresholds[0] : 0).toLocaleString();
  $('loseModal').classList.add('show');
}

// ====================== Level start / lifecycle ======================
function worldOf(level) { return level ? level.world : 'unicorn'; }

function startLevel(levelDef) {
  currentLevel = levelDef;
  applyTheme(levelDef.world);
  score = 0;
  moves = levelDef.moves || 25;
  combo = 0;
  bonusMultiplier = 1;
  selected = null;
  orderProgress = {};
  // Init jelly grid
  jelly = [];
  for (let r = 0; r < SIZE; r++) {
    jelly[r] = [];
    for (let c = 0; c < SIZE; c++) {
      jelly[r][c] = (levelDef.jelly && levelDef.jelly[r] && levelDef.jelly[r][c]) || 0;
    }
  }
  genBoard(levelDef.blockers || {});
  buildBoard();
  updateHUD();
  $('levelName').textContent = levelDef.name;
  $('gameTitle').textContent = '✨ ' + currentTheme.name + ' ✨';
  if (musicOn) playThemeMusic();
  bumpIdle();
}

// ====================== Screen routing ======================
function showHome() {
  $('home').classList.remove('hidden');
  $('map').classList.add('hidden');
  $('game').classList.add('hidden');
  $('homeBest').textContent = totalStars().toString();
  buildGarden();
  stopMusic();
}
function showMap() {
  $('home').classList.add('hidden');
  $('map').classList.remove('hidden');
  $('game').classList.add('hidden');
  buildMap();
  stopMusic();
}
function showGame() {
  $('home').classList.add('hidden');
  $('map').classList.add('hidden');
  $('game').classList.remove('hidden');
}
function totalStars() {
  let total = 0;
  Object.values(progress.levels).forEach(l => total += (l.stars || 0));
  return total;
}

// ====================== World map ======================
function buildMap() {
  const container = $('mapScroll');
  container.innerHTML = '';
  const worldLabels = {
    unicorn: '🦄 Unicorn Meadow',
    mermaid: '🧜‍♀️ Mermaid Lagoon',
    winter:  '❄️ Winter Wonder',
    fairy:   '🧚 Fairy Garden'
  };
  $('mapStats').textContent = '⭐ ' + totalStars() + '/60';
  const levels = window.LEVELS || [];
  const byWorld = {unicorn: [], mermaid: [], winter: [], fairy: []};
  levels.forEach(l => byWorld[l.world] && byWorld[l.world].push(l));
  for (const [worldKey, label] of Object.entries(worldLabels)) {
    const wDiv = document.createElement('div');
    wDiv.className = 'map-world';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'map-world-title';
    titleDiv.innerHTML = label;
    wDiv.appendChild(titleDiv);
    const grid = document.createElement('div');
    grid.className = 'map-levels';
    byWorld[worldKey].forEach(level => {
      const pin = document.createElement('div');
      pin.className = 'level-pin';
      const stars = levelStars(level.id);
      const unlocked = isLevelUnlocked(level.id);
      if (!unlocked) pin.classList.add('locked');
      else if (stars > 0) pin.classList.add('completed');
      pin.innerHTML = '<div class="num">' + level.id + '</div>' +
        '<div class="stars">' + (unlocked ? ('⭐'.repeat(stars) + (stars < 3 ? '☆'.repeat(3 - stars) : '')) : '') + '</div>';
      pin.addEventListener('click', () => {
        if (!unlocked) return;
        ensureAudio();
        soundSelect();
        startLevelById(level.id);
      });
      grid.appendChild(pin);
    });
    wDiv.appendChild(grid);
    container.appendChild(wDiv);
  }
}

function startLevelById(id) {
  const level = (window.LEVELS || []).find(l => l.id === id);
  if (!level) return;
  showGame();
  startLevel(level);
}

// ====================== Buttons ======================
function bindButtons() {
  $('startBtn').addEventListener('click', () => {
    ensureAudio();
    showMap();
  });
  $('mapBackBtn').addEventListener('click', () => {
    showHome();
  });
  $('homeBtn').addEventListener('click', () => {
    if (busy) return;
    $('winModal').classList.remove('show');
    $('loseModal').classList.remove('show');
    busy = false;
    showMap();
  });
  $('nextLevelBtn').addEventListener('click', () => {
    $('winModal').classList.remove('show');
    busy = false;
    const nextId = currentLevel.id + 1;
    const next = (window.LEVELS || []).find(l => l.id === nextId);
    if (next && isLevelUnlocked(nextId)) startLevelById(nextId);
    else showMap();
  });
  $('mapFromWinBtn').addEventListener('click', () => {
    $('winModal').classList.remove('show');
    busy = false;
    showMap();
  });
  $('retryBtn').addEventListener('click', () => {
    $('loseModal').classList.remove('show');
    busy = false;
    if (currentLevel) startLevel(currentLevel);
  });
  $('loseMapBtn').addEventListener('click', () => {
    $('loseModal').classList.remove('show');
    busy = false;
    showMap();
  });
  $('muteBtn').addEventListener('click', () => {
    const allOn = (musicOn || sfxOn);
    musicOn = !allOn;
    sfxOn = !allOn;
    localStorage.setItem('sm_music', musicOn ? '1' : '0');
    localStorage.setItem('sm_sfx',   sfxOn   ? '1' : '0');
    if (audioCtx) setSfxGain();
    if (musicOn) playThemeMusic(); else stopMusic();
    updateAudioButtons();
  });
  $('musicToggle').addEventListener('click', () => {
    musicOn = !musicOn;
    localStorage.setItem('sm_music', musicOn ? '1' : '0');
    if (musicOn && !$('game').classList.contains('hidden')) playThemeMusic();
    else stopMusic();
    updateAudioButtons();
  });
  $('sfxToggle').addEventListener('click', () => {
    sfxOn = !sfxOn;
    localStorage.setItem('sm_sfx', sfxOn ? '1' : '0');
    if (audioCtx) setSfxGain();
    if (sfxOn) { ensureAudio(); soundSelect(); }
    updateAudioButtons();
  });
}
function updateAudioButtons() {
  $('musicToggle').textContent = musicOn ? '🎵 Music' : '🎵 Music Off';
  $('musicToggle').classList.toggle('off', !musicOn);
  $('sfxToggle').textContent  = sfxOn   ? '🔊 Sounds' : '🔇 Sounds Off';
  $('sfxToggle').classList.toggle('off', !sfxOn);
  $('muteBtn').textContent = (musicOn || sfxOn) ? '🔇 Quiet' : '🔊 Sound';
}

// ====================== Init ======================
function init() {
  boardEl = $('board');
  toastEl = $('toast');
  buildStars();
  applyTheme('unicorn');
  buildGarden();
  $('homeBest').textContent = totalStars().toString();
  updateAudioButtons();
  bindButtons();

  // Pre-build a board so something pretty shows in case home/game shown initially
  jelly = []; for (let r = 0; r < SIZE; r++) { jelly[r] = []; for (let c = 0; c < SIZE; c++) jelly[r][c] = 0; }
  genBoard({});
  buildBoard();

  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  }, {passive: false});
  document.addEventListener('touchmove', (e) => {
    if (e.target.closest('.board')) e.preventDefault();
  }, {passive: false});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMusic();
    else if (musicOn && !$('game').classList.contains('hidden')) playThemeMusic();
  });
  window.addEventListener('resize', () => {
    document.querySelectorAll('.lightning-line').forEach(s => s.remove());
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
