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
[![Ko-fi](https://img.shields.io/badge/Ko--fi-matneo-ff5e5b.svg)](https://ko-fi.com/matneo)
[![UPI](https://img.shields.io/badge/UPI-drsohilboi%40ybl-2ea44f.svg)](#support)
[![Stars](https://img.shields.io/github/stars/drsamonline/mood-mixer?style=social)](https://github.com/drsamonline/mood-mixer/stargazers)

</div>

---

<!-- support:sweep -->
## Support

<img src="docs/assets/support-portrait.jpg" width="72" height="72" alt="Dr. Sohil Momin" align="left" style="border-radius:50%;margin-right:1rem">

Free, offline, accountless — and staying that way. If it earned its keep:

| | |
|---|---|
| UPI (India) | `drsohilboi@ybl` — payee Dr. Sohil Momin, open amount, or scan [the QR](docs/assets/upi-qr.svg) |
| GitHub Sponsors | [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) |
| Ko-fi | [ko-fi.com/matneo](https://ko-fi.com/matneo) |
| PayPal | [paypal.me/drsohilmomin](https://paypal.me/drsohilmomin?locale.x=en_GB&country.x=IN) |
| My books | [Amazon author store](https://www.amazon.com/stores/author/B08ZT331LY/allbooks?ccs_id=aed72b9f-71d9-41dc-adee-e9368a317acc) |
| More apps | [drsamonline.github.io](https://drsamonline.github.io/) |
| Email | [sohilmomin2000@gmail.com](mailto:sohilmomin2000@gmail.com) |

Nothing is gated behind it: no accounts, no tracking, no network requests.

<div align="center">

[![Sponsor on GitHub](https://img.shields.io/badge/%E2%9D%A4%20Sponsor-GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/drsamonline)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-matneo-ff5e5b?style=for-the-badge&logo=kofi&logoColor=white)](https://ko-fi.com/matneo)
[![PayPal](https://img.shields.io/badge/PayPal-drsohilmomin-00457c?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/drsohilmomin?locale.x=en_GB&country.x=IN)
[![Books](https://img.shields.io/badge/Books-Amazon%20author%20store-ff9900?style=for-the-badge&logo=amazon&logoColor=white)](https://www.amazon.com/stores/author/B08ZT331LY/allbooks?ccs_id=aed72b9f-71d9-41dc-adee-e9368a317acc)

</div>

The same block is on the [landing page](https://drsamonline.github.io/mood-mixer/#support) and in the mixer's footer bar, with the UPI ID copyable and the QR scannable, so nobody has to open GitHub to support the work.

---

## Screenshots

| Landing page | Live mixer |
|---|---|
| ![Mood Mixer landing page](screenshots/landing.png) | ![Mood Mixer live mixer](screenshots/mixer.png) |

| Neon theme, dark UI | Mobile |
|---|---|
| ![Neon theme](screenshots/mixer-neon.png) | ![Mixer on a phone](screenshots/mixer-mobile.png) |

![Support block: UPI ID, QR, Ko-fi, PayPal and books](screenshots/support.png)

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
- **Focus mode.** One tap on the screen and the whole display becomes the colour — header, card, swatches, controls, support bar and footer all go. Tap anywhere to bring the interface back for a few seconds, or press Escape to leave.
- **Randomise from the header.** One button in the header, or `R`, reshuffles every slider; undo puts it back.
- **Four UI themes, dark mode, high contrast.** Modern, minimalist, retro and neon, each with its own type and colour tokens.
- **Sound and particles.** Optional WebAudio ticks, and an ambient particle layer that follows the sparkle slider.
- **Works offline.** Installable PWA with a precached shell.
- **Keyboard.** `F` focus, `R` random, `S` save, `C` copy hex, `Esc` leave focus mode, `Ctrl/Cmd+Z` undo.

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
├── docs/assets/            # Support portrait and UPI QR
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
