// main.js — the blob lifecycle. Mounts the (locked) chrome blob and runs its hero-only
// departure: as the user scrolls past the hero the blob LEAVES — fades out, then idles its
// render loop to recover the always-on GPU cost (the 72-step raymarch) — and the warm key it
// cast on the world is handed to the annealing light below (#horizon-layer). Scrolling back to
// the hero restores everything cleanly.
//
// This is the one mechanism docs/DESIGN.md says to preserve. It is intentionally minimal: ONE
// IntersectionObserver on the hero, no rAF. The seam/inversion substrate it used to sit beside
// is gone (the post-hero world is now the cooled broadsheet, not a dark→cream inversion).

import { BlobAdapter } from './blob.js?v=12';

// The blob is a page-level layer behind the hero (#blob-layer), so it holds position while the
// hero is on screen and is the only place the liquid object ever lives.
const blobMount = document.querySelector('[data-blob-anchor]');
const blob = new BlobAdapter();
if (blobMount) blob.mount(blobMount);

// ── THE CHROME SETS (hero-only lifecycle + the dissolve) ─────────────────────────────────
// The blob does not pop out — it dissolves into black. main.js publishes one number, --set:
//   0  while the hero HEADLINE is on screen          → the blob reads at full strength
//   1  ~half a viewport after the headline has left  → the blob is fully painted over (black)
// base.css turns --set into the black set-veil's opacity (a sheet IN FRONT of the blob) and the
// annealing light's fade-in, so the chrome dissolves gradually and completely as the reader
// scrolls into the body — never an abrupt cut, and the blob is fully gone by ~20% down the page.
//
// We anchor on the headline (not the hero box, which extends ~1 viewport below its content) so the
// dissolve is content-relative: independent of viewport height and hero box height. Once the blob
// is fully covered we idle its render loop to recover the always-on GPU cost; we resume it the
// moment the veil starts to lift on scroll-up. One passive scroll listener, rAF-throttled.
const hero = document.getElementById('dark');
const anchor = hero?.querySelector('h1') || hero; // the hero headline carries the blob
if (hero && blobMount && anchor) {
  const root = document.documentElement;
  const reduceMo = window.matchMedia('(prefers-reduced-motion: reduce)');
  const START = 0.12; // begin the dissolve once the headline's lower edge passes 12% of the vh
  const RAMP = 0.4; // ...and complete it over the next ~0.4 viewport of scroll (≈ 20% down the page)
  const smooth = (x) => x * x * (3 - 2 * x); // smoothstep — gentle in/out
  let active = true; // is the blob's render loop running?
  let pauseTimer = 0;
  let raf = 0;

  const update = () => {
    raf = 0;
    // The craft study (craft.js) locks scroll at the top, so --set is 0 throughout; this guard
    // only covers stray updates racing the mode's entry — the blob may never depart mid-zoom.
    if (document.body.classList.contains('craft-active')) {
      root.style.setProperty('--set', '0');
      if (!active) { active = true; clearTimeout(pauseTimer); blob.setActive(true); }
      return;
    }
    const vh = window.innerHeight || 1;
    const bottom = anchor.getBoundingClientRect().bottom; // headline's lower edge, viewport coords
    let set;
    if (reduceMo.matches) {
      set = bottom < START * vh ? 1 : 0; // hard cut, no scroll-coupled ramp
    } else {
      const lin = Math.min(1, Math.max(0, (START * vh - bottom) / (RAMP * vh)));
      set = smooth(lin);
    }
    const covered = set >= 0.999;

    // THE RESTORE GATE (order matters). Resume the loop BEFORE lowering --set, so the blob has
    // laid down one clean frame (setActive(true) draws synchronously — chrome-blob.js) by the
    // time the veil lifts to reveal it. Same task ⇒ the fresh frame and the new veil opacity
    // composite together; the veil never uncovers a stale/blank buffer (the ~50% scroll-up
    // flicker, worst under RM where --set un-covers in one hard cut).
    if (!covered && !active) {
      active = true;
      clearTimeout(pauseTimer);
      blob.setActive(true); // resume + clean frame FIRST …
    }
    root.style.setProperty('--set', set.toFixed(3)); // … then fade in

    // Idle the render loop once the veil fully hides the blob.
    if (covered && active) {
      active = false;
      clearTimeout(pauseTimer);
      // Small delay so brief scrubbing across the boundary doesn't thrash the GL loop.
      pauseTimer = setTimeout(() => blob.setActive(false), reduceMo.matches ? 0 : 140);
    }
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update(); // set the initial state (blob present at the top)
}
