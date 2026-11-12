<div align="center">

# Mood Mixer

**Find the color for right now.**

A private, offline-ready color playground. Move three sliders, get a coordinated four-color palette, copy hex values, check WCAG contrast, and export what you like. No account, no analytics, no network calls.

[Live demo](https://drsamonline.github.io/mood-mixer/) · [Open the mixer](https://drsamonline.github.io/mood-mixer/mixer/) · [Report a bug](https://github.com/drsamonline/mood-mixer/issues)

[![License: MIT](https://img.shields.io/badge/License-MIT-6158d9.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-6158d9.svg)](https://github.com/drsamonline/mood-mixer/releases)
[![PWA ready](https://img.shields.io/badge/PWA-installable-7ec8e3.svg)](manifest.json)
[![Offline](https://img.shields.io/badge/offline-works-2ea44f.svg)](service-worker.js)
[![No tracking](https://img.shields.io/badge/tracking-none-2ea44f.svg)](#privacy)
[![Vanilla JS](https://img.shields.io/badge/built%20with-HTML%20%7C%20CSS%20%7C%20JS-f7df1e.svg)](color-core.js)
[![GitHub Sponsors](https://img.shields.io/badge/sponsor-GitHub-ea4aaa.svg)](https://github.com/sponsors/drsamonline)
[![Stars](https://img.shields.io/github/stars/drsamonline/mood-mixer?style=social)](https://github.com/drsamonline/mood-mixer/stargazers)

</div>

---

## Sponsor

Mood Mixer is free, has no ads, and collects nothing. Sponsorship pays for hosting, icons and the time that goes into new palettes and harmony modes.

<div align="center">

[![Sponsor on GitHub](https://img.shields.io/badge/%E2%9D%A4%20Sponsor-GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/drsamonline)
[![Star the repo](https://img.shields.io/badge/%E2%AD%90%20Star-mood--mixer-6158d9?style=for-the-badge&logo=github&logoColor=white)](https://github.com/drsamonline/mood-mixer/stargazers)
[![Open an issue](https://img.shields.io/badge/%E2%9C%8E%20Ideas-open%20an%20issue-24232b?style=for-the-badge&logo=github&logoColor=white)](https://github.com/drsamonline/mood-mixer/issues)

</div>

| Tier | What it covers |
|---|---|
| **One-time** | A coffee, a colour, a thank you |
| **Monthly** | Hosting, icon work, a new harmony mode |
| **Sponsor logo** | Your name or logo in this README and on the landing page |

**Sponsors**

No sponsors yet. The first name listed here gets a link of their choice.

The same sponsor block appears on the [landing page](https://drsamonline.github.io/mood-mixer/#sponsor) and inside the mixer, so people who never open GitHub can still support the project.

---

## Screenshots

| Landing page | Live mixer |
|---|---|
| ![Mood Mixer landing page](screenshots/landing.png) | ![Mood Mixer live mixer](screenshots/mixer.png) |

| Neon theme, dark UI | Mobile |
|---|---|
| ![Neon theme](screenshots/mixer-neon.png) | ![Mixer on a phone](screenshots/mixer-mobile.png) |

All captures are real renders of this repository, taken at 1440×900, 1440×1000 and 390×844.

---

## What it does

- **Three sliders, one colour.** Energy, calmness and sparkle drive hue, saturation and lightness. Watch the whole palette move with them.
- **Six harmony schemes.** Tetrad, complement, analogous, triad, split complement, monochrome.
- **Three colour models.** HSL, RGB and HSV, plus normal, vibrant, pastel and mono blend modes.
- **WCAG contrast on every swatch.** Each palette colour shows its best text colour and the ratio that goes with it, graded AA or AAA.
- **Custom sliders.** Add sliders that drive hue, saturation or lightness, rename them, remove them.
- **Locks.** Freeze hue, saturation or lightness and move everything else.
- **Exports.** Copy hex, copy the palette, or download CSS variables, JSON, a Tailwind config or a 1200×630 PNG card.
- **Shareable links.** The full state lives in the URL hash, so a palette can be sent as a link.
- **Saved moods and history.** Save, rename, load and delete moods; a 12-entry palette history with restore. Import and export a JSON backup.
- **Undo and redo.** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, or the buttons.
- **Focus mode.** Hides everything but the colour. Escape exits.
- **Four UI themes, dark mode, high contrast.** Modern, minimalist, retro and neon, each with its own type and colour tokens.
- **Sound and particles.** Optional WebAudio ticks, and an ambient particle layer that follows the sparkle slider.
- **Works offline.** Installable PWA with a precached shell.
- **Keyboard.** `F` focus, `R` random, `S` save, `C` copy hex, `Esc` leave focus mode.

## Privacy

Everything stays in your browser. State lives in `localStorage` under `moodMixerState`. There are no cookies, no analytics, no fonts or scripts fetched from third parties, and no requests to any server after the page loads.

## Project pages

| Route | File |
|---|---|
| `/` | `index.html` — landing page with a working demo |
| `/mixer/` | `mixer/index.html` — the mixer |
| `/404.html` | Not-found page |

All paths are relative, so the project runs from a domain root or from a GitHub Pages project subpath without changes.

## Run locally

```bash
git clone https://github.com/drsamonline/mood-mixer.git
cd mood-mixer
npm start          # serves on http://localhost:4173
```

Any static server works. Opening `index.html` directly also works; only the service worker needs `http://` or `https://`.

## Deploy

- **GitHub Pages** — Settings → Pages → deploy from `main`, folder `/ (root)`. `.nojekyll` is already present.
- **Netlify / Vercel / Cloudflare Pages** — no build step, publish directory is the repository root.
- **Any static host** — upload the whole folder. Directory-style routes (`/mixer/`) work without rewrites.

## File structure

```text
.
├── index.html              # Landing page with the live demo card
├── landing.css             # Landing page styles
├── landing.js              # Live demo card logic
├── color-core.js           # Pure colour engine shared by both pages
├── mixer/
│   └── index.html          # The mixer
├── script.js               # Mixer state, exports, keyboard, a11y
├── theme.css               # Design tokens, dark mode, UI themes
├── style.css               # Mixer layout and components
├── manifest.json           # Installable app metadata and icons
├── service-worker.js       # Offline shell
├── icons/                  # 192, 512, maskable, apple-touch icons
├── screenshots/            # Real captures used in this README
├── 404.html                # Not-found page
├── robots.txt, sitemap.xml # Crawler hints
└── LICENSE                 # MIT
```

## Checks

```bash
npm run check     # JS, HTML and CSS lint
```

## License

MIT — see [LICENSE](LICENSE).

<div align="center">

Made for the colours you feel, not just the colours you see.

</div>
