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

  /* ---------- persistence ---------- */

  function persistNow() {
    try {
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
    return touched;
  }

  function scheduleHash() {
    window.clearTimeout(hashTimer);
    hashTimer = window.setTimeout(() => {
      const params = new URLSearchParams();
      params.set('en', String(state.values.energy ?? 50));
      params.set('ca', String(state.values.calmness ?? 50));
      params.set('sp', String(state.values.sparkle ?? 50));
      params.set('model', state.model);
      params.set('blend', state.blend);
      params.set('harmony', state.harmony);
      params.set('bg', state.background);
      const next = '#' + params.toString();
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
    container.replaceChildren();
    if (!state.history.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = 'Your recent palettes will appear here.';
      container.appendChild(empty);
      return;
    }
    state.history.slice(0, MAX_HISTORY).forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'history-item';
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

  function renderSaved() {
    const container = byId('savedMoodsContainer');
    if (!container) return;
    container.replaceChildren();
    if (!state.saved.length) {
      const empty = document.createElement('p');
      empty.className = 'section-hint';
      empty.textContent = 'No saved moods yet.';
      container.appendChild(empty);
      return;
    }
    state.saved.forEach((mood) => {
      const row = document.createElement('div');
      row.className = 'saved-mood-item';
      const swatch = document.createElement('span');
      swatch.className = 'saved-mood-swatch';
      swatch.style.backgroundColor = mood.hex || '#888888';
      const info = document.createElement('div');
      info.className = 'saved-mood-info';
      const title = document.createElement('div');
      title.className = 'saved-mood-name';
      title.textContent = mood.name || 'Saved mood';
      const meta = document.createElement('div');
      meta.className = 'saved-mood-meta';
      meta.textContent = [mood.vibe || 'Saved color', mood.hex].filter(Boolean).join(' \u00b7 ');
      info.append(title, meta);
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

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-sm';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => {
        state.saved = state.saved.filter((item) => item.id !== mood.id);
        renderSaved();
        persistNow();
      });

      actions.append(load, rename, remove);
      row.append(swatch, info, actions);
      container.appendChild(row);
    });
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
    input.addEventListener('keydown', begin);
    input.addEventListener('input', () => {
      begin();
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

  function updateMood() {
    current = C.generate(state);
    const palette = C.palette(current, state.harmony);
    const hex = palette[0];

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
    [['hexValue', values.hex], ['rgbValue', values.rgb], ['hslValue', values.hsl]].forEach(([id, value]) => {
      const node = byId(id);
      if (node) node.textContent = value;
    });

    paintSwatches(palette);

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

  async function copyText(text, message) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      announce(message || 'Copied to clipboard');
      tick(660);
    } catch (error) {
      announce('Copy is unavailable in this browser.');
    }
  }

  function announce(message) {
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

  function setFocusMode(active) {
    const appContainer = $('.app-container');
    const button = byId('focusModeBtn');
    if (!appContainer) return;
    appContainer.classList.toggle('focus-mode', active);
    appContainer.classList.remove('hud-visible');
    document.body.classList.toggle('focus-locked', active);
    if (button) {
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? '\u2715 Exit focus view' : '\u26f6 Focus on color';
    }
    window.clearTimeout(hudHideTimer);
  }

  function toggleFocusMode() {
    const appContainer = $('.app-container');
    if (!appContainer) return;
    setFocusMode(!appContainer.classList.contains('focus-mode'));
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

    document.addEventListener('pointerdown', () => {
      const appContainer = $('.app-container');
      if (!appContainer || !appContainer.classList.contains('focus-mode')) return;
      appContainer.classList.add('hud-visible');
      window.clearTimeout(hudHideTimer);
      hudHideTimer = window.setTimeout(() => appContainer.classList.remove('hud-visible'), 3500);
    });

    on('focusModeBtn', 'click', toggleFocusMode);

    on('copyPaletteBtn', 'click', () => copyText(C.palette(current, state.harmony).join(', '), 'Four-color palette copied'));
    on('copyHexBtn', 'click', () => copyText(C.toHex(current), `${C.toHex(current)} copied`));
    on('upiCopyBtn', 'click', () => copyText('drsohilboi@ybl', 'UPI ID drsohilboi@ybl copied'));

    on('exportCssBtn', 'click', () => download('mood-mixer-palette.css', paletteCss(C.palette(current, state.harmony)), 'text/css'));
    on('exportJsonBtn', 'click', () => download('mood-mixer-palette.json', paletteJson(C.palette(current, state.harmony)), 'application/json'));
    on('exportTailwindBtn', 'click', () => download('mood-mixer.tailwind.js', paletteTailwind(C.palette(current, state.harmony)), 'text/javascript'));
    on('exportPngBtn', 'click', () => exportPng(C.palette(current, state.harmony)));

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

    on('saveMoodBtn', 'click', () => {
      const name = window.prompt('Name this mood:', `${currentVibe} Mood`);
      if (!name || !name.trim()) return;
      state.saved.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name.trim(),
        hex: C.toHex(current),
        vibe: currentVibe,
        values: snapshotValues(),
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
      announce('Mood saved');
      tick(760);
    });

    on('exportBtn', 'click', () => download('mood-mixer-backup.json', JSON.stringify({
      app: 'Mood Mixer',
      version: 2,
      exported: new Date().toISOString(),
      moods: state.saved
    }, null, 2), 'application/json'));

    on('importBtn', 'click', () => byId('importFileInput')?.click());

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
        const known = new Set(state.saved.map((item) => item.id));
        const clean = moods
          .filter((item) => item && typeof item === 'object' && typeof item.hex === 'string')
          .map((item) => ({
            id: typeof item.id === 'string' ? item.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: String(item.name || 'Imported mood').slice(0, 80),
            hex: item.hex.slice(0, 9),
            vibe: String(item.vibe || '').slice(0, 60),
            values: item.values && typeof item.values === 'object' ? item.values : {},
            settings: item.settings && typeof item.settings === 'object' ? item.settings : {}
          }))
          .filter((item) => !known.has(item.id));
        state.saved = clean.concat(state.saved).slice(0, MAX_SAVED);
        renderSaved();
        persistNow();
        announce(`${clean.length} mood${clean.length === 1 ? '' : 's'} imported`);
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
      }
    });
  }

  function init() {
    const fromHash = readHash();
    currentVibe = state.vibes.length ? state.vibes[0] : 'Moody';
    syncSettings();
    buildSliders();
    renderVibes();
    renderSaved();
    renderHistory();
    updateUndoButtons();
    bindEvents();
    particles.init();
    updateMood();
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
