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
    describe,
    HARMONIES
  };
})(window);
