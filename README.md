# Atheric — liquid chrome edition

Source for [atheric.eu](https://atheric.eu) — a small studio for digital
work, based in Helsinki.

This repository is published for transparency and inspection, not for
redistribution. You may read it. You may not copy, modify, or republish
it. For commission and licensing inquiries: **contact@atheric.eu**

See [LICENSE](./LICENSE) for the full terms.

## What's in here

A single static-deploy site with no external runtime dependencies.

- A WebGL chrome blob in the hero — raymarched metaballs with chrome
  material, fresnel, environment lighting, scroll-driven dispersion,
  and a cinematic launch animation that drives navigation between
  pages.
- An *inspect mode* that teaches how the blob is built. The camera
  flies to surface points and annotations explain raymarching, smin,
  fresnel, environment lighting, and motion — with code excerpts in
  a stylised macOS window.
- A world hub band — Helsinki, London, New York, Tokyo — with live
  per-timezone clocks and simulated weather drifting through state
  machines, plus a slow-rolling ticker of coordinates and studio
  fragments.
- A page-transition system using the History API. Routes: `/`,
  `/library`, `/author`. Hover-anticipation on nav links. The chrome
  blob compresses, lifts off-frame, and arrives in the new mode as
  a tiny two-sphere mark next to the page header.
- A preferences sheet (slide-out panel) with motion, sound, and
  inspect-marker visibility toggles, persisted to localStorage.

## Stack

Vite, vanilla JavaScript modules, hand-written CSS, custom GLSL
shaders. No framework. No UI library. No third-party animation
runtime.

## Local development

```bash
npm install
npm run dev
```

Then open the URL Vite prints. To produce a static build:

```bash
npm run build
```

Output lands in `dist/`.

## Structure

```
src/
├── main.js                 ← boot sequence
├── css/styles.css          ← all styling
└── js/
    ├── chrome-blob.js      ← WebGL shader + camera + render loop
    ├── inspect.js          ← inspect-mode lab
    ├── interactions.js     ← cursor, magnetic, tilt
    ├── world-hub.js        ← clocks, weather sim, ticker
    ├── page-transitions.js ← router + launch animator
    ├── preferences.js      ← settings sheet
    ├── loader.js           ← waiting-room loader
    ├── split-text.js       ← per-char wrapping for animations
    ├── reveal.js           ← intersection-observer reveal
    ├── scroll-progress.js  ← top-of-page progress bar
    ├── clocks.js           ← Helsinki nav clock
    ├── audio.js            ← sound toggle (mirrored in preferences)
    ├── cabinet-filter.js   ← cabinet category filter
    └── smooth-anchor.js    ← in-page anchor smooth-scroll
```

— Atheric · MMXXVI
