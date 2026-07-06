// craft.js — "see how the chrome is made": the blob-zoom craft reveal.
//
// PROVENANCE: imported from v1 (atheric-studios/home → liquid-chrome-v2/src/js/inspect.js,
// the "[ inspect chrome ]" lab) and rebuilt in v2's grammar. The mechanics are v1's, proven:
//   - the zoom is a real 3D camera flight — the raymarch shader exposes uCamPos/uCamLook/
//     uCamFOV, and the render loop lerps cameraState.current → .target each frame. This
//     module only WRITES TARGETS. The shader, SDF and material are untouched (LOCKED).
//   - each explain-dot has a fixed world-space anchor + its own camera; a rAF loop projects
//     the anchors through the LIVE camera (the shader's camera math inverted in JS) so the
//     dots ride the surface even mid-flight.
//   - a panel only reveals once the camera has PHYSICALLY landed (arrival poller on
//     camDistance), so the reading always follows the settling, never fights it.
//
// v2 ENHANCEMENTS over v1:
//   - the shell is a native <dialog> (focus trap, Esc, aria-modal, focus restore — platform,
//     not hand-rolled) with all copy static in index.html (readable without JS/motion).
//   - an ambient orbital drift slowly circles the stage camera while nothing is selected —
//     the studied object keeps breathing; flights arrive in an arc rather than a straight dolly.
//   - dots + tab set on staggered at the site cadence (0.09s) only AFTER the camera settles.
//   - reduced motion: every camera write also snaps `current` (instant composed state); the
//     recede/reveal transitions are killed in CSS; all content stays reachable.
//   - world anchors/cams rescaled for v2's 1.3x SDF (chrome-blob.js scene() scale).
//
// Coexistence with the blob departure (main.js): entering snaps to top and locks scroll
// (body.craft-active), so --set stays 0 and the render loop never idles mid-zoom; main.js
// additionally guards against departing while the mode is open. Exit restores the resting
// hero camera and unlocks scroll.

// same versioned specifier as blob.js — one URL, one module instance, one cameraState.
import { cameraState, HOME_CAM, BLOB_SPEED } from './chrome-blob.js?v=11';

// ---------------------------------------------------------------------------
// the five figures — world anchor + camera per figure. The copy/code panels are
// static HTML (index.html, #craft-p1..5); this table only drives the lens.
// Coordinates are v1's, scaled for v2's 1.3x SDF and pulled slightly further
// back so a drifting satellite can't engulf the lens.
// ---------------------------------------------------------------------------
const STAGE = { pos: [0.85, 0.42, -2.95], look: [0, 0.05, 0], fov: 1.64 };

const FIGURES = [
  { // fig. 01 — the raymarch
    worldPos: [0.59, 0.72, -0.33],
    cam: { pos: [1.08, 1.41, -2.59], look: [0.13, 0.26, 0], fov: 1.82 },
  },
  { // fig. 02 — metaballs · smin
    worldPos: [-0.46, -0.07, 0.0],
    cam: { pos: [-2.21, 0.23, -2.37], look: [-0.33, 0.0, 0], fov: 1.85 },
  },
  { // fig. 03 — thin-film iridescence
    worldPos: [-1.01, 0.07, -0.07],
    cam: { pos: [-2.9, 0.07, -1.52], look: [-0.72, 0.07, 0], fov: 1.88 },
  },
  { // fig. 04 — the fresnel bloom
    worldPos: [0.07, 1.11, -0.46],
    cam: { pos: [0.39, 2.2, -2.44], look: [0.07, 0.55, 0], fov: 1.8 },
  },
  { // fig. 05 — motion · the orbits
    worldPos: [0.78, -0.59, 0.0],
    cam: { pos: [2.25, -0.8, -2.25], look: [0.65, -0.39, 0], fov: 1.82 },
  },
];

// ---------------------------------------------------------------------------
// projection — the shader's camera math inverted in JS (v1's, verbatim) so DOM
// dots can sit over the right surface point each frame, even mid-flight.
// shader: rd = normalize(forward * fov + right * uv.x + up * uv.y)
// ---------------------------------------------------------------------------
function projectToScreen(world, camPos, camLook, fov, viewW, viewH) {
  const fx = camLook[0] - camPos[0];
  const fy = camLook[1] - camPos[1];
  const fz = camLook[2] - camPos[2];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  const fwd = [fx / fLen, fy / fLen, fz / fLen];
  const worldUp = Math.abs(fwd[1]) > 0.97 ? [0, 0, 1] : [0, 1, 0];
  // mirror the shader's basis exactly: right = up × forward, camUp = forward × right
  let rx = worldUp[1] * fwd[2] - worldUp[2] * fwd[1];
  let ry = worldUp[2] * fwd[0] - worldUp[0] * fwd[2];
  let rz = worldUp[0] * fwd[1] - worldUp[1] * fwd[0];
  const rLen = Math.hypot(rx, ry, rz) || 1;
  rx /= rLen; ry /= rLen; rz /= rLen;
  const ux = fwd[1] * rz - fwd[2] * ry;
  const uy = fwd[2] * rx - fwd[0] * rz;
  const uz = fwd[0] * ry - fwd[1] * rx;
  const dx = world[0] - camPos[0];
  const dy = world[1] - camPos[1];
  const dz = world[2] - camPos[2];
  const fc = dx * fwd[0] + dy * fwd[1] + dz * fwd[2];
  if (fc <= 0.001) return null;
  const rc = dx * rx + dy * ry + dz * rz;
  const uc = dx * ux + dy * uy + dz * uz;
  const uvX = (rc / fc) * fov;
  const uvY = (uc / fc) * fov;
  const minDim = Math.min(viewW, viewH);
  return {
    x: uvX * minDim / 2 + viewW / 2,
    y: -uvY * minDim / 2 + viewH / 2,
  };
}

function camDistance(a, b) {
  return Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]) +
         Math.hypot(a.look[0] - b.look[0], a.look[1] - b.look[1], a.look[2] - b.look[2]) * 0.5 +
         Math.abs(a.fov - b.fov) * 0.5;
}

// ---------------------------------------------------------------------------
// state + DOM
// ---------------------------------------------------------------------------
const dialog = document.getElementById('craft');
const trigger = document.querySelector('[data-craft-open]');
const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  open: false,
  selected: -1,     // active figure index, -1 = overview
  composed: false,  // camera has landed at the stage; dots are on
  arrived: false,   // camera has landed at the selected figure; panel is on
  arrivalTimer: 0,
  closeTimer: 0,
  rafId: 0,
  driftT0: 0,       // ambient-orbit epoch
  exitUntil: 0,     // a swap may not reveal until the outgoing panel has fully left
  closing: false,   // in the exit fade window: dialog still open+modal, state.open already false
};

// stage geometry for the ambient orbit (radius + azimuth of STAGE.pos in XZ)
const stageR = Math.hypot(STAGE.pos[0], STAGE.pos[2]);
const stageAng = Math.atan2(STAGE.pos[0], STAGE.pos[2]);

let dotEls = [];
let panelEls = [];
let tabEl, tabBtnEl, counterEl;

// write a camera target; under reduced motion also snap `current` so the
// composed state presents instantly (no flight).
function setCam(cam) {
  cameraState.target.pos = [...cam.pos];
  cameraState.target.look = [...cam.look];
  cameraState.target.fov = cam.fov;
  if (reduceMq.matches) {
    cameraState.current.pos = [...cam.pos];
    cameraState.current.look = [...cam.look];
    cameraState.current.fov = cam.fov;
  }
}

// ---------------------------------------------------------------------------
// per-frame: ambient stage drift (overview only), dot projection, panel dock
// ---------------------------------------------------------------------------
function tick(now) {
  if (!state.open) { state.rafId = 0; return; }
  const w = innerWidth, h = innerHeight;

  // ambient orbital drift — the lens breathes around the stage while nothing is
  // selected. Slow lissajous on azimuth + height; the render loop's own lerp
  // smooths the chase. Off under reduced motion (static composed state).
  if (state.selected < 0 && !reduceMq.matches) {
    const t = (now - state.driftT0) / 1000;
    const ang = stageAng + Math.sin(t * 0.21 + 0.9) * 0.17;
    cameraState.target.pos = [
      stageR * Math.sin(ang),
      STAGE.pos[1] + Math.sin(t * 0.16) * 0.16,
      stageR * Math.cos(ang),
    ];
  }

  const cam = cameraState.current;
  dotEls.forEach((el, i) => {
    const proj = projectToScreen(FIGURES[i].worldPos, cam.pos, cam.look, cam.fov, w, h);
    if (!proj) { el.classList.add('off'); return; }
    const pad = 30;
    const inFrame = proj.x > pad && proj.x < w - pad && proj.y > pad && proj.y < h - pad;
    el.classList.toggle('off', !inFrame);
    el.style.transform = `translate(${proj.x.toFixed(1)}px, ${proj.y.toFixed(1)}px)`;
  });

  // dock the open panel opposite its dot, tracking the dot's Y (v1 behavior).
  // Below 880px the CSS bottom-sheet takes over (transform overridden there).
  if (state.selected >= 0 && state.arrived && w > 880) {
    const panel = panelEls[state.selected];
    const proj = projectToScreen(FIGURES[state.selected].worldPos, cam.pos, cam.look, cam.fov, w, h);
    if (proj && panel) {
      const pw = panel.offsetWidth || 620;
      const ph = panel.offsetHeight || 260;
      const gutter = 40;
      const dotIsLeft = proj.x < w * 0.5;
      const cx = dotIsLeft ? (w - pw - gutter) : gutter;
      let cy = proj.y - ph * 0.4;
      if (cy + ph > h - gutter) cy = h - ph - gutter;
      if (cy < gutter) cy = gutter;
      panel.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
    }
  }

  state.rafId = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// arrival — poll until the lens has physically settled at its target (or a
// hard cap), then fire. Keeps every reveal locked to the landing.
// ---------------------------------------------------------------------------
function awaitArrival(cb) {
  clearTimeout(state.arrivalTimer);
  if (reduceMq.matches) { cb(); return; } // camera snapped — already there
  const SETTLE = 0.07;
  const MAX_WAIT = 2600;
  const t0 = performance.now();
  const check = () => {
    if (!state.open) return;
    if (camDistance(cameraState.current, cameraState.target) < SETTLE ||
        performance.now() - t0 > MAX_WAIT) {
      state.arrivalTimer = 0;
      cb();
    } else {
      state.arrivalTimer = setTimeout(check, 55);
    }
  };
  state.arrivalTimer = setTimeout(check, 55);
}

// ---------------------------------------------------------------------------
// figures — select / deselect
// ---------------------------------------------------------------------------
function selectFigure(idx) {
  if (state.selected === idx) { deselect(); return; }
  if (state.selected >= 0) hidePanel(state.selected);
  state.selected = idx;
  state.arrived = false;
  setCam(FIGURES[idx].cam);
  cameraState.mouseFreeze = true; // hold the cursor sphere still while reading
  dotEls.forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
    el.setAttribute('aria-expanded', i === idx ? 'true' : 'false');
  });
  if (counterEl) counterEl.textContent = String(idx + 1).padStart(2, '0');
  tabEl?.classList.add('is-yielding'); // the technique tab steps back while a figure is open
  awaitArrival(() => {
    if (state.selected !== idx) return;
    state.arrived = true;
    revealPanel(idx);
  });
}

function deselect(focusDot = false) {
  const was = state.selected;
  state.selected = -1;
  state.arrived = false;
  clearTimeout(state.arrivalTimer);
  if (was >= 0) hidePanel(was);
  cameraState.mouseFreeze = false;
  state.driftT0 = performance.now(); // re-enter the orbit smoothly from "now"
  setCam(STAGE);
  dotEls.forEach((el) => {
    el.classList.remove('selected');
    el.setAttribute('aria-expanded', 'false');
  });
  if (counterEl) counterEl.textContent = '—';
  tabEl?.classList.remove('is-yielding');
  if (focusDot && was >= 0) dotEls[was]?.focus();
}

function revealPanel(idx) {
  const panel = panelEls[idx];
  if (!panel) return;
  // never enter while the outgoing readout is still leaving — exit finishes, then enter
  const wait = Math.max(0, state.exitUntil - performance.now());
  clearTimeout(panel._hideTimer);
  const show = () => {
    if (state.selected !== idx || !state.open) return;
    panel.hidden = false;
    panel.classList.remove('reveal');
    void panel.offsetWidth; // restart the staggered transitions
    panel.classList.add('reveal');
    // hand focus to the panel so the explanation is read in place (keyboard/SR);
    // focus-visible keeps this invisible for pointer users.
    panel.focus({ preventScroll: true });
  };
  if (wait > 0 && !reduceMq.matches) setTimeout(show, wait);
  else show();
}

// the exit is sequenced: the readout fades (its 0.32s opacity), THEN leaves the layout —
// a swap can never double-expose two panels mid-crossfade.
const PANEL_EXIT_MS = 340;
function hidePanel(idx, instant = false) {
  const panel = panelEls[idx];
  if (!panel) return;
  panel.classList.remove('reveal');
  clearTimeout(panel._hideTimer);
  if (instant || reduceMq.matches || panel.hidden) {
    panel.hidden = true;
    return;
  }
  state.exitUntil = performance.now() + PANEL_EXIT_MS;
  panel._hideTimer = setTimeout(() => { panel.hidden = true; }, PANEL_EXIT_MS);
}

// ---------------------------------------------------------------------------
// enter / exit
// ---------------------------------------------------------------------------
function enter() {
  if (state.open || !dialog) return;
  state.open = true;
  state.closing = false; // a re-entry during the exit fade takes the mode straight back
  state.selected = -1;
  state.arrived = false;
  state.composed = false;
  clearTimeout(state.closeTimer);

  // the trigger lives in the hero, so we're near the top — snap the rest so the
  // stage is exact, then lock scroll for the contained overlay mode.
  if (scrollY > 8) scrollTo({ top: 0, behavior: 'instant' });
  document.body.classList.add('craft-active'); // hero recedes; scroll locks (craft.css)

  // (a rapid re-open can land inside the previous exit's close-fade, with the
  // dialog still open — showModal() would throw InvalidStateError then)
  if (!dialog.open) dialog.showModal(); // native focus trap + Esc + aria-modal
  void dialog.offsetWidth; // let [open] land before the transition class
  dialog.classList.add('is-open');

  cameraState.ease = 0.06; // statelier settle for the study
  // the examined machine runs a touch livelier — the tempo SWELLS to the study speed
  // (eased in the render loop, phase-continuous; never a snap).
  cameraState.speedTarget = BLOB_SPEED.study;
  state.driftT0 = performance.now() - 4200; // join the orbit mid-phrase: entry arcs, not dollies
  setCam(STAGE);
  if (counterEl) counterEl.textContent = '—';

  if (!state.rafId) state.rafId = requestAnimationFrame(tick);
  // compose floor: the dots/tab never arrive mid-curtain — the release of the signal
  // word owns the stage until ~1.15s even if the camera lands early. (No floor under
  // reduced motion: open is an instant composed state.)
  const CURTAIN_MS = 1150;
  const t0 = performance.now();
  awaitArrival(() => {
    const hold = reduceMq.matches ? 0 : Math.max(0, CURTAIN_MS - (performance.now() - t0));
    state.arrivalTimer = setTimeout(() => {
      if (!state.open) return;
      state.composed = true;
      dialog.classList.add('is-composed'); // dots + tab set on, staggered at the cadence
    }, hold);
  });
  // predictable entry point for keyboard users. preventScroll: on an interrupted
  // open (D1: click → Esc → re-click mid-fade) the browser's focus scroll-into-view
  // produced a one-frame document scroll transient (measured 0→416→0, ~170ms)
  // before the scroll lock corrected it; the dialog is a fixed full-viewport top
  // layer, so there is never anything to scroll to.
  setTimeout(() => dialog.querySelector('[data-craft-close]')?.focus({ preventScroll: true }), 40);
}

function exit() {
  if (!state.open) return;
  state.open = false;
  state.closing = true; // the dialog stays open + modal through the fade below
  clearTimeout(state.arrivalTimer);
  if (state.selected >= 0) hidePanel(state.selected, true); // the shell fade carries the leave
  state.selected = -1;
  state.arrived = false;
  state.composed = false;

  dialog.classList.remove('is-composed');
  dialog.classList.remove('is-open');
  document.body.classList.remove('craft-active'); // hero returns (reverse recede)

  cameraState.mouseFreeze = false;
  setCam(HOME_CAM);
  cameraState.ease = 0.075; // the resting loop's own ease
  cameraState.speedTarget = BLOB_SPEED.home; // the tempo settles back as the lens returns
  dotEls.forEach((el) => {
    el.classList.remove('selected');
    el.setAttribute('aria-expanded', 'false');
  });

  // let the shell fade + hero return play before the dialog leaves the top
  // layer (close() is instant). Native close restores focus to the trigger.
  // Guard on `closing`: a re-entry during the fade clears it (and the timer), so a stale
  // timer can never close a dialog that has just been taken back open.
  const wait = reduceMq.matches ? 0 : 480;
  state.closeTimer = setTimeout(() => {
    state.closing = false;
    if (state.open) return; // re-opened during the fade — leave it open
    if (dialog.open) dialog.close();
  }, wait);
}

// ---------------------------------------------------------------------------
// the curtain seam — split the hero headline at its word boundaries so the two
// halves can part around the italic signal word. v1's own split-text technique
// (liquid-chrome-v2/src/js/split-text.js), reduced to three word-boundary
// segments: kerning never crosses a space, and the spaces stay as bare text
// nodes between the spans, so the resting render is pixel-identical and the
// lines still break exactly where they always did.
// ---------------------------------------------------------------------------
function splitHeadline() {
  const h1 = document.querySelector('#dark section > h1');
  if (!h1 || h1.querySelector('.crt')) return;
  const em = h1.querySelector('em');
  if (!em) {
    // unexpected shape: no seam — fall back to a plain whole-headline fade
    document.body.classList.add('craft-nosplit');
    return;
  }
  let seenEm = false;
  [...h1.childNodes].forEach((n) => {
    if (n === em) { seenEm = true; return; }
    if (n.nodeType !== 3 || !n.textContent.trim()) return;
    const frag = document.createDocumentFragment();
    if (/^\s/.test(n.textContent)) frag.appendChild(document.createTextNode(' '));
    const seg = document.createElement('span');
    seg.className = 'crt ' + (seenEm ? 'crt--r' : 'crt--l');
    seg.textContent = n.textContent.trim();
    frag.appendChild(seg);
    if (/\s$/.test(n.textContent)) frag.appendChild(document.createTextNode(' '));
    h1.replaceChild(frag, n);
  });
  em.classList.add('crt', 'crt--em');
}

export function initCraft() {
  if (!dialog || !trigger) return;
  if (typeof dialog.showModal !== 'function') { trigger.hidden = true; return; }
  splitHeadline();

  dotEls = [...dialog.querySelectorAll('.craft-dot')];
  panelEls = [...dialog.querySelectorAll('.craft-panel')];
  tabEl = dialog.querySelector('.craft-tab');
  tabBtnEl = dialog.querySelector('.craft-tab__head');
  counterEl = dialog.querySelector('[data-craft-counter]');

  trigger.addEventListener('click', enter);

  dotEls.forEach((el, i) => {
    el.addEventListener('click', (e) => { e.stopPropagation(); selectFigure(i); });
  });

  dialog.querySelectorAll('[data-craft-close]').forEach((b) => b.addEventListener('click', exit));
  dialog.querySelectorAll('[data-craft-deselect]').forEach((b) =>
    b.addEventListener('click', () => deselect(true)));

  // the technique tab — a disclosure; open by default on wide viewports (CSS
  // sets the initial collapsed state <881px via the hidden attribute below).
  if (tabBtnEl && tabEl) {
    const body = tabEl.querySelector('.craft-tab__body');
    if (matchMedia('(max-width: 880px)').matches && body) {
      body.hidden = true;
      tabBtnEl.setAttribute('aria-expanded', 'false');
    }
    tabBtnEl.addEventListener('click', () => {
      const open = tabBtnEl.getAttribute('aria-expanded') === 'true';
      tabBtnEl.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (body) body.hidden = open;
    });
  }

  // the pager — ‹ › step the figures in order (wrapping), from the overview too;
  // the counter's n / 05 promise, made operable.
  const stepFigure = (d) => {
    if (!state.composed) return;
    const n = FIGURES.length;
    const next = state.selected < 0
      ? (d > 0 ? 0 : n - 1)
      : (state.selected + d + n) % n;
    selectFigure(next);
  };
  dialog.querySelector('[data-craft-prev]')?.addEventListener('click', () => stepFigure(-1));
  dialog.querySelector('[data-craft-next]')?.addEventListener('click', () => stepFigure(1));

  // click on empty stage: deselect the open figure. Exit stays explicit
  // (Esc / close), so nobody bounces out of the mode by accident.
  // During the exit fade the dialog is still a fullscreen modal in the top layer, so a
  // rapid re-click lands HERE (on the stage / frame), never on the covered trigger — route
  // it straight back to open(). This makes the trigger idempotent across the transition:
  // the re-click deterministically re-opens instead of being swallowed, with no scroll leak.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog && !e.target.classList?.contains('craft-frame')) return;
    if (state.closing || !state.open) { enter(); return; } // caught mid-close → take it back open
    if (state.selected >= 0) deselect();
  });

  // focus containment — a safety net over showModal(). The native modal contains focus, but
  // at the tab-order wrap (past the last control) Chromium can drop one Tab onto <body> before
  // it cycles back. This wraps Tab/Shift+Tab explicitly across the dialog's live focusables so
  // focus never leaves the study.
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null && el.getClientRects().length);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  });

  // native Esc → cancel: route through our exit choreography instead of the
  // instant close, then close for real once the shell has faded.
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); exit(); });
  // safety net: if anything closes the dialog directly, restore the world.
  dialog.addEventListener('close', () => { if (state.open) exit(); });

  addEventListener('keydown', (e) => {
    if (!state.open) return;
    if (e.key >= '1' && e.key <= '5') selectFigure(parseInt(e.key, 10) - 1);
    // arrows page the figures — except where a scrollable readout owns them
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (e.target?.closest?.('.craft-tab__body, .p-code__body')) return;
      e.preventDefault();
      stepFigure(e.key === 'ArrowRight' ? 1 : -1);
    }
  });
}

initCraft();
