/* Landing page: the hero card is a real, working mini mixer. */
(function () {
  'use strict';

  const C = window.MoodColor;
  const byId = (id) => document.getElementById(id);
  const card = byId('heroCard');
  if (!card || !C) return;

  const vibeForHue = (hue) => C.vibeForHue(hue);
  const values = { energy: 50, calmness: 50, sparkle: 50 };
  const inputs = Array.from(card.querySelectorAll('input[type="range"]'));
  const chips = Array.from(card.querySelectorAll('.palette-chip'));
  const orb = byId('heroOrb');
  const nameNode = byId('heroVibe');
  const hexNode = byId('heroHex');
  const rgbNode = byId('heroRgb');
  const copyBtn = byId('heroCopy');

  function render() {
    const color = C.generate({ values, model: 'hsl', blend: 'normal', custom: [] });
    const palette = C.palette(color, 'tetrad');
    const info = C.describe(color);
    const vibe = vibeForHue(color.h);

    if (orb) {
      const glow = C.toHex(C.hslToRgb(color.h, Math.min(100, color.s + 18), Math.min(92, color.l + 16)));
      const shade = C.toHex(C.hslToRgb(color.h, color.s, Math.max(12, color.l - 22)));
      orb.style.background = `radial-gradient(circle at 32% 28%, ${glow}, ${info.hex} 58%, ${shade})`;
    }
    if (nameNode) nameNode.textContent = vibe;
    if (hexNode) hexNode.textContent = info.hex;
    if (rgbNode) rgbNode.textContent = info.rgb;
    chips.forEach((chip, index) => {
      chip.style.backgroundColor = palette[index];
    });
    card.dataset.hex = info.hex;
    card.style.setProperty('--hero-tint', info.hex);
  }

  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      values[input.dataset.mood] = Number(input.value);
      render();
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const hex = card.dataset.hex || '#7ec8e3';
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(hex);
        copyBtn.textContent = `${hex} copied`;
      } catch (error) {
        copyBtn.textContent = hex;
      }
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy hex';
      }, 2000);
    });
  }

  render();
})();
