/* Mood Mixer interactions: state, persistence, exports, keyboard and a11y. */
(function () {
  'use strict';

  const C = window.MoodColor;
  const STORAGE_KEY = 'moodMixerState';
  const MAX_SAVED = 50;
  const MAX_HISTORY = 12;
  const HARMONY_LABELS = {
    tetrad: 'Tetrad',
    complement: 'Complement',
    analogous: 'Analogous',
    triad: 'Triad',
    split: 'Split complement',
    mono: 'Monochrome'
  };

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const on = (id, event, handler) => {
    const element = byId(id);
    if (element) element.addEventListener(event, handler);
  };

  const DEFAULTS = [
    { id: 'energy', label: 'Energy Level' },
    { id: 'calmness', label: 'Calmness' },
    { id: 'sparkle', label: 'Sparkle Factor' }
  ];

  const PRESETS = [
    { name: 'Dawn', energy: 34, calmness: 72, sparkle: 46, harmony: 'analogous', blend: 'pastel' },
    { name: 'Dusk', energy: 58, calmness: 46, sparkle: 62, harmony: 'split', blend: 'normal' },
    { name: 'Ocean', energy: 46, calmness: 64, sparkle: 40, harmony: 'mono', blend: 'normal' },
    { name: 'Forest', energy: 62, calmness: 58, sparkle: 30, harmony: 'triad', blend: 'normal' },
    { name: 'Ember', energy: 88, calmness: 24, sparkle: 78, harmony: 'complement', blend: 'vibrant' },
    { name: 'Neon', energy: 96, calmness: 18, sparkle: 100, harmony: 'tetrad', blend: 'vibrant' }
  ];

  const DEFAULT_VIBES = [
    'Serene', 'Calm', 'Peaceful', 'Tranquil', 'Mellow', 'Gentle', 'Soft',
    'Energetic', 'Vibrant', 'Bold', 'Dynamic', 'Electric', 'Lively', 'Zesty',
    'Sparkling', 'Radiant', 'Dreamy', 'Whimsical', 'Cozy', 'Warm', 'Sunny',
    'Golden', 'Misty', 'Crisp', 'Fresh', 'Deep', 'Rich', 'Lush', 'Vivid',
    'Muted', 'Subtle', 'Ethereal', 'Playful', 'Cheerful', 'Joyful', 'Bright',
    'Airy', 'Moody', 'Midnight', 'Dusk', 'Dawn', 'Oceanic', 'Forest', 'Zen'
  ];

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  const stored = readState();
  const state = {
    values: Object.assign({ energy: 50, calmness: 50, sparkle: 50 }, stored.values || {}),
    custom: Array.isArray(stored.custom) ? stored.custom : [],
    labels: stored.labels || {},
    vibes: Array.isArray(stored.vibes) && stored.vibes.length ? stored.vibes : DEFAULT_VIBES.slice(),
    saved: Array.isArray(stored.saved) ? stored.saved.slice(0, MAX_SAVED) : [],
    history: Array.isArray(stored.history) ? stored.history.slice(0, MAX_HISTORY) : [],
    theme: stored.theme === 'dark' ? 'dark' : 'light',
    contrast: stored.contrast === 'high' ? 'high' : 'normal',
    uiTheme: ['modern', 'minimalist', 'retro', 'neon'].includes(stored.uiTheme) ? stored.uiTheme : 'modern',
    model: ['hsl', 'rgb', 'hsv'].includes(stored.model) ? stored.model : 'hsl',
    blend: ['normal', 'vibrant', 'pastel', 'mono'].includes(stored.blend) ? stored.blend : 'normal',
    harmony: C.HARMONIES[stored.harmony] ? stored.harmony : 'tetrad',
    background: stored.background === 'gradient' ? 'gradient' : 'solid',
    particles: stored.particles !== false,
    audio: Boolean(stored.audio),
    controlsOpen: Boolean(stored.controlsOpen),
    folderFilter: typeof stored.folderFilter === 'string' ? stored.folderFilter : 'All',
    collections: Array.isArray(stored.collections) ? stored.collections.slice(0, 40) : [],
    drift: Boolean(stored.drift),
    vibe: typeof stored.vibe === 'string' ? stored.vibe : '',
    lastFolder: typeof stored.lastFolder === 'string' ? stored.lastFolder : 'Unfiled',
    quiet: Boolean(stored.quiet),
    pinned: Array.isArray(stored.pinned) && stored.pinned.length ? stored.pinned.slice(0, 4) : null,
    locks: Object.assign({ hue: false, sat: false, lit: false }, stored.locks || {}),
    lockedValues: Object.assign({ hue: null, sat: null, lit: null }, stored.lockedValues || {})
  };

  let current = { r: 126, g: 200, b: 227, h: 197, s: 64, l: 69 };
  let currentVibe = state.vibes[0] || 'Serene';
  let vibePinned = false;
  let undoStack = [];
  let redoStack = [];
  let pendingSnapshot = null;
  let historyTimer = 0;
  let persistTimer = 0;
  let hashTimer = 0;
  let hudHideTimer = 0;
  let historyOrderBackup = null;
  let pinnedPalette = null;
  let driftTimer = 0;

  /* ---------- persistence ---------- */

  function persistNow() {
    try {
      state.pinned = pinnedPalette ? pinnedPalette.slice() : null;
      state.vibe = currentVibe;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Storage can be full or blocked; the app stays usable.
    }
  }

  function schedulePersist() {
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(persistNow, 220);
  }

  /* ---------- permalink ---------- */

  function readHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return false;
    const params = new URLSearchParams(raw);
    let touched = false;

    /* Pinned palette: #q=7ec8e3-4a90d9-1f2c3d-ffffff */
    const pinned = C.parsePinned(params.get('q'));
    if (pinned) {
      pinnedPalette = pinned;
      touched = true;
    }

    /* Short form: #p=1in8hx */
    const token = params.get('p');
    if (token) {
      const decoded = C.decodeToken(token);
      if (decoded) {
        state.values = Object.assign({}, state.values, decoded.values);
        state.model = decoded.model;
        state.blend = decoded.blend;
        state.harmony = decoded.harmony;
        state.background = decoded.background;
        touched = true;
      }
    }
    DEFAULTS.forEach((slider) => {
      const value = Number(params.get(slider.id.slice(0, 2)));
      if (Number.isFinite(value) && params.has(slider.id.slice(0, 2))) {
        state.values[slider.id] = C.clamp(Math.round(value), 0, 100);
        touched = true;
      }
    });
    const model = params.get('model');
    if (model && ['hsl', 'rgb', 'hsv'].includes(model)) {
      state.model = model;
      touched = true;
    }
    const blend = params.get('blend');
    if (blend && ['normal', 'vibrant', 'pastel', 'mono'].includes(blend)) {
      state.blend = blend;
      touched = true;
    }
    const harmony = params.get('harmony');
    if (harmony && C.HARMONIES[harmony]) {
      state.harmony = harmony;
      touched = true;
    }
    const background = params.get('bg');
    if (background && ['solid', 'gradient'].includes(background)) {
      state.background = background;
      touched = true;
    }
    const theme = params.get('theme');
    if (theme === 'dark' || theme === 'light') {
      state.theme = theme;
      touched = true;
    }
    const ui = params.get('ui');
    if (['modern', 'minimalist', 'retro', 'neon'].includes(ui)) {
      state.uiTheme = ui;
      touched = true;
    }
    const contrast = params.get('contrast');
    if (contrast === 'high' || contrast === 'normal') {
      state.contrast = contrast;
      touched = true;
    }
    if (params.get('controls') === '1') {
      state.controlsOpen = true;
      touched = true;
    }
    if (params.get('focus') === '1') {
      wantFocus = true;
      touched = true;
    }
    return touched;
  }

  function hashParams() {
    const params = new URLSearchParams();
    if (pinnedPalette) params.set('q', C.pinnedToken(pinnedPalette));
    else params.set('p', C.encodeToken(state));
    return params;
  }

  function shareUrl() {
    return window.location.origin + window.location.pathname + '#' + hashParams().toString();
  }

  function scheduleHash() {
    window.clearTimeout(hashTimer);
    hashTimer = window.setTimeout(() => {
      const next = '#' + hashParams().toString();
      if (window.location.hash !== next) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + next);
      }
    }, 400);
  }

  /* ---------- undo ---------- */

  function snapshotValues() {
    return Object.assign({}, state.values);
  }

  function commitUndo(snapshot) {
    undoStack.push(snapshot || snapshotValues());
    if (undoStack.length > 40) undoStack.shift();
    redoStack = [];
    updateUndoButtons();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshotValues());
    state.values = undoStack.pop();
    buildSliders();
    updateMood();
    updateUndoButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshotValues());
    state.values = redoStack.pop();
    buildSliders();
    updateMood();
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const undoBtn = byId('undoBtn');
    const redoBtn = byId('redoBtn');
    if (undoBtn) undoBtn.disabled = !undoStack.length;
    if (redoBtn) redoBtn.disabled = !redoStack.length;
  }

  /* ---------- sound ---------- */

  let audioContext = null;

  function tick(frequency) {
    if (!state.audio) return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      audioContext = audioContext || new Ctor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency || 520;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
    } catch (error) {
      // Audio is decorative; ignore failures.
    }
  }

  /* ---------- particles ---------- */

  const particles = {
    canvas: null,
    ctx: null,
    dots: [],
    frame: 0,
    width: 0,
    height: 0,
    running: false,
    reduced: false,

    init() {
      this.canvas = byId('particleCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else this.start();
      });
      this.seed();
      if (state.particles && !this.reduced) this.start();
    },

    resize() {
      if (!this.canvas) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.round(this.width * ratio);
      this.canvas.height = Math.round(this.height * ratio);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    },

    seed() {
      const sparkle = Number(state.values.sparkle ?? 50) / 100;
      const count = Math.round(12 + sparkle * 58);
      this.dots = Array.from({ length: count }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 0.8 + Math.random() * 2.6,
        speed: 0.12 + Math.random() * 0.5 + sparkle * 0.35,
        drift: (Math.random() - 0.5) * 0.28,
        alpha: 0.16 + Math.random() * 0.4
      }));
    },

    paint() {
      const { ctx } = this;
      if (!ctx) return;
      ctx.clearRect(0, 0, this.width, this.height);
      const hex = C.toHex(current);
      this.dots.forEach((dot) => {
        ctx.beginPath();
        ctx.fillStyle = hex;
        ctx.globalAlpha = dot.alpha;
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    },

    step() {
      const boost = 0.5 + (Number(state.values.sparkle ?? 50) / 100) * 1.5;
      this.dots.forEach((dot) => {
        dot.y -= dot.speed * boost;
        dot.x += dot.drift;
        if (dot.y < -8) {
          dot.y = this.height + 8;
          dot.x = Math.random() * this.width;
        }
        if (dot.x < -8) dot.x = this.width + 8;
        if (dot.x > this.width + 8) dot.x = -8;
      });
      this.paint();
      this.frame = window.requestAnimationFrame(() => this.step());
    },

    start() {
      if (this.running || this.reduced || !state.particles) return;
      this.running = true;
      this.step();
    },

    stop() {
      this.running = false;
      window.cancelAnimationFrame(this.frame);
      if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
    },

    refresh() {
      this.seed();
      if (state.particles && !this.reduced) {
        if (!this.running) this.start();
        this.paint();
      } else {
        this.stop();
      }
    }
  };

  /* ---------- rendering ---------- */

  function vibeNode() {
    return byId('vibeText');
  }

  function renderHistory() {
    const container = byId('colorHistoryContainer');
    if (!container) return;
    const undoReorder = byId('undoReorderBtn');
    if (undoReorder) undoReorder.hidden = !historyOrderBackup;
    container.replaceChildren();
    if (!state.history.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = 'Your recent palettes will appear here.';
      container.appendChild(empty);
      return;
    }
    state.history.slice(0, MAX_HISTORY).forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.draggable = true;
      row.dataset.index = String(index);
      row.title = 'Drag to reorder';
      row.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', String(index));
        event.dataTransfer.effectAllowed = 'move';
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        row.classList.add('is-drop-target');
      });
      row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('is-drop-target');
        const from = Number(event.dataTransfer.getData('text/plain'));
        const to = Number(row.dataset.index);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
        historyOrderBackup = state.history.slice();
        const moved = state.history.splice(from, 1)[0];
        state.history.splice(to, 0, moved);
        renderHistory();
        persistNow();
        const undoReorder = byId('undoReorderBtn');
        if (undoReorder) undoReorder.hidden = false;
      });
      const swatches = document.createElement('div');
      swatches.className = 'history-swatches';
      (entry.palette || [entry.hex]).forEach((hex) => {
        const swatch = document.createElement('span');
        swatch.className = 'history-swatch';
        swatch.style.backgroundColor = hex;
        swatches.appendChild(swatch);
      });
      const name = document.createElement('strong');
      name.textContent = entry.vibe ? `${entry.vibe} \u00b7 ${entry.hex}` : entry.hex;
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'btn btn-sm';
      restore.textContent = 'Restore';
      restore.addEventListener('click', () => {
        if (!entry.values) return;
        commitUndo();
        state.values = Object.assign({}, entry.values);
        if (entry.settings) {
          if (entry.settings.model) state.model = entry.settings.model;
          if (entry.settings.blend) state.blend = entry.settings.blend;
          if (entry.settings.harmony) state.harmony = entry.settings.harmony;
          if (entry.settings.background) state.background = entry.settings.background;
        }
        syncSettings();
        buildSliders();
        updateMood();
      });
      row.append(swatches, name, restore);
      container.appendChild(row);
    });
  }

  function folderOf(mood) {
    return (mood && mood.folder ? String(mood.folder) : 'Unfiled');
  }

  function renderFolderChips() {
    const chips = byId('folderChips');
    if (!chips) return;
    const rename = byId('renameFolderBtn');
    if (rename) rename.hidden = state.folderFilter === 'All';
    const exportFolder = byId('exportFolderBtn');
    if (exportFolder) exportFolder.hidden = state.folderFilter === 'All';
    const counts = new Map();
    state.saved.forEach((mood) => {
      const key = folderOf(mood);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const entries = [['All', state.saved.length]].concat(
      Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    );
    chips.replaceChildren(...entries.map(([name, count]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'folder-chip';
      chip.textContent = `${name} ${count}`;
      chip.setAttribute('aria-pressed', String(state.folderFilter === name));
      if (state.folderFilter === name) chip.classList.add('is-active');
      chip.addEventListener('click', () => {
        state.folderFilter = name;
        if (name !== 'All') state.lastFolder = name;
        renderFolderChips();
        renderSaved();
        schedulePersist();
      });
      return chip;
    }));
  }

  function matchesQuery(haystack) {
    if (!query) return true;
    return haystack.toLowerCase().includes(query);
  }

  function showRestore(message) {
    const bar = byId('restoreBar');
    if (!bar) return;
    bar.hidden = false;
    const label = byId('restoreLabel');
    if (label) label.textContent = message;
    announce(message);
  }

  function renderRestoreBar() {
    const bar = byId('restoreBar');
    if (!bar) return;
    bar.hidden = !deletedBuffer;
  }

  function renderBulkBar() {
    const bar = byId('bulkBar');
    if (!bar) return;
    const count = selection.size;
    bar.hidden = count === 0;
    const label = byId('bulkCount');
    if (label) label.textContent = `${count} selected`;
  }

  function renderSaved() {
    const container = byId('savedMoodsContainer');
    if (!container) return;
    container.replaceChildren();
    renderFolderChips();
    renderBulkBar();
    const visible = state.saved
      .filter((mood) => state.folderFilter === 'All' || folderOf(mood) === state.folderFilter)
      .filter((mood) => matchesQuery([
        mood.name, mood.vibe, mood.hex, mood.note, folderOf(mood)
      ].filter(Boolean).join(' ')));
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = state.saved.length ? 'Nothing matches here.' : 'No saved moods yet.';
      container.appendChild(empty);
      return;
    }
    visible.forEach((mood) => {
      const row = document.createElement('div');
      row.className = 'saved-mood-item';

      const pick = document.createElement('input');
      pick.type = 'checkbox';
      pick.className = 'saved-pick';
      pick.checked = selection.has(mood.id);
      pick.setAttribute('aria-label', `Select ${mood.name || 'saved mood'}`);
      pick.addEventListener('change', () => {
        if (pick.checked) selection.add(mood.id);
        else selection.delete(mood.id);
        renderBulkBar();
      });
      const swatch = document.createElement('span');
      swatch.className = 'saved-mood-swatch saved-mood-thumbs';
      const thumbs = Array.isArray(mood.palette) && mood.palette.length ?
        mood.palette :
        [mood.hex || '#888888'];
      thumbs.slice(0, 4).forEach((hex) => {
        const chip = document.createElement('span');
        chip.style.backgroundColor = hex;
        swatch.appendChild(chip);
      });
      const info = document.createElement('div');
      info.className = 'saved-mood-info';
      const title = document.createElement('div');
      title.className = 'saved-mood-name';
      title.textContent = mood.name || 'Saved mood';
      const meta = document.createElement('div');
      meta.className = 'saved-mood-meta';
      meta.textContent = [mood.vibe || 'Saved color', mood.hex, folderOf(mood)].filter(Boolean).join(' \u00b7 ');

      const moodRgb = C.hexToRgb(mood.hex || '');
      const moodInk = moodRgb ? C.bestInk(moodRgb) : null;
      const moodGrade = moodInk ? C.grade(moodInk.ratio) : null;
      if (moodInk && moodGrade) {
        const pill = document.createElement('span');
        pill.className = `saved-grade ${moodGrade.pass ? 'is-pass' : 'is-fail'}`;
        pill.textContent = `${moodInk.ratio.toFixed(1)}:1 ${moodGrade.level}`;
        pill.title = moodGrade.pass ?
          `Text on this colour passes ${moodGrade.level}` :
          'Text on this colour is below AA — pick a lighter or darker shade for labels';
        meta.appendChild(pill);
      }
      info.append(title, meta);
      if (mood.note) {
        const note = document.createElement('div');
        note.className = 'saved-note';
        note.textContent = mood.note;
        info.appendChild(note);
      }
      const actions = document.createElement('div');
      actions.className = 'saved-mood-actions';

      const load = document.createElement('button');
      load.type = 'button';
      load.className = 'btn btn-sm';
      load.textContent = 'Load';
      load.addEventListener('click', () => {
        commitUndo();
        Object.assign(state.values, mood.values || {});
        if (mood.settings) {
          if (mood.settings.model) state.model = mood.settings.model;
          if (mood.settings.blend) state.blend = mood.settings.blend;
          if (mood.settings.harmony) state.harmony = mood.settings.harmony;
          if (mood.settings.background) state.background = mood.settings.background;
        }
        syncSettings();
        buildSliders();
        updateMood();
      });

      const rename = document.createElement('button');
      rename.type = 'button';
      rename.className = 'btn btn-sm';
      rename.textContent = 'Rename';
      rename.addEventListener('click', () => {
        const next = window.prompt('Rename this mood:', mood.name || 'Saved mood');
        if (!next || !next.trim()) return;
        mood.name = next.trim();
        renderSaved();
        persistNow();
      });

      const note = document.createElement('button');
      note.type = 'button';
      note.className = 'btn btn-sm';
      note.textContent = 'Note';
      note.addEventListener('click', () => {
        const next = window.prompt('Note for this mood:', mood.note || '');
        if (next === null) return;
        mood.note = next.trim().slice(0, 200);
        renderSaved();
        persistNow();
      });

      const folder = document.createElement('button');
      folder.type = 'button';
      folder.className = 'btn btn-sm';
      folder.textContent = 'Folder';
      folder.addEventListener('click', () => {
        const next = window.prompt('Folder for this mood:', folderOf(mood));
        if (next === null) return;
        mood.folder = next.trim() || 'Unfiled';
        state.lastFolder = mood.folder;
        if (state.folderFilter !== 'All' && state.folderFilter !== mood.folder) state.folderFilter = 'All';
        renderSaved();
        persistNow();
      });

      const compare = document.createElement('button');
      compare.type = 'button';
      compare.className = 'btn btn-sm';
      compare.textContent = 'Compare';
      compare.addEventListener('click', () => openCompare({
        id: mood.id,
        name: mood.name || 'Saved mood',
        palette: Array.isArray(mood.palette) && mood.palette.length ? mood.palette : [mood.hex]
      }));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        state.saved = state.saved.filter((item) => item.id !== mood.id);
        renderSaved();
        persistNow();
      });

      actions.append(load, compare, rename, note, folder, remove);
      row.append(pick, swatch, info, actions);
      container.appendChild(row);
    });
  }

  function renderPresets() {
    const grid = byId('presetGrid');
    if (!grid) return;
    grid.replaceChildren(...PRESETS.map((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset-btn';
      button.dataset.preset = preset.name;

      const swatches = document.createElement('span');
      swatches.className = 'preset-swatches';
      const preview = C.palette(C.generate({
        values: { energy: preset.energy, calmness: preset.calmness, sparkle: preset.sparkle },
        model: 'hsl',
        blend: preset.blend,
        custom: []
      }), preset.harmony);
      preview.forEach((hex) => {
        const chip = document.createElement('span');
        chip.style.backgroundColor = hex;
        swatches.appendChild(chip);
      });

      const name = document.createElement('span');
      name.className = 'preset-name';
      name.textContent = preset.name;

      button.append(swatches, name);
      button.addEventListener('click', () => applyPreset(preset));
      return button;
    }));
  }

  function applyPreset(preset) {
    commitUndo();
    state.values.energy = preset.energy;
    state.values.calmness = preset.calmness;
    state.values.sparkle = preset.sparkle;
    state.harmony = preset.harmony;
    state.blend = preset.blend;
    vibePinned = false;
    syncSettings();
    buildSliders();
    updateMood();
    tick(620);
  }

  function renderPairs(palette) {
    const container = byId('pairsContainer');
    if (!container) return;
    const list = C.pairs(palette);
    if (!list.length) {
      container.replaceChildren();
      return;
    }
    container.replaceChildren(...list.map((pair, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pair-card';
      button.style.background = pair.bg;
      button.style.color = pair.fg;
      button.setAttribute('aria-label',
        `Pair ${index + 1}: ${pair.fg} text on ${pair.bg}, contrast ${pair.ratio.toFixed(1)} to 1, ${pair.level}. Copy CSS`);

      const sample = document.createElement('span');
      sample.className = 'pair-sample';
      sample.textContent = 'Aa';
      const meta = document.createElement('span');
      meta.className = 'pair-meta';
      meta.textContent = `${pair.fg} on ${pair.bg}`;
      const grade = document.createElement('span');
      grade.className = 'pair-grade';
      grade.textContent = `${pair.ratio.toFixed(1)}:1 ${pair.level}`;

      button.append(sample, meta, grade);
      button.addEventListener('click', () => {
        copyText(`color: ${pair.fg};\nbackground-color: ${pair.bg};`, `${pair.fg} on ${pair.bg} copied`);
      });
      return button;
    }));
  }

  const VISION_TYPES = [
    ['normal', 'Normal'],
    ['deuteranopia', 'Deuteranopia'],
    ['protanopia', 'Protanopia'],
    ['tritanopia', 'Tritanopia']
  ];

  function renderVision(palette) {
    const container = byId('visionContainer');
    if (!container) return;
    container.replaceChildren(...VISION_TYPES.map(([type, label]) => {
      const row = document.createElement('div');
      row.className = 'vision-row';

      const name = document.createElement('span');
      name.className = 'vision-label';
      name.textContent = label;

      const strip = document.createElement('span');
      strip.className = 'vision-strip';
      strip.setAttribute('role', 'img');
      palette.forEach((hex) => {
        const rgb = C.hexToRgb(hex);
        const chip = document.createElement('span');
        chip.style.backgroundColor = type === 'normal' || !rgb ? hex : C.simulate(rgb, type);
        strip.appendChild(chip);
      });
      strip.setAttribute('aria-label', `${label}: ${palette.map((hex) => {
        const rgb = C.hexToRgb(hex);
        return type === 'normal' || !rgb ? hex : C.simulate(rgb, type);
      }).join(', ')}`);

      row.append(name, strip);
      return row;
    }));
  }

  /* ---------- collections ---------- */

  function renderCollections() {
    const container = byId('collectionsContainer');
    if (!container) return;
    container.replaceChildren();
    if (!state.collections.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = 'No saved palettes yet. Save the current four colours to keep them together.';
      container.appendChild(empty);
      return;
    }
    const visibleCollections = state.collections.filter((collection) =>
      matchesQuery([collection.name, (collection.palette || []).join(' ')].filter(Boolean).join(' ')));
    if (!visibleCollections.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = 'Nothing matches this search.';
      container.appendChild(empty);
      return;
    }
    visibleCollections.forEach((collection) => {
      const row = document.createElement('div');
      row.className = 'collection-row';

      const main = document.createElement('div');
      main.className = 'collection-main';

      const name = document.createElement('span');
      name.className = 'collection-name';
      name.textContent = collection.name || 'Palette';

      const strip = document.createElement('span');
      strip.className = 'collection-strip';
      (collection.palette || []).forEach((hex) => {
        const chip = document.createElement('span');
        chip.style.backgroundColor = hex;
        strip.appendChild(chip);
      });

      main.append(name, strip);

      const actions = document.createElement('div');
      actions.className = 'collection-actions';

      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'btn btn-sm';
      use.textContent = 'Use';
      use.addEventListener('click', () => {
        commitUndo();
        Object.assign(state.values, collection.values || {});
        if (collection.settings) {
          if (collection.settings.model) state.model = collection.settings.model;
          if (collection.settings.blend) state.blend = collection.settings.blend;
          if (collection.settings.harmony) state.harmony = collection.settings.harmony;
          if (collection.settings.background) state.background = collection.settings.background;
        }
        vibePinned = false;
        syncSettings();
        buildSliders();
        updateMood();
        announce(`${collection.name || 'Palette'} loaded`);
      });

      const compare = document.createElement('button');
      compare.type = 'button';
      compare.className = 'btn btn-sm';
      compare.textContent = 'Compare';
      compare.addEventListener('click', () => openCompare(collection));

      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'btn btn-sm';
      link.textContent = 'Link';
      link.title = 'Copy a link that opens these exact colours';
      link.addEventListener('click', () => {
        const base = window.location.origin + window.location.pathname;
        copyText(`${base}#q=${C.pinnedToken(collection.palette || [])}`, 'Collection link copied');
      });

      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'btn btn-sm';
      pin.textContent = 'Pin';
      pin.title = 'Use these exact colours, ignoring the sliders';
      pin.addEventListener('click', () => setPinned(collection.palette || [], 'Palette pinned'));

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn btn-sm';
      copy.textContent = 'Copy';
      copy.addEventListener('click', () => copyText((collection.palette || []).join(', '), 'Palette copied'));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        state.collections = state.collections.filter((item) => item.id !== collection.id);
        renderCollections();
        persistNow();
      });

      actions.append(use, compare, pin, copy, link, remove);
      row.append(main, actions);
      container.appendChild(row);
    });
  }

  /* ---------- image palette ---------- */

  function matchSlidersTo(hex) {
    const rgb = C.hexToRgb(hex);
    if (!rgb) return false;
    const hsl = C.rgbToHsl(rgb.r, rgb.g, rgb.b);
    commitUndo();
    state.values.energy = Math.round(C.clamp((hsl.h - (hsl.s * 0.5) / 3.6) / 3.6, 0, 100));
    state.values.sparkle = Math.round(C.clamp((hsl.s - 40) / 0.6, 0, 100));
    state.values.calmness = Math.round(C.clamp((hsl.l - 20) / 0.7, 0, 100));
    vibePinned = false;
    buildSliders();
    updateMood();
    return true;
  }

  function imageToPalette(file) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, size, size);
      let data = null;
      try {
        data = ctx.getImageData(0, 0, size, size).data;
      } catch (error) {
        data = null;
      }
      URL.revokeObjectURL(url);
      if (!data) {
        announce('That image could not be read');
        return;
      }
      const pixels = [];
      for (let i = 0; i < data.length; i += 4) {
        pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
      }
      const colors = C.dominant(pixels, 5);
      renderImagePalette(colors, file.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      announce('That file is not an image the browser can read');
    };
    image.src = url;
  }

  function renderImagePalette(colors, label) {
    const container = byId('imagePalette');
    if (!container) return;
    container.replaceChildren(...colors.map((hex) => {
      const rgb = C.hexToRgb(hex);
      const ink = rgb ? C.bestInk(rgb) : { ink: '#111111' };
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'image-chip';
      chip.style.backgroundColor = hex;
      chip.style.color = ink.ink;
      chip.textContent = hex;
      chip.setAttribute('aria-label', `${hex} from ${label}. Copy hex`);
      chip.addEventListener('click', () => copyText(hex, `${hex} copied`));
      return chip;
    }));

    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'btn btn-sm';
    use.textContent = 'Match sliders to the first colour';
    use.addEventListener('click', () => matchSlidersTo(colors[0]));
    container.appendChild(use);
  }

  function renderVibes() {
    const container = byId('vibeDictionary');
    if (!container) return;
    container.replaceChildren();
    state.vibes.forEach((word) => {
      const tag = document.createElement('span');
      tag.className = 'vibe-tag';
      tag.append(document.createTextNode(word));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'vibe-tag-remove';
      remove.textContent = '\u00d7';
      remove.setAttribute('aria-label', `Remove ${word}`);
      remove.addEventListener('click', () => {
        state.vibes = state.vibes.filter((item) => item !== word);
        renderVibes();
        schedulePersist();
      });
      tag.appendChild(remove);
      container.appendChild(tag);
    });
  }

  function sliderAriaText(label, value) {
    return `${label}: ${value} percent`;
  }

  function buildSlider(slider, isCustom) {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const header = document.createElement('div');
    header.className = 'slider-header';

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = state.labels[slider.id] || slider.label;
    label.contentEditable = 'true';
    label.setAttribute('role', 'textbox');
    label.setAttribute('aria-label', `Rename ${slider.label}`);
    label.title = 'Click to rename';
    label.addEventListener('blur', () => {
      const name = label.textContent.trim() || slider.label;
      label.textContent = name;
      state.labels[slider.id] = name;
      const input = group.querySelector('input[type="range"]');
      if (input) input.setAttribute('aria-label', name);
      schedulePersist();
    });
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        label.blur();
      }
    });

    const right = document.createElement('div');
    right.className = 'slider-right';
    const output = document.createElement('span');
    output.className = 'slider-value';
    right.appendChild(output);

    if (isCustom) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        commitUndo();
        state.custom = state.custom.filter((item) => item.id !== slider.id);
        delete state.values[slider.id];
        buildSliders();
        updateMood();
      });
      right.appendChild(remove);
    }

    header.append(label, right);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.step = '1';
    input.value = String(state.values[slider.id] ?? slider.value ?? 50);
    input.id = `slider-${slider.id}`;
    input.setAttribute('aria-label', label.textContent);
    input.setAttribute('aria-valuetext', sliderAriaText(label.textContent, input.value));

    const begin = () => {
      if (!pendingSnapshot) pendingSnapshot = snapshotValues();
    };

    input.addEventListener('pointerdown', begin);
    input.addEventListener('keydown', (event) => {
      begin();
      const step = event.shiftKey ? 10 : 1;
      let delta = 0;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = step;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -step;
      else if (event.key === 'PageUp') delta = 10;
      else if (event.key === 'PageDown') delta = -10;
      else return;
      event.preventDefault();
      const next = C.clamp(Number(input.value) + delta, 0, 100);
      input.value = String(next);
      state.values[slider.id] = next;
      output.textContent = String(next);
      input.setAttribute('aria-valuetext', sliderAriaText(label.textContent, next));
      updateMood();
      announce(`${label.textContent}: ${next} percent`);
    });
    input.addEventListener('input', () => {
      begin();
      if (pinnedPalette) {
        pinnedPalette = null;
        const badge = byId('pinnedBadge');
        if (badge) badge.hidden = true;
      }
      state.values[slider.id] = Number(input.value);
      output.textContent = input.value;
      input.setAttribute('aria-valuetext', sliderAriaText(label.textContent, input.value));
      updateMood();
    });
    input.addEventListener('change', () => {
      if (pendingSnapshot) {
        commitUndo(pendingSnapshot);
        pendingSnapshot = null;
      }
    });

    group.append(header, input);
    output.textContent = input.value;
    return group;
  }

  function buildSliders() {
    const regular = byId('slidersContainer');
    const custom = byId('customSlidersContainer');
    if (regular) regular.replaceChildren(...DEFAULTS.map((slider) => buildSlider(slider, false)));
    if (custom) {
      if (!state.custom.length) {
        const empty = document.createElement('p');
        empty.className = 'section-hint';
        empty.textContent = 'No custom sliders yet.';
        custom.replaceChildren(empty);
      } else {
        custom.replaceChildren(...state.custom.map((slider) => buildSlider(slider, true)));
      }
    }
  }

  function syncSettings() {
    [
      ['colorModelSelect', 'model'],
      ['blendModeSelect', 'blend'],
      ['harmonySelect', 'harmony'],
      ['backgroundMode', 'background'],
      ['themeSelect', 'uiTheme']
    ].forEach(([id, key]) => {
      const control = byId(id);
      if (control) control.value = state[key];
    });

    [
      ['lockHue', 'hue'],
      ['lockSat', 'sat'],
      ['lockLit', 'lit']
    ].forEach(([id, key]) => {
      const control = byId(id);
      if (control) control.checked = Boolean(state.locks[key]);
    });

    const audio = byId('audioToggle');
    if (audio) audio.checked = state.audio;
    const particlesToggle = byId('particlesToggle');
    if (particlesToggle) particlesToggle.checked = state.particles;
    const driftToggle = byId('driftToggle');
    if (driftToggle) driftToggle.checked = state.drift;
    const quietToggle = byId('quietToggle');
    if (quietToggle) quietToggle.checked = state.quiet;
    const pinnedBadge = byId('pinnedBadge');
    if (pinnedBadge) pinnedBadge.hidden = !pinnedPalette;

    const root = document.documentElement;
    if (state.theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    if (state.contrast === 'high') root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
    root.setAttribute('data-ui-theme', state.uiTheme);

    const themeToggle = byId('themeToggle');
    if (themeToggle) themeToggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
    const contrastToggle = byId('contrastToggle');
    if (contrastToggle) contrastToggle.setAttribute('aria-pressed', String(state.contrast === 'high'));

    const panel = byId('controlsPanel');
    const toggle = byId('controlsToggle');
    const icon = byId('toggleIcon');
    const text = byId('toggleLabel');
    if (panel) panel.classList.toggle('open', state.controlsOpen);
    if (toggle) toggle.setAttribute('aria-expanded', String(state.controlsOpen));
    if (icon) icon.textContent = state.controlsOpen ? '\u25bc' : '\u25b6';
    if (text) text.textContent = state.controlsOpen ? 'Hide Controls' : 'Show Controls';
  }

  function paintSwatches(palette) {
    const ids = ['mainSwatch', 'compSwatch', 'paletteSwatch3', 'paletteSwatch4'];
    ids.forEach((id, index) => {
      const node = byId(id);
      if (!node) return;
      const hex = palette[index];
      const rgb = C.hexToRgb(hex);
      const ink = rgb ? C.bestInk(rgb) : { ink: '#111111', ratio: 1, on: 'black' };
      const badge = C.grade(ink.ratio);
      node.style.backgroundColor = hex;
      node.dataset.hex = hex;
      node.setAttribute('aria-label', `Palette color ${index + 1}, ${hex}. Copy hex`);
      const hexLabel = node.querySelector('.swatch-hex');
      if (hexLabel) hexLabel.textContent = hex;
      const contrastLabel = node.querySelector('.swatch-contrast');
      if (contrastLabel) {
        contrastLabel.textContent = `${ink.ratio.toFixed(1)}:1 ${badge.level}`;
        contrastLabel.classList.toggle('is-pass', badge.pass);
        contrastLabel.classList.toggle('is-fail', !badge.pass);
      }
      node.style.color = ink.ink;
    });
  }

  function activePalette() {
    return pinnedPalette ? pinnedPalette.slice() : C.palette(current, state.harmony);
  }

  function setPinned(palette, message) {
    pinnedPalette = palette ? palette.slice(0, 4) : null;
    const badge = byId('pinnedBadge');
    if (badge) badge.hidden = !pinnedPalette;
    if (message) announce(message);
    updateMood();
  }

  function updateMood() {
    current = C.generate(state);
    const palette = activePalette();

    const backdrop = byId('colorBackdrop');
    if (backdrop) {
      backdrop.style.background = state.background === 'gradient' ?
        `linear-gradient(135deg, ${palette[0]}, ${palette[1]})` :
        palette[0];
    }

    if (!vibePinned) currentVibe = C.vibeForHue(current.h);
    const vibe = vibeNode();
    if (vibe) vibe.textContent = currentVibe;

    const values = C.describe(current);
    const named = C.nameOf(values.hex);
    const nameNode = byId('colorName');
    if (nameNode) {
      nameNode.textContent = named ?
        (named.distance < 8 ? named.name : `near ${named.name}`) :
        '';
    }
    [['hexValue', values.hex], ['rgbValue', values.rgb], ['hslValue', values.hsl]].forEach(([id, value]) => {
      const node = byId(id);
      if (node) node.textContent = value;
    });

    paintSwatches(palette);
    renderPairs(palette);
    renderVision(palette);

    /* With a gradient two colours share the screen, so pick the ink that keeps
     * the higher minimum contrast against both of them. */
    const backdropA = C.hexToRgb(palette[0]) || current;
    const backdropB = C.hexToRgb(palette[1]) || backdropA;
    const white = { r: 255, g: 255, b: 255 };
    const nearBlack = { r: 17, g: 17, b: 17 };
    const minWhite = Math.min(C.contrastRatio(backdropA, white), C.contrastRatio(backdropB, white));
    const minBlack = Math.min(C.contrastRatio(backdropA, nearBlack), C.contrastRatio(backdropB, nearBlack));
    const useWhite = minWhite >= minBlack;
    const backdropInk = {
      ink: useWhite ? '#ffffff' : '#111111',
      on: useWhite ? 'white' : 'black',
      ratio: Math.max(minWhite, minBlack)
    };
    document.documentElement.style.setProperty('--lh-mood', palette[0]);
    document.documentElement.style.setProperty('--lh-ink', backdropInk.ink);
    document.documentElement.style.setProperty('--on-backdrop', backdropInk.ink);
    document.documentElement.setAttribute('data-backdrop-ink', backdropInk.on);
    if (document.querySelector('.app-container.focus-mode')) flashFocusCaption();

    document.querySelectorAll('#slidersContainer input[type="range"], #customSlidersContainer input[type="range"]')
      .forEach((slider) => {
        const min = Number(slider.min || 0);
        const max = Number(slider.max || 100);
        const percent = ((Number(slider.value) - min) / (max - min || 1)) * 100;
        slider.style.background =
          `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percent}%, var(--color-muted) ${percent}%, var(--color-muted) 100%)`;
      });

    scheduleHistory(palette);
    schedulePersist();
    scheduleHash();
  }

  function scheduleHistory(palette) {
    window.clearTimeout(historyTimer);
    historyTimer = window.setTimeout(() => {
      const hex = palette[0];
      if (state.history.length && state.history[0].hex === hex) return;
      state.history.unshift({
        hex,
        palette,
        vibe: currentVibe,
        values: snapshotValues(),
        settings: {
          model: state.model,
          blend: state.blend,
          harmony: state.harmony,
          background: state.background
        }
      });
      state.history = state.history.slice(0, MAX_HISTORY);
      renderHistory();
      persistNow();
    }, 450);
  }

  /* ---------- clipboard and export ---------- */

  function legacyCopy(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    field.remove();
    return ok;
  }

  async function copyText(text, message) {
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }
    if (!copied) copied = legacyCopy(text);
    if (copied) {
      announce(message || 'Copied to clipboard');
      tick(660);
    } else {
      announce('Copy is blocked here \u2014 select the value and copy it manually.');
    }
  }

  function announce(message) {
    if (state.quiet) return;
    const status = byId('copyStatus');
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => {
      status.textContent = '';
    }, 2600);
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function paletteCss(palette) {
    return `:root {\n${palette.map((hex, index) => `  --mood-color-${index + 1}: ${hex};`).join('\n')}\n}\n`;
  }

  function paletteJson(palette) {
    return JSON.stringify({
      generatedBy: 'Mood Mixer',
      vibe: currentVibe,
      harmony: state.harmony,
      model: state.model,
      blend: state.blend,
      values: snapshotValues(),
      colors: palette
    }, null, 2);
  }

  function paletteTailwind(palette) {
    const names = ['base', 'accent', 'soft', 'deep'];
    return `// Mood Mixer palette \u2014 ${currentVibe}\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        mood: {\n${palette.map((hex, index) => `          ${names[index]}: '${hex}',`).join('\n')}\n        },\n      },\n    },\n  },\n};\n`;
  }

  function paletteText(palette) {
    const info = C.describe(current);
    const lines = [
      `Mood Mixer \u2014 ${currentVibe}`,
      `Base ${info.hex}  rgb(${info.rgb})  hsl(${info.hsl})`,
      `Harmony ${HARMONY_LABELS[state.harmony] || state.harmony}`,
      '',
      ...palette.map((hex, index) => `${index + 1}. ${hex.toUpperCase()}`)
    ];
    return lines.join('\n');
  }

  function paletteSheet(palette) {
    const width = 960;
    const rowHeight = 168;
    const height = 96 + rowHeight * palette.length + 56;
    const rows = palette.map((hex, index) => {
      const rgb = C.hexToRgb(hex) || { r: 0, g: 0, b: 0 };
      const hsl = C.rgbToHsl(rgb.r, rgb.g, rgb.b);
      const ink = C.bestInk(rgb);
      const onWhite = C.contrastRatio(rgb, { r: 255, g: 255, b: 255 });
      const onBlack = C.contrastRatio(rgb, { r: 17, g: 17, b: 17 });
      const y = 96 + index * rowHeight;
      return `
    <g transform="translate(48 ${y})">
      <rect width="864" height="${rowHeight - 16}" rx="14" fill="#ffffff" stroke="#e2e0da"/>
      <rect x="0" y="0" width="${rowHeight - 16}" height="${rowHeight - 16}" rx="14" fill="${hex}"/>
      <text x="${rowHeight + 8}" y="46" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="#24232b">${hex.toUpperCase()}</text>
      <text x="${rowHeight + 8}" y="82" font-family="system-ui, sans-serif" font-size="16" fill="#777582">rgb(${rgb.r}, ${rgb.g}, ${rgb.b})</text>
      <text x="${rowHeight + 8}" y="106" font-family="system-ui, sans-serif" font-size="16" fill="#777582">hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)</text>
      <text x="${rowHeight + 8}" y="130" font-family="system-ui, sans-serif" font-size="15" fill="#24232b">Text on this colour: ${ink.ink} at ${ink.ratio.toFixed(1)}:1</text>
      <text x="700" y="46" font-family="system-ui, sans-serif" font-size="15" fill="#777582">on white ${onWhite.toFixed(1)}:1</text>
      <text x="700" y="70" font-family="system-ui, sans-serif" font-size="15" fill="#777582">on black ${onBlack.toFixed(1)}:1</text>
    </g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mood Mixer palette sheet">
  <rect width="${width}" height="${height}" fill="#f5f4f1"/>
  <text x="48" y="46" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#24232b">Mood Mixer — ${currentVibe}</text>
  <text x="48" y="72" font-family="system-ui, sans-serif" font-size="15" fill="#777582">${HARMONY_LABELS[state.harmony] || state.harmony}${pinnedPalette ? ' · pinned palette' : ''} · ${new Date().toISOString().slice(0, 10)}</text>${rows}
  <text x="48" y="${height - 24}" font-family="system-ui, sans-serif" font-size="13" fill="#777582">Mood Mixer · drsamonline.github.io/mood-mixer</text>
</svg>`;
  }

  let nameTarget = null;
  let saveMoodNamedRef = null;
  let saveCollectionNamedRef = null;

  function requestName(kind) {
    const dialog = byId('nameDialog');
    const input = byId('nameInput');
    if (!dialog || !input || typeof dialog.showModal !== 'function') {
      const fallback = window.prompt(kind === 'mood' ? 'Name this mood:' : 'Name this palette:', autoName());
      if (fallback) applyName(fallback);
      return;
    }
    nameTarget = kind;
    const suggestions = nameSuggestions();
    input.value = suggestions[0] || autoName();
    const chips = byId('nameSuggestions');
    if (chips) {
      chips.replaceChildren(...suggestions.map((suggestion) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'name-chip';
        chip.textContent = suggestion;
        chip.addEventListener('click', () => {
          input.value = suggestion;
          input.focus();
        });
        return chip;
      }));
    }
    dialog.showModal();
    input.select();
  }

  function applyName(name) {
    if (nameTarget === 'collection' && saveCollectionNamedRef) saveCollectionNamedRef(name);
    else if (saveMoodNamedRef) saveMoodNamedRef(name);
  }

  let compareBase = null;
  let compareSecondId = '';
  let wantFocus = false;

  function compareRows(palette, label) {
    const wrap = document.createElement('div');
    wrap.className = 'compare-column';

    const title = document.createElement('h3');
    title.textContent = label;
    wrap.appendChild(title);

    const strip = document.createElement('div');
    strip.className = 'compare-strip';
    const list = document.createElement('dl');
    list.className = 'compare-list';

    palette.forEach((hex, index) => {
      const rgb = C.hexToRgb(hex);
      const ink = rgb ? C.bestInk(rgb) : null;
      const grade = ink ? C.grade(ink.ratio) : null;

      const chip = document.createElement('span');
      chip.style.backgroundColor = hex;
      strip.appendChild(chip);

      const dt = document.createElement('dt');
      dt.textContent = `${index + 1}. ${hex}`;
      const dd = document.createElement('dd');
      if (ink && grade) {
        dd.textContent = `${ink.ratio.toFixed(1)}:1 ${grade.level}`;
        dd.classList.add(grade.pass ? 'is-pass' : 'is-fail');
      }
      list.append(dt, dd);
    });

    wrap.append(strip, list);
    return wrap;
  }

  function openCompare(source) {
    const collection = {
      id: source.id || '',
      name: source.name || 'Palette',
      palette: source.palette || (source.hex ? [source.hex] : [])
    };
    const dialog = byId('compareDialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const body = byId('compareBody');
    const heading = byId('compareTitle');
    if (heading) heading.textContent = `${collection.name || 'Palette'} vs the current palette`;
    compareBase = collection;
    const selector = byId('compareSecond');
    if (selector) {
      const others = state.collections.filter((item) => item.id !== collection.id);
      selector.replaceChildren(new Option('No second palette', ''));
      others.forEach((item) => selector.appendChild(new Option(item.name || 'Palette', item.id)));
      const stillThere = others.some((item) => item.id === compareSecondId);
      if (!stillThere) compareSecondId = '';
      selector.value = compareSecondId;
    }
    if (body) {
      const currentPalette = activePalette();
      const savedPalette = collection.palette || [];
      body.replaceChildren(
        compareRows(currentPalette, 'Current'),
        compareRows(savedPalette, collection.name || 'Saved')
      );
      const second = compareSecondId ? state.collections.find((item) => item.id === compareSecondId) : null;
      if (second) body.appendChild(compareRows(second.palette || [], second.name || 'Palette'));

      /* Mark the higher-contrast colour at each position. */
      const lists = body.querySelectorAll('.compare-list');
      if (lists.length === 2) {
        const ratios = (palette) => palette.map((hex) => {
          const rgb = C.hexToRgb(hex);
          const ink = rgb ? C.bestInk(rgb) : null;
          return ink ? ink.ratio : 0;
        });
        const a = ratios(currentPalette);
        const b = ratios(savedPalette);
        const mark = (list, index, wins) => {
          const dd = list.querySelectorAll('dd')[index];
          if (!dd) return;
          dd.classList.toggle('is-winner', wins);
          if (wins) dd.textContent = `${dd.textContent} \u25b2`;
        };
        for (let i = 0; i < 4; i += 1) {
          const left = a[i] || 0;
          const right = b[i] || 0;
          if (Math.abs(left - right) < 0.05) continue;
          mark(lists[0], i, left > right);
          mark(lists[1], i, right > left);
        }
      }
    }
    dialog.showModal();
  }

  function compareSheet() {
    const collection = compareBase;
    if (!collection) return null;
    const columns = [['Current', activePalette()], [collection.name || 'Saved', collection.palette || []]];
    if (compareSecondId) {
      const second = state.collections.find((item) => item.id === compareSecondId);
      if (second) columns.push([second.name || 'Palette', second.palette || []]);
    }
    const colWidth = 260;
    const width = 96 + colWidth * columns.length;
    const height = 300;
    const body = columns.map(([label, palette], columnIndex) => {
      const x = 48 + columnIndex * colWidth;
      const chips = palette.map((hex, index) => {
        const rgb = C.hexToRgb(hex);
        const ink = rgb ? C.bestInk(rgb) : null;
        const grade = ink ? C.grade(ink.ratio) : null;
        const y = 120 + index * 40;
        return `<rect x="${x}" y="${y}" width="42" height="30" rx="6" fill="${hex}" stroke="#e2e0da"/>
      <text x="${x + 52}" y="${y + 14}" font-family="system-ui, sans-serif" font-size="12" fill="#24232b">${hex}</text>
      <text x="${x + 52}" y="${y + 27}" font-family="system-ui, sans-serif" font-size="10" fill="#777582">${ink ? ink.ratio.toFixed(1) + ':1 ' + grade.level : ''}</text>`;
      }).join('\n      ');
      return `<text x="${x}" y="96" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#24232b">${label}</text>
      ${chips}`;
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mood Mixer palette comparison">
  <rect width="${width}" height="${height}" fill="#f5f4f1"/>
  <text x="48" y="46" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#24232b">Palette comparison</text>
  <text x="48" y="68" font-family="system-ui, sans-serif" font-size="12" fill="#777582">${new Date().toISOString().slice(0, 10)}</text>
  ${body}
  <text x="48" y="${height - 20}" font-family="system-ui, sans-serif" font-size="11" fill="#777582">Mood Mixer · drsamonline.github.io/mood-mixer</text>
</svg>`;
  }

  function printHistory() {
    const sheet = byId('printSheet');
    if (!sheet) return;
    const entries = state.history.slice(0, MAX_HISTORY);
    if (!entries.length) {
      announce('No history to print yet');
      return;
    }
    sheet.replaceChildren();
    const title = document.createElement('h1');
    title.textContent = 'Mood Mixer — recent palettes';
    const sub = document.createElement('p');
    sub.textContent = `${entries.length} entries · ${new Date().toLocaleDateString()}`;
    sheet.append(title, sub);

    entries.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'print-row';
      const label = document.createElement('span');
      label.className = 'print-label';
      label.textContent = `${index + 1}. ${entry.vibe || 'Color'}`;
      const hexes = document.createElement('span');
      hexes.className = 'print-hexes';
      hexes.textContent = (entry.palette || [entry.hex]).join('  ');
      const strip = document.createElement('span');
      strip.className = 'print-strip';
      (entry.palette || [entry.hex]).forEach((hex) => {
        const chip = document.createElement('span');
        chip.style.backgroundColor = hex;
        strip.appendChild(chip);
      });
      row.append(label, strip, hexes);
      sheet.appendChild(row);
    });

    document.body.classList.add('printing-history');
    const cleanup = () => {
      document.body.classList.remove('printing-history');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    window.setTimeout(cleanup, 4000);
  }

  function historySheet() {
    const entries = state.history.slice(0, MAX_HISTORY);
    if (!entries.length) {
      announce('No history to export yet');
      return null;
    }
    const width = 900;
    const rowHeight = 76;
    const height = 96 + entries.length * rowHeight + 44;
    const rows = entries.map((entry, index) => {
      const palette = entry.palette && entry.palette.length ? entry.palette : [entry.hex];
      const y = 88 + index * rowHeight;
      const chips = palette.map((hex, chipIndex) => {
        const x = 300 + chipIndex * 132;
        return `<rect x="${x}" y="${y}" width="124" height="52" rx="8" fill="${hex}" stroke="#e2e0da"/>
      <text x="${x}" y="${y + 68}" font-family="system-ui, sans-serif" font-size="11" fill="#777582">${hex}</text>`;
      }).join('\n      ');
      return `<g>
      <text x="48" y="${y + 20}" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#24232b">${index + 1}. ${entry.vibe || 'Color'}</text>
      <text x="48" y="${y + 40}" font-family="system-ui, sans-serif" font-size="12" fill="#777582">${entry.hex}</text>
      ${chips}
    </g>`;
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mood Mixer palette history">
  <rect width="${width}" height="${height}" fill="#f5f4f1"/>
  <text x="48" y="46" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#24232b">Mood Mixer — recent palettes</text>
  <text x="48" y="68" font-family="system-ui, sans-serif" font-size="13" fill="#777582">${entries.length} entries · ${new Date().toISOString().slice(0, 10)}</text>
  ${rows}
  <text x="48" y="${height - 18}" font-family="system-ui, sans-serif" font-size="12" fill="#777582">Mood Mixer · drsamonline.github.io/mood-mixer</text>
</svg>`;
  }

  function exportSheetPng(palette) {
    const svg = paletteSheet(palette);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#f5f4f1';
      ctx.fillRect(0, 0, image.width, image.height);
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) {
          announce('The sheet could not be rendered');
          return;
        }
        const pngUrl = URL.createObjectURL(png);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'mood-mixer-sheet.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1500);
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      announce('The sheet could not be rendered');
    };
    image.src = url;
  }

  function exportPng(palette) {
    const width = 1200;
    const height = 630;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const band = width / palette.length;
    palette.forEach((hex, index) => {
      const rgb = C.hexToRgb(hex);
      const ink = rgb ? C.bestInk(rgb) : { ink: '#111111' };
      ctx.fillStyle = hex;
      ctx.fillRect(index * band, 0, band, height);
      ctx.fillStyle = ink.ink;
      ctx.font = '600 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hex.toUpperCase(), index * band + band / 2, height - 120);
      ctx.font = '500 18px system-ui, sans-serif';
      ctx.globalAlpha = 0.75;
      ctx.fillText(`${currentVibe}`, index * band + band / 2, height - 88);
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, width, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Mood Mixer', 48, 60);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mood-mixer-palette.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  }

  /* ---------- focus mode ---------- */

  function flashFocusCaption() {
    const caption = byId('focusCaption');
    if (!caption) return;
    caption.textContent = `${C.toHex(current)} \u00b7 ${currentVibe}`;
    caption.classList.add('is-on');
    window.clearTimeout(flashFocusCaption.timer);
    flashFocusCaption.timer = window.setTimeout(() => caption.classList.remove('is-on'), 1400);
  }

  function setFocusMode(active) {
    const appContainer = $('.app-container');
    const button = byId('focusModeBtn');
    if (!appContainer) return;
    appContainer.classList.toggle('focus-mode', active);
    appContainer.classList.remove('hud-visible');
    document.body.classList.toggle('focus-locked', active);
    document.documentElement.classList.toggle('focus-on', active);
    if (active) startDrift();
    else stopDrift();
    if (button) {
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? '\u2715 Exit focus view' : '\u26f6 Focus on color';
    }
    window.clearTimeout(hudHideTimer);
    if (active) flashFocusCaption();
  }

  function toggleFocusMode() {
    const appContainer = $('.app-container');
    if (!appContainer) return;
    setFocusMode(!appContainer.classList.contains('focus-mode'));
  }

  function stopDrift() {
    window.clearInterval(driftTimer);
    driftTimer = 0;
  }

  function startDrift() {
    stopDrift();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!state.drift || reduced) return;
    driftTimer = window.setInterval(() => {
      const appContainer = $('.app-container');
      if (!appContainer || !appContainer.classList.contains('focus-mode')) return;
      if (document.hidden) return;
      state.values.energy = (Number(state.values.energy ?? 50) + 3) % 101;
      updateMood();
    }, 4000);
  }

  function nameSuggestions() {
    const harmony = (HARMONY_LABELS[state.harmony] || state.harmony || '').toLowerCase();
    const vibe = String(currentVibe || 'Mood').replace(/\s+/g, ' ').trim();
    const named = C.nameOf(C.toHex(current));
    const colour = named ? named.name : 'colour';
    const list = [
      `${vibe} \u00b7 ${harmony}`,
      `${colour} at ${state.values.energy ?? 50}`,
      `${vibe} ${colour}`
    ];
    return Array.from(new Set(list)).slice(0, 3);
  }

  function autoName() {
    const harmony = (HARMONY_LABELS[state.harmony] || state.harmony || '').toLowerCase();
    const vibe = String(currentVibe || 'Mood').replace(/\s+/g, ' ').trim();
    return `${vibe} \u00b7 ${harmony}`;
  }

  function randomize() {
    commitUndo();
    [...DEFAULTS, ...state.custom].forEach((slider) => {
      state.values[slider.id] = Math.floor(Math.random() * 101);
    });
    buildSliders();
    updateMood();
    tick(580);
  }

  /* ---------- events ---------- */

  function bindEvents() {
    on('themeToggle', 'click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      syncSettings();
      schedulePersist();
    });

    on('contrastToggle', 'click', () => {
      state.contrast = state.contrast === 'high' ? 'normal' : 'high';
      syncSettings();
      schedulePersist();
    });

    on('controlsToggle', 'click', () => {
      state.controlsOpen = !state.controlsOpen;
      syncSettings();
      schedulePersist();
    });

    let pressTimer = 0;
    document.addEventListener('pointerdown', (event) => {
      const appContainer = $('.app-container');
      if (!appContainer) return;
      const interactive = event.target.closest('button, a, input, select, textarea, label, [contenteditable="true"], dialog');
      if (!interactive && !appContainer.classList.contains('focus-mode')) {
        window.clearTimeout(pressTimer);
        pressTimer = window.setTimeout(() => {
          setFocusMode(true);
          announce('Focus mode \u2014 tap to show the interface, Escape to leave');
        }, 550);
      }
    }, { passive: true });

    ['pointerup', 'pointercancel', 'pointermove'].forEach((type) => {
      document.addEventListener(type, () => window.clearTimeout(pressTimer), { passive: true });
    });

    document.addEventListener('pointerdown', () => {
      const appContainer = $('.app-container');
      if (!appContainer || !appContainer.classList.contains('focus-mode')) return;
      appContainer.classList.add('hud-visible');
      window.clearTimeout(hudHideTimer);
      hudHideTimer = window.setTimeout(() => appContainer.classList.remove('hud-visible'), 3500);
    });

    on('focusModeBtn', 'click', toggleFocusMode);

    on('copyPaletteBtn', 'click', () => copyText(activePalette().join(', '), 'Four-color palette copied'));
    on('copyHexBtn', 'click', () => copyText(C.toHex(current), `${C.toHex(current)} copied`));
    on('seedPhotoBtn', 'click', () => byId('seedPhotoInput')?.click());

    document.addEventListener('paste', (event) => {
      const items = event.clipboardData ? Array.from(event.clipboardData.items) : [];
      const imageItem = items.find((item) => item.type && item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      event.preventDefault();
      seedFromFile(file);
    });

    on('seedPhotoInput', 'change', (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) seedFromFile(file);
    });
  }

  function seedFromFile(file) {
    {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, size, size);
        URL.revokeObjectURL(url);
        let data = null;
        try {
          data = ctx.getImageData(0, 0, size, size).data;
        } catch (error) {
          data = null;
        }
        if (!data) {
          announce('That image could not be read');
          return;
        }
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
          pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
        }
        const colors = C.dominant(pixels, 3);
        if (!colors.length) {
          announce('No colours found in that image');
          return;
        }
        if (matchSlidersTo(colors[0])) announce(`Seeded from the photo: ${colors[0]}`);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        announce('That file is not an image the browser can read');
      };
      image.src = url;
    }
  }

  function bindHeroExtras() {
    on('copyLinkBtn', 'click', async () => {
      const url = shareUrl();
      if (navigator.share) {
        try {
          await navigator.share({ title: `Mood Mixer \u2014 ${currentVibe}`, url });
          announce('Link shared');
          return;
        } catch (error) {
          // fall through to clipboard
        }
      }
      copyText(url, 'Link to this palette copied');
    });
    on('upiCopyBtn', 'click', () => copyText('drsohilboi@ybl', 'UPI ID drsohilboi@ybl copied'));

    on('exportCssBtn', 'click', () => download('mood-mixer-palette.css', paletteCss(activePalette()), 'text/css'));
    on('exportJsonBtn', 'click', () => download('mood-mixer-palette.json', paletteJson(activePalette()), 'application/json'));
    on('exportTailwindBtn', 'click', () => download('mood-mixer.tailwind.js', paletteTailwind(activePalette()), 'text/javascript'));
    on('exportPngBtn', 'click', () => exportPng(activePalette()));
    on('exportSheetBtn', 'click', () => download('mood-mixer-sheet.svg', paletteSheet(activePalette()), 'image/svg+xml'));
    on('exportSheetPngBtn', 'click', () => exportSheetPng(activePalette()));
    on('historySheetBtn', 'click', () => {
      const svg = historySheet();
      if (svg) download('mood-mixer-history.svg', svg, 'image/svg+xml');
    });

    on('printHistoryBtn', 'click', () => printHistory());

    on('searchInput', 'input', (event) => {
      query = event.target.value.trim().toLowerCase();
      renderSaved();
      renderCollections();
    });
    on('copyTextBtn', 'click', () => copyText(paletteText(activePalette()), 'Palette copied as text'));
    on('printBtn', 'click', () => {
      announce('Print the palette card from the print dialog');
      window.print();
    });

    const keysDialog = byId('shortcutsDialog');
    const openKeys = () => {
      if (keysDialog && typeof keysDialog.showModal === 'function') keysDialog.showModal();
    };
    on('shortcutsBtn', 'click', openKeys);

    document.querySelectorAll('.copy-color-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const target = byId(button.dataset.copy);
        if (target) copyText(target.textContent, `${target.textContent} copied`);
      });
    });

    document.querySelectorAll('.hero-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const hex = swatch.dataset.hex;
        if (hex) copyText(hex, `${hex} copied`);
      });
    });

    on('undoReorderBtn', 'click', () => {
      if (!historyOrderBackup) return;
      state.history = historyOrderBackup.slice();
      historyOrderBackup = null;
      renderHistory();
      persistNow();
      const undoReorder = byId('undoReorderBtn');
      if (undoReorder) undoReorder.hidden = true;
      announce('Order restored');
    });

    on('undoBtn', 'click', undo);
    on('redoBtn', 'click', redo);

    on('resetBtn', 'click', () => {
      commitUndo();
      DEFAULTS.forEach((slider) => {
        state.values[slider.id] = 50;
      });
      state.custom.forEach((slider) => {
        state.values[slider.id] = 50;
      });
      buildSliders();
      updateMood();
      tick(420);
    });

    on('randomizeBtn', 'click', randomize);
    on('randomizeHeader', 'click', randomize);

    on('saveCollectionBtn', 'click', () => requestName('collection'));

    saveCollectionNamedRef = (name) => {
      if (!name || !name.trim()) return;
      state.collections.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name.trim(),
        palette: C.palette(current, state.harmony),
        values: snapshotValues(),
        settings: {
          model: state.model,
          blend: state.blend,
          harmony: state.harmony,
          background: state.background
        }
      });
      state.collections = state.collections.slice(0, 40);
      renderCollections();
      persistNow();
      announce('Palette saved to collections');
    };

    const dropZone = byId('imageDrop');
    if (dropZone) {
      ['dragenter', 'dragover'].forEach((type) => {
        dropZone.addEventListener(type, (event) => {
          event.preventDefault();
          dropZone.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach((type) => {
        dropZone.addEventListener(type, () => dropZone.classList.remove('is-over'));
      });
      dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) imageToPalette(file);
      });
    }
    on('imageInput', 'change', (event) => {
      const file = event.target.files?.[0];
      if (file) imageToPalette(file);
      event.target.value = '';
    });

    on('addSliderBtn', 'click', () => {
      commitUndo();
      const index = state.custom.length;
      const targets = ['hue', 'sat', 'lit'];
      const slider = {
        id: `custom_${Date.now()}`,
        label: `Custom ${index + 1}`,
        target: targets[index % targets.length],
        value: 50
      };
      state.custom.push(slider);
      state.values[slider.id] = 50;
      buildSliders();
      updateMood();
    });

    on('addVibeBtn', 'click', () => {
      const word = window.prompt('Enter a new vibe word or phrase:');
      if (word && word.trim() && !state.vibes.includes(word.trim())) {
        state.vibes.push(word.trim());
        renderVibes();
        schedulePersist();
      }
    });

    on('regenerateVibeBtn', 'click', () => {
      if (!state.vibes.length) return;
      const pool = state.vibes.filter((word) => word !== currentVibe);
      const source = pool.length ? pool : state.vibes;
      currentVibe = source[Math.floor(Math.random() * source.length)];
      vibePinned = true;
      updateMood();
    });

    on('sentenceBtn', 'click', () => {
      const base = String(currentVibe).replace(/^feeling\s+/i, '').replace(/\s+right now$/i, '');
      currentVibe = `Feeling ${base.toLowerCase()} right now`;
      vibePinned = true;
      const node = vibeNode();
      if (node) node.textContent = currentVibe;
      schedulePersist();
    });

    on('saveMoodBtn', 'click', () => requestName('mood'));

    saveMoodNamedRef = (name) => {
      if (!name || !name.trim()) return;
      state.saved.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name.trim(),
        hex: C.toHex(current),
        palette: C.palette(current, state.harmony),
        vibe: currentVibe,
        values: snapshotValues(),
        folder: state.folderFilter === 'All' ? (state.lastFolder || 'Unfiled') : state.folderFilter,
        settings: {
          model: state.model,
          blend: state.blend,
          harmony: state.harmony,
          background: state.background
        }
      });
      state.saved = state.saved.slice(0, MAX_SAVED);
      renderSaved();
      persistNow();
      const savedRgb = C.hexToRgb(C.toHex(current));
      const savedInk = savedRgb ? C.bestInk(savedRgb) : null;
      if (savedInk && !C.grade(savedInk.ratio).pass) {
        announce(`Mood saved \u2014 text on it is only ${savedInk.ratio.toFixed(1)}:1, below AA`);
      } else {
        announce('Mood saved');
      }
      tick(760);
    };

    on('exportBtn', 'click', () => download('mood-mixer-bundle.json', JSON.stringify({
      app: 'Mood Mixer',
      version: 3,
      appVersion: '2.10.0',
      exported: new Date().toISOString(),
      settings: {
        model: state.model,
        blend: state.blend,
        harmony: state.harmony,
        background: state.background,
        uiTheme: state.uiTheme,
        theme: state.theme,
        contrast: state.contrast,
        values: snapshotValues(),
        labels: state.labels,
        vibes: state.vibes
      },
      moods: state.saved,
      collections: state.collections
    }, null, 2), 'application/json'));

    on('exportFolderBtn', 'click', () => {
      if (state.folderFilter === 'All') {
        announce('Pick a folder first');
        return;
      }
      const folder = state.folderFilter;
      const moods = state.saved.filter((mood) => folderOf(mood) === folder);
      if (!moods.length) {
        announce('That folder is empty');
        return;
      }
      const payload = {
        app: 'Mood Mixer',
        kind: 'folder',
        folder,
        exported: new Date().toISOString(),
        moods
      };
      download(`mood-mixer-${folder.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, JSON.stringify(payload, null, 2), 'application/json');
      announce(`${moods.length} mood${moods.length === 1 ? '' : 's'} exported`);
    });

    on('renameFolderBtn', 'click', () => {
      if (state.folderFilter === 'All') {
        announce('Pick a folder first');
        return;
      }
      const from = state.folderFilter;
      const next = window.prompt(`Rename the folder "${from}" to:`, from);
      if (next === null) return;
      const to = next.trim();
      if (!to || to === from) return;
      let moved = 0;
      state.saved.forEach((mood) => {
        if (folderOf(mood) === from) {
          mood.folder = to;
          moved += 1;
        }
      });
      state.folderFilter = to;
      state.lastFolder = to;
      renderSaved();
      persistNow();
      announce(`${moved} mood${moved === 1 ? '' : 's'} moved to ${to}`);
    });

    on('restoreDeleteBtn', 'click', () => {
      if (!deletedBuffer) return;
      state.saved = deletedBuffer.concat(state.saved).slice(0, MAX_SAVED);
      const restored = deletedBuffer.length;
      deletedBuffer = null;
      window.clearTimeout(deletedTimer);
      renderSaved();
      renderRestoreBar();
      persistNow();
      announce(`${restored} restored`);
    });

    on('bulkSelectAll', 'click', () => {
      state.saved.forEach((mood) => selection.add(mood.id));
      renderSaved();
    });

    on('bulkClear', 'click', () => {
      selection.clear();
      renderSaved();
    });

    on('bulkMove', 'click', () => {
      if (!selection.size) return;
      const target = window.prompt('Move selected moods to folder:', state.folderFilter === 'All' ? 'Unfiled' : state.folderFilter);
      if (target === null) return;
      const folder = target.trim() || 'Unfiled';
      state.saved.forEach((mood) => {
        if (selection.has(mood.id)) mood.folder = folder;
      });
      state.lastFolder = folder;
      selection.clear();
      state.folderFilter = 'All';
      renderSaved();
      persistNow();
      announce(`Moved to ${folder}`);
    });

    on('bulkDelete', 'click', () => {
      if (!selection.size) return;
      const count = selection.size;
      if (!window.confirm(`Delete ${count} saved mood${count === 1 ? '' : 's'}? You can undo for 20 seconds.`)) return;
      deletedBuffer = state.saved.filter((mood) => selection.has(mood.id));
      state.saved = state.saved.filter((mood) => !selection.has(mood.id));
      selection.clear();
      renderSaved();
      persistNow();
      showRestore(`${count} deleted`);
      window.clearTimeout(deletedTimer);
      deletedTimer = window.setTimeout(() => {
        deletedBuffer = null;
        renderRestoreBar();
      }, 20000);
    });

    on('importBtn', 'click', () => byId('importFileInput')?.click());

    on('importConfirmBtn', 'click', () => {
      const dialog = byId('importDialog');
      if (!pendingImport) {
        if (dialog) dialog.close();
        return;
      }
      const { data, moods } = pendingImport;
      const applySettingsBox = byId('importApplySettings');
      const withSettings = Boolean(applySettingsBox && applySettingsBox.checked && data.settings);
      pendingImport = null;
      if (dialog) dialog.close();
      applyImport(data, moods);
      if (withSettings) restoreSettings(data.settings);
    });

    on('compareCloseBtn', 'click', () => byId('compareDialog')?.close());

    on('compareSaveBtn', 'click', () => {
      const svg = compareSheet();
      if (svg) download('mood-mixer-compare.svg', svg, 'image/svg+xml');
    });

    on('compareSecond', 'change', (event) => {
      compareSecondId = event.target.value;
      if (!compareBase) return;
      const body = byId('compareBody');
      if (!body) return;
      const savedPalette = compareBase.palette || [];
      body.replaceChildren(
        compareRows(activePalette(), 'Current'),
        compareRows(savedPalette, compareBase.name || 'Saved')
      );
      const second = compareSecondId ? state.collections.find((item) => item.id === compareSecondId) : null;
      if (second) body.appendChild(compareRows(second.palette || [], second.name || 'Palette'));
    });

    on('nameSaveBtn', 'click', () => {
      const input = byId('nameInput');
      const value = input ? input.value.trim() : '';
      byId('nameDialog')?.close();
      if (value) applyName(value);
    });

    on('nameCancelBtn', 'click', () => byId('nameDialog')?.close());

    on('nameInput', 'keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      byId('nameSaveBtn')?.click();
    });

    on('importCancelBtn', 'click', () => {
      pendingImport = null;
      const dialog = byId('importDialog');
      if (dialog) dialog.close();
      announce('Import cancelled');
    });

    on('importFileInput', 'change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        window.alert('That file is larger than 2 MB. Pick a Mood Mixer backup.');
        event.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let data = null;
        try {
          data = JSON.parse(reader.result);
        } catch (error) {
          data = null;
        }
        const moods = data && Array.isArray(data.moods) ? data.moods : null;
        if (!moods) {
          window.alert('This file does not contain a valid mood backup.');
          event.target.value = '';
          return;
        }
        const previewCollections = Array.isArray(data.collections) ? data.collections : [];
        const knownIds = new Set(state.saved.map((item) => item.id));
        const newMoods = moods.filter((item) => item && typeof item.id === 'string' && !knownIds.has(item.id)).length;
        const dialog = byId('importDialog');
        if (dialog && typeof dialog.showModal === 'function') {
          const summary = byId('importSummary');
          if (summary) {
            summary.replaceChildren();
            const rows = [
              ['Moods in the file', String(moods.length)],
              ['New after merging', String(newMoods)],
              ['Palettes in the file', String(previewCollections.length)],
              ['Moods you already have', String(state.saved.length)]
            ];
            rows.push(['Settings in the file', data.settings ? 'yes' : 'no']);
            rows.forEach(([label, value]) => {
              const dt = document.createElement('dt');
              dt.textContent = label;
              const dd = document.createElement('dd');
              dd.textContent = value;
              summary.append(dt, dd);
            });
          }
          const applySettingsBox = byId('importApplySettings');
          if (applySettingsBox) {
            applySettingsBox.checked = Boolean(data.settings);
            applySettingsBox.disabled = !data.settings;
            const wrap = byId('importSettingsRow');
            if (wrap) wrap.hidden = !data.settings;
          }
          pendingImport = { data, moods };
          dialog.showModal();
          event.target.value = '';
          return;
        }
        applyImport(data, moods);
        event.target.value = '';
      };
      reader.readAsText(file);
    });

    [
      ['colorModelSelect', 'model'],
      ['blendModeSelect', 'blend'],
      ['harmonySelect', 'harmony'],
      ['backgroundMode', 'background']
    ].forEach(([id, key]) => {
      on(id, 'change', (event) => {
        state[key] = event.target.value;
        updateMood();
      });
    });

    on('themeSelect', 'change', (event) => {
      state.uiTheme = event.target.value;
      syncSettings();
      schedulePersist();
    });

    [
      ['lockHue', 'hue'],
      ['lockSat', 'sat'],
      ['lockLit', 'lit']
    ].forEach(([id, key]) => {
      on(id, 'change', (event) => {
        state.locks[key] = event.target.checked;
        const colorKey = key === 'hue' ? 'h' : key === 'sat' ? 's' : 'l';
        state.lockedValues[key] = event.target.checked ? current[colorKey] : null;
        updateMood();
      });
    });

    on('audioToggle', 'change', (event) => {
      state.audio = event.target.checked;
      if (state.audio) tick(660);
      schedulePersist();
    });

    on('quietToggle', 'change', (event) => {
      state.quiet = event.target.checked;
      if (state.quiet) {
        const status = byId('copyStatus');
        if (status) status.textContent = '';
      }
      schedulePersist();
    });

    on('driftToggle', 'change', (event) => {
      state.drift = event.target.checked;
      if (state.drift) startDrift();
      else stopDrift();
      schedulePersist();
    });

    on('particlesToggle', 'change', (event) => {
      state.particles = event.target.checked;
      particles.refresh();
      schedulePersist();
    });

    document.addEventListener('keydown', (event) => {
      const tag = (event.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable;

      if (event.key === 'Escape') {
        const appContainer = $('.app-container');
        if (appContainer && appContainer.classList.contains('focus-mode')) {
          setFocusMode(false);
          event.preventDefault();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === 'f') {
        toggleFocusMode();
        event.preventDefault();
      } else if (key === 'r') {
        randomize();
        event.preventDefault();
      } else if (key === 's') {
        byId('saveMoodBtn')?.click();
        event.preventDefault();
      } else if (key === 'c') {
        byId('copyHexBtn')?.click();
        event.preventDefault();
      } else if (event.key === '?' || (key === '/' && event.shiftKey)) {
        const keysDialog = byId('shortcutsDialog');
        if (keysDialog && typeof keysDialog.showModal === 'function') keysDialog.showModal();
        event.preventDefault();
      }
    });
  }

  let deferredInstall = null;
  let pendingImport = null;
  let query = '';
  const selection = new Set();
  let deletedBuffer = null;
  let deletedTimer = 0;

  function showInstall(show) {
    const button = byId('installBtn');
    if (button) button.hidden = !show;
  }

  function bindInstall() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) {
      showInstall(false);
      return;
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstall = event;
      showInstall(true);
    });
    window.addEventListener('appinstalled', () => {
      deferredInstall = null;
      showInstall(false);
      announce('Mood Mixer installed');
    });
    on('installBtn', 'click', async () => {
      if (!deferredInstall) {
        announce('Use the browser menu to install this page');
        return;
      }
      deferredInstall.prompt();
      try {
        await deferredInstall.userChoice;
      } catch (error) {
        // dismissed
      }
      deferredInstall = null;
      showInstall(false);
    });
  }

  function restoreSettings(settings) {
    if (!settings || typeof settings !== 'object') return;
    ['model', 'blend', 'harmony', 'background', 'uiTheme', 'theme', 'contrast'].forEach((key) => {
      if (typeof settings[key] === 'string') state[key] = settings[key];
    });
    if (settings.values && typeof settings.values === 'object') {
      Object.assign(state.values, settings.values);
    }
    if (settings.labels && typeof settings.labels === 'object') state.labels = settings.labels;
    if (Array.isArray(settings.vibes) && settings.vibes.length) state.vibes = settings.vibes.slice(0, 200);
    syncSettings();
    buildSliders();
    renderVibes();
    updateMood();
    announce('Settings restored from the bundle');
  }

  function applyImport(data, moods) {
    const known = new Set(state.saved.map((item) => item.id));
    const clean = moods
          .filter((item) => item && typeof item === 'object' && typeof item.hex === 'string')
          .map((item) => ({
            id: typeof item.id === 'string' ? item.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: String(item.name || 'Imported mood').slice(0, 80),
            hex: item.hex.slice(0, 9),
            vibe: String(item.vibe || '').slice(0, 60),
            note: String(item.note || '').slice(0, 200),
            values: item.values && typeof item.values === 'object' ? item.values : {},
            settings: item.settings && typeof item.settings === 'object' ? item.settings : {}
          }))
          .filter((item) => !known.has(item.id));
    state.saved = clean.concat(state.saved).slice(0, MAX_SAVED);

    const collections = Array.isArray(data.collections) ? data.collections : [];
    const cleanCollections = collections
          .filter((item) => item && typeof item === 'object' && Array.isArray(item.palette))
          .map((item) => ({
            id: typeof item.id === 'string' ? item.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: String(item.name || 'Palette').slice(0, 80),
            palette: item.palette.slice(0, 4).map((hex) => String(hex).slice(0, 9)),
            values: item.values && typeof item.values === 'object' ? item.values : {},
            settings: item.settings && typeof item.settings === 'object' ? item.settings : {}
          }));
    state.collections = cleanCollections.concat(state.collections).slice(0, 40);

    renderSaved();
    renderCollections();
    persistNow();
    announce(`${clean.length} mood${clean.length === 1 ? '' : 's'}, ${cleanCollections.length} palette${cleanCollections.length === 1 ? '' : 's'} imported`);
  }

  function bindNetwork() {
    const badge = byId('netBadge');
    if (!badge) return;
    const paint = () => {
      const offline = navigator.onLine === false;
      badge.hidden = !offline;
      if (offline) badge.textContent = 'Offline \u00b7 still working';
    };
    window.addEventListener('online', paint);
    window.addEventListener('offline', paint);
    paint();
  }

  function init() {
    const fromHash = readHash();
    if (!pinnedPalette && state.pinned) pinnedPalette = state.pinned.slice();
    currentVibe = state.vibe || (state.vibes.length ? state.vibes[0] : 'Moody');
    if (state.vibe) vibePinned = true;
    syncSettings();
    buildSliders();
    renderPresets();
    renderCollections();
    renderVibes();
    renderSaved();
    renderHistory();
    updateUndoButtons();
    bindEvents();
    bindHeroExtras();
    bindInstall();
    bindNetwork();
    particles.init();
    if (state.drift) startDrift();
    updateMood();
    if (wantFocus) setFocusMode(true);
    if (fromHash) announce('Loaded palette from link');
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('../service-worker.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
