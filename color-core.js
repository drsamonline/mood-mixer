/* Mood Mixer color engine. Pure functions, no DOM. Shared by the landing page and the mixer. */
(function (global) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wrapHue = (hue) => ((hue % 360) + 360) % 360;

  function hslToRgb(h, s, l) {
    h = wrapHue(h);
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - chroma / 2;
    let channels;
    if (h < 60) channels = [chroma, x, 0];
    else if (h < 120) channels = [x, chroma, 0];
    else if (h < 180) channels = [0, chroma, x];
    else if (h < 240) channels = [0, x, chroma];
    else if (h < 300) channels = [x, 0, chroma];
    else channels = [chroma, 0, x];
    return {
      r: Math.round((channels[0] + m) * 255),
      g: Math.round((channels[1] + m) * 255),
      b: Math.round((channels[2] + m) * 255)
    };
  }

  function rgbToHsl(r, g, b) {
    r = clamp(r, 0, 255) / 255;
    g = clamp(g, 0, 255) / 255;
    b = clamp(b, 0, 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;
    let hue = 0;
    let saturation = 0;
    if (delta) {
      saturation = delta / (1 - Math.abs(2 * lightness - 1) || 1);
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
    }
    return {
      h: Math.round(wrapHue(hue)),
      s: Math.round(clamp(saturation * 100, 0, 100)),
      l: Math.round(clamp(lightness * 100, 0, 100))
    };
  }

  function hsvToRgb(h, s, v) {
    h = wrapHue(h);
    s = clamp(s, 0, 100) / 100;
    v = clamp(v, 0, 100) / 100;
    const chroma = v * s;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - chroma;
    let channels;
    if (h < 60) channels = [chroma, x, 0];
    else if (h < 120) channels = [x, chroma, 0];
    else if (h < 180) channels = [0, chroma, x];
    else if (h < 240) channels = [0, x, chroma];
    else if (h < 300) channels = [x, 0, chroma];
    else channels = [chroma, 0, x];
    return {
      r: Math.round((channels[0] + m) * 255),
      g: Math.round((channels[1] + m) * 255),
      b: Math.round((channels[2] + m) * 255)
    };
  }

  function toHex(color) {
    return '#' + [color.r, color.g, color.b]
      .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
      .join('');
  }

  function hexToRgb(hex) {
    let value = String(hex || '').trim().replace('#', '');
    if (value.length === 3) value = value.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function channelLuminance(channel) {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(color) {
    return 0.2126 * channelLuminance(color.r) +
      0.7152 * channelLuminance(color.g) +
      0.0722 * channelLuminance(color.b);
  }

  function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const light = Math.max(la, lb);
    const dark = Math.min(la, lb);
    return (light + 0.05) / (dark + 0.05);
  }

  function bestInk(color) {
    const white = contrastRatio(color, { r: 255, g: 255, b: 255 });
    const black = contrastRatio(color, { r: 17, g: 17, b: 17 });
    return black >= white ?
      { ink: '#111111', ratio: black, on: 'black' } :
      { ink: '#ffffff', ratio: white, on: 'white' };
  }

  function grade(ratio) {
    if (ratio >= 7) return { level: 'AAA', pass: true };
    if (ratio >= 4.5) return { level: 'AA', pass: true };
    if (ratio >= 3) return { level: 'AA Large', pass: true };
    return { level: 'Fail', pass: false };
  }

  const VIBE_BANDS = [
    [30, 'Warm'], [60, 'Golden'], [90, 'Sunny'], [150, 'Fresh'],
    [190, 'Crisp'], [230, 'Serene'], [265, 'Calm'], [300, 'Dreamy'],
    [330, 'Playful'], [360, 'Moody']
  ];

  function vibeForHue(hue) {
    const band = VIBE_BANDS.find(([limit]) => wrapHue(hue) < limit);
    return band ? band[1] : 'Moody';
  }

  const HARMONIES = {
    tetrad: [[90, -8, 8], [180, 0, -8], [270, -8, -8]],
    complement: [[180, -8, -8], [180, -20, 14], [0, -45, 18]],
    analogous: [[-30, 0, -6], [30, 0, 6], [60, -12, 14]],
    triad: [[120, -6, 0], [240, -6, 0], [0, -40, 16]],
    split: [[150, -6, 0], [210, -6, 0], [0, -45, 16]],
    mono: [[0, -20, 10], [0, -35, -12], [0, -55, 20]]
  };

  function palette(color, harmony) {
    const steps = HARMONIES[harmony] || HARMONIES.tetrad;
    const base = toHex(color);
    const rest = steps.map(([dh, ds, dl]) => toHex(hslToRgb(
      color.h + dh,
      clamp(color.s + ds, 0, 100),
      clamp(color.l + dl, 0, 100)
    )));
    return [base].concat(rest);
  }

  /* Locks read the live color so a lock freezes what is on screen, not the formula. */
  function applyLocks(target, locks, lockedValues) {
    const out = Object.assign({}, target);
    if (locks && locks.hue && lockedValues && lockedValues.hue !== null) out.h = lockedValues.hue;
    if (locks && locks.sat && lockedValues && lockedValues.sat !== null) out.s = lockedValues.sat;
    if (locks && locks.lit && lockedValues && lockedValues.lit !== null) out.l = lockedValues.lit;
    return out;
  }

  /* state: { values, custom:[{id,target}], model, blend, harmony } -> {r,g,b,h,s,l} */
  function generate(state) {
    const values = state.values || {};
    const custom = Array.isArray(state.custom) ? state.custom : [];
    const energy = Number(values.energy ?? 50);
    const calm = Number(values.calmness ?? 50);
    const sparkle = Number(values.sparkle ?? 50);

    let hue = energy * 3.6 + sparkle * 0.5;
    let saturation = 40 + sparkle * 0.6;
    let lightness = 20 + calm * 0.7;

    custom.forEach((slider) => {
      const offset = Number(values[slider.id] ?? 50) - 50;
      const target = slider.target || 'hue';
      if (target === 'hue') hue += offset * 1.2;
      else if (target === 'sat') saturation += offset * 0.35;
      else lightness += offset * 0.35;
    });

    if (state.blend === 'vibrant') {
      saturation += 20;
      lightness += 5;
    } else if (state.blend === 'pastel') {
      saturation -= 25;
      lightness += 15;
    } else if (state.blend === 'mono') {
      saturation -= 50;
    }

    let hsl = {
      h: wrapHue(hue),
      s: clamp(saturation, 0, 100),
      l: clamp(lightness, 0, 100)
    };

    if (state.model === 'rgb') {
      hsl = rgbToHsl(
        Math.round(energy * 2.55),
        Math.round(calm * 2.55),
        Math.round(sparkle * 2.55)
      );
      custom.forEach((slider) => {
        const offset = Number(values[slider.id] ?? 50) - 50;
        const target = slider.target || 'hue';
        if (target === 'hue') hsl.h = wrapHue(hsl.h + offset * 1.2);
        else if (target === 'sat') hsl.s = clamp(hsl.s + offset * 0.35, 0, 100);
        else hsl.l = clamp(hsl.l + offset * 0.35, 0, 100);
      });
    } else if (state.model === 'hsv') {
      const rgb = hsvToRgb(hsl.h, hsl.s, clamp(40 + calm * 0.6, 0, 100));
      hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    }

    hsl = applyLocks(hsl, state.locks, state.lockedValues);
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return {
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      h: Math.round(wrapHue(hsl.h)),
      s: Math.round(clamp(hsl.s, 0, 100)),
      l: Math.round(clamp(hsl.l, 0, 100))
    };
  }

  /* Readable combinations inside one palette: text on a background, graded. */
  function pairs(palette) {
    if (!Array.isArray(palette) || palette.length < 2) return [];
    const rgb = palette.map((hex) => hexToRgb(hex)).filter(Boolean);
    if (rgb.length < 2) return [];
    const out = [];
    const base = rgb[0];
    const inkOnBase = bestInk(base);
    out.push({
      bg: palette[0],
      fg: inkOnBase.ink,
      ratio: inkOnBase.ratio,
      level: grade(inkOnBase.ratio).level,
      pass: grade(inkOnBase.ratio).pass
    });
    const others = rgb.slice(1).map((color, index) => ({
      hex: palette[index + 1],
      ratio: contrastRatio(base, color)
    })).sort((a, b) => b.ratio - a.ratio);
    if (others.length) {
      out.push({
        bg: palette[0],
        fg: others[0].hex,
        ratio: others[0].ratio,
        level: grade(others[0].ratio).level,
        pass: grade(others[0].ratio).pass
      });
      const second = rgb[1];
      const inkOnSecond = bestInk(second);
      out.push({
        bg: palette[1],
        fg: inkOnSecond.ink,
        ratio: inkOnSecond.ratio,
        level: grade(inkOnSecond.ratio).level,
        pass: grade(inkOnSecond.ratio).pass
      });
    }
    return out;
  }

  /* Colour-vision simulation: the usual Viénot/Brettel sRGB matrices. */
  const CVD_MATRICES = {
    deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
    protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
    tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]]
  };

  function simulate(color, type) {
    const m = CVD_MATRICES[type];
    if (!m) return toHex(color);
    const channel = (row) => clamp(Math.round(row[0] * color.r + row[1] * color.g + row[2] * color.b), 0, 255);
    return toHex({ r: channel(m[0]), g: channel(m[1]), b: channel(m[2]) });
  }

  /* Dominant colours from a pixel sample, quantised to a 4-bit grid. */
  function dominant(pixels, count) {
    const buckets = new Map();
    pixels.forEach((pixel) => {
      if (pixel.a !== undefined && pixel.a < 128) return;
      const key = `${pixel.r >> 4}-${pixel.g >> 4}-${pixel.b >> 4}`;
      const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
      entry.r += pixel.r;
      entry.g += pixel.g;
      entry.b += pixel.b;
      entry.n += 1;
      buckets.set(key, entry);
    });
    const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n);
    const picked = [];
    sorted.forEach((entry) => {
      if (picked.length >= (count || 5)) return;
      const color = { r: Math.round(entry.r / entry.n), g: Math.round(entry.g / entry.n), b: Math.round(entry.b / entry.n) };
      const tooClose = picked.some((other) => {
        const d = Math.abs(other.r - color.r) + Math.abs(other.g - color.g) + Math.abs(other.b - color.b);
        return d < 60;
      });
      if (!tooClose) picked.push(color);
    });
    return picked.map((color) => toHex(color));
  }

  /* CSS named colours, for the nearest-name lookup. */
  const NAMED = [
    ['black', '#000000'], ['navy', '#000080'], ['darkblue', '#00008b'], ['mediumblue', '#0000cd'],
    ['blue', '#0000ff'], ['darkgreen', '#006400'], ['green', '#008000'], ['teal', '#008080'],
    ['darkcyan', '#008b8b'], ['deepskyblue', '#00bfff'], ['darkturquoise', '#00ced1'],
    ['mediumspringgreen', '#00fa9a'], ['lime', '#00ff00'], ['springgreen', '#00ff7f'],
    ['cyan', '#00ffff'], ['aqua', '#00ffff'], ['midnightblue', '#191970'], ['dodgerblue', '#1e90ff'],
    ['lightseagreen', '#20b2aa'], ['forestgreen', '#228b22'], ['seagreen', '#2e8b57'],
    ['darkslategray', '#2f4f4f'], ['limegreen', '#32cd32'], ['mediumseagreen', '#3cb371'],
    ['turquoise', '#40e0d0'], ['royalblue', '#4169e1'], ['steelblue', '#4682b4'],
    ['darkslateblue', '#483d8b'], ['mediumturquoise', '#48d1cc'], ['indigo', '#4b0082'],
    ['darkolivegreen', '#556b2f'], ['cadetblue', '#5f9ea0'], ['cornflowerblue', '#6495ed'],
    ['mediumaquamarine', '#66cdaa'], ['dimgray', '#696969'], ['slateblue', '#6a5acd'],
    ['olivedrab', '#6b8e23'], ['slategray', '#708090'], ['mediumslateblue', '#7b68ee'],
    ['lawngreen', '#7cfc00'], ['chartreuse', '#7fff00'], ['aquamarine', '#7fffd4'],
    ['maroon', '#800000'], ['purple', '#800080'], ['olive', '#808000'], ['gray', '#808080'],
    ['skyblue', '#87ceeb'], ['lightskyblue', '#87cefa'], ['blueviolet', '#8a2be2'],
    ['darkred', '#8b0000'], ['darkmagenta', '#8b008b'], ['saddlebrown', '#8b4513'],
    ['darkseagreen', '#8fbc8f'], ['lightgreen', '#90ee90'], ['mediumpurple', '#9370db'],
    ['darkviolet', '#9400d3'], ['palegreen', '#98fb98'], ['darkorchid', '#9932cc'],
    ['yellowgreen', '#9acd32'], ['sienna', '#a0522d'], ['brown', '#a52a2a'],
    ['darkgray', '#a9a9a9'], ['lightblue', '#add8e6'], ['greenyellow', '#adff2f'],
    ['paleturquoise', '#afeeee'], ['lightsteelblue', '#b0c4de'], ['powderblue', '#b0e0e6'],
    ['firebrick', '#b22222'], ['darkgoldenrod', '#b8860b'], ['mediumorchid', '#ba55d3'],
    ['rosybrown', '#bc8f8f'], ['darkkhaki', '#bdb76b'], ['silver', '#c0c0c0'],
    ['mediumvioletred', '#c71585'], ['indianred', '#cd5c5c'], ['peru', '#cd853f'],
    ['chocolate', '#d2691e'], ['tan', '#d2b48c'], ['lightgray', '#d3d3d3'],
    ['thistle', '#d8bfd8'], ['orchid', '#da70d6'], ['goldenrod', '#daa520'],
    ['palevioletred', '#db7093'], ['crimson', '#dc143c'], ['gainsboro', '#dcdcdc'],
    ['plum', '#dda0dd'], ['burlywood', '#deb887'], ['lightcyan', '#e0ffff'],
    ['lavender', '#e6e6fa'], ['darksalmon', '#e9967a'], ['violet', '#ee82ee'],
    ['palegoldenrod', '#eee8aa'], ['lightcoral', '#f08080'], ['khaki', '#f0e68c'],
    ['aliceblue', '#f0f8ff'], ['honeydew', '#f0fff0'], ['azure', '#f0ffff'],
    ['wheat', '#f5deb3'], ['beige', '#f5f5dc'], ['whitesmoke', '#f5f5f5'],
    ['mintcream', '#f5fffa'], ['ghostwhite', '#f8f8ff'], ['salmon', '#fa8072'],
    ['sandybrown', '#f4a460'], ['antiquewhite', '#faebd7'], ['linen', '#faf0e6'],
    ['lightgoldenrodyellow', '#fafad2'], ['oldlace', '#fdf5e6'], ['red', '#ff0000'],
    ['magenta', '#ff00ff'], ['fuchsia', '#ff00ff'], ['deeppink', '#ff1493'],
    ['orangered', '#ff4500'], ['tomato', '#ff6347'], ['hotpink', '#ff69b4'],
    ['coral', '#ff7f50'], ['darkorange', '#ff8c00'], ['lightsalmon', '#ffa07a'],
    ['orange', '#ffa500'], ['lightpink', '#ffb6c1'], ['pink', '#ffc0cb'],
    ['gold', '#ffd700'], ['peachpuff', '#ffdab9'], ['navajowhite', '#ffdead'],
    ['moccasin', '#ffe4b5'], ['bisque', '#ffe4c4'], ['mistyrose', '#ffe4e1'],
    ['blanchedalmond', '#ffebcd'], ['papayawhip', '#ffefd5'], ['lavenderblush', '#fff0f5'],
    ['seashell', '#fff5ee'], ['cornsilk', '#fff8dc'], ['lemonchiffon', '#fffacd'],
    ['floralwhite', '#fffaf0'], ['snow', '#fffafa'], ['yellow', '#ffff00'],
    ['lightyellow', '#ffffe0'], ['ivory', '#fffff0'], ['white', '#ffffff']
  ].map(([name, hex]) => ({ name, rgb: hexToRgb(hex) }));

  /* Nearest CSS colour name, weighted towards human perception of green. */
  function nameOf(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    let best = null;
    let bestDistance = Infinity;
    NAMED.forEach((entry) => {
      const dr = rgb.r - entry.rgb.r;
      const dg = rgb.g - entry.rgb.g;
      const db = rgb.b - entry.rgb.b;
      const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = entry.name;
      }
    });
    return best ? { name: best, distance: Math.sqrt(bestDistance) } : null;
  }

  /* Pinned palette links: four hexes in one token, e.g. q=7ec8e3-4a90d9-1f2c3d-ffffff */
  function pinnedToken(palette) {
    return (palette || [])
      .map((hex) => String(hex).replace('#', '').toLowerCase())
      .filter((hex) => /^[0-9a-f]{6}$/.test(hex))
      .slice(0, 4)
      .join('-');
  }

  function parsePinned(token) {
    const parts = String(token || '').split('-').filter((part) => /^[0-9a-f]{6}$/i.test(part));
    if (parts.length < 2) return null;
    return parts.slice(0, 4).map((part) => '#' + part.toLowerCase());
  }

  /* Compact state token: #p=xxxxxx carries the whole palette in six characters. */
  const MODEL_KEYS = ['hsl', 'rgb', 'hsv'];
  const BLEND_KEYS = ['normal', 'vibrant', 'pastel', 'mono'];
  const HARMONY_KEYS = ['tetrad', 'complement', 'analogous', 'triad', 'split', 'mono'];

  function encodeToken(state) {
    const values = state.values || {};
    const e = Math.round(clamp(Number(values.energy ?? 50), 0, 100));
    const c = Math.round(clamp(Number(values.calmness ?? 50), 0, 100));
    const sp = Math.round(clamp(Number(values.sparkle ?? 50), 0, 100));
    const model = Math.max(0, MODEL_KEYS.indexOf(state.model));
    const blend = Math.max(0, BLEND_KEYS.indexOf(state.blend));
    const harmony = Math.max(0, HARMONY_KEYS.indexOf(state.harmony));
    const bg = state.background === 'gradient' ? 1 : 0;
    let n = e;
    n = n * 101 + c;
    n = n * 101 + sp;
    n = n * 3 + model;
    n = n * 4 + blend;
    n = n * 6 + harmony;
    n = n * 2 + bg;
    return n.toString(36);
  }

  function decodeToken(token) {
    const n = parseInt(String(token || ''), 36);
    if (!Number.isFinite(n) || n < 0) return null;
    let rest = n;
    const bg = rest % 2;
    rest = Math.floor(rest / 2);
    const harmony = rest % 6;
    rest = Math.floor(rest / 6);
    const blend = rest % 4;
    rest = Math.floor(rest / 4);
    const model = rest % 3;
    rest = Math.floor(rest / 3);
    const sparkle = rest % 101;
    rest = Math.floor(rest / 101);
    const calmness = rest % 101;
    rest = Math.floor(rest / 101);
    const energy = rest % 101;
    if (![energy, calmness, sparkle].every((v) => v >= 0 && v <= 100)) return null;
    return {
      values: { energy, calmness, sparkle },
      model: MODEL_KEYS[model] || 'hsl',
      blend: BLEND_KEYS[blend] || 'normal',
      harmony: HARMONY_KEYS[harmony] || 'tetrad',
      background: bg ? 'gradient' : 'solid'
    };
  }

  function describe(color) {
    const hex = toHex(color);
    return {
      hex,
      rgb: `${color.r}, ${color.g}, ${color.b}`,
      hsl: `${color.h}\u00b0, ${color.s}%, ${color.l}%`
    };
  }

  global.MoodColor = {
    clamp,
    wrapHue,
    hslToRgb,
    rgbToHsl,
    hsvToRgb,
    toHex,
    hexToRgb,
    contrastRatio,
    bestInk,
    grade,
    palette,
    pairs,
    generate,
    vibeForHue,
    encodeToken,
    decodeToken,
    pinnedToken,
    parsePinned,
    simulate,
    dominant,
    nameOf,
    describe,
    HARMONIES
  };
})(window);
