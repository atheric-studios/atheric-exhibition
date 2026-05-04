import { cameraState, HOME_CAM } from './chrome-blob.js';

// ---------------------------------------------------------------------------
// features — each is a teaching moment. the camera flies to its `cam`,
// the dot anchors at its `worldPos`, and the card reveals title + body.
// kept to five so the lab stays a curated tour, not a dump of trivia.
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    label: '01',
    title: 'raymarching',
    body: 'Rays step through space, sampling a distance field, until they meet a surface — no polygons, no mesh. Seventy-two steps with a step factor of 0.85: close enough to converge, loose enough to stay quick. The whole geometry lives inside one function, traced per pixel.',
    codeTitle: 'chrome.frag · raymarch',
    code: `for (int i = 0; i < 72; i++) {
  vec3 p = ro + rd * t;
  float d = scene(p);
  if (d < 0.001) { hit = true; break; }
  t += d * 0.85;
}`,
    caption: 'one ray per pixel — small steps until it finds something.',
    worldPos: [0.45, 0.55, -0.25],
    cam: { pos: [0.65, 0.85, -1.55], look: [0.1, 0.2, 0.0], fov: 2.0 }
  },
  {
    label: '02',
    title: 'metaballs · smin',
    body: 'Four spheres, blended with a smooth-minimum function. The k parameter is the surface tension: high k holds the chrome as one body; drop it and the marbles un-fuse. The same knob that holds them together is the one that lets them go on scroll.',
    codeTitle: 'chrome.frag · smin',
    code: `float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}`,
    caption: 'two distance fields, blended into one. k is the knob.',
    worldPos: [-0.35, -0.05, 0.0],
    cam: { pos: [-1.45, 0.15, -1.55], look: [-0.25, 0.0, 0.0], fov: 2.05 }
  },
  {
    label: '03',
    title: 'chrome · fresnel',
    body: 'At grazing angles, surfaces reflect more than they should. We power the dot of view and normal to a sharp exponent — the rim glows, the centre stays soft. That asymmetry is what makes the chrome read as chrome and not as a grey ball.',
    codeTitle: 'chrome.frag · fresnel',
    code: `// edges reflect more than middles
float fres = pow(1.0 - max(dot(-rd, n), 0.0), 2.6);
col += vec3(1.0, 0.85, 0.7) * fres * 0.45;`,
    caption: 'chrome looks like chrome because edges reflect more than middles.',
    worldPos: [-0.78, 0.05, -0.05],
    cam: { pos: [-2.0, 0.05, -1.05], look: [-0.55, 0.05, 0.0], fov: 1.95 }
  },
  {
    label: '04',
    title: 'environment · sky',
    body: 'There is no scene around the blob — only the colour it pretends to reflect. A sky-horizon-ground gradient with a sun term and a cool rim. Cheaper than an HDR, and the chrome wears the same warm light as the room around it.',
    codeTitle: 'chrome.frag · envColor',
    code: `vec3 sky     = vec3(0.96, 0.94, 0.88);
vec3 horizon = vec3(1.00, 0.78, 0.55);
vec3 ground  = vec3(0.06, 0.06, 0.07);
vec3 c = mix(ground, horizon, smoothstep(0.0, 0.5, t));
c = mix(c, sky, smoothstep(0.5, 1.0, t));`,
    caption: 'no scene exists — only the colour the chrome pretends to reflect.',
    worldPos: [0.05, 0.85, -0.35],
    cam: { pos: [0.25, 1.4, -1.55], look: [0.05, 0.5, 0.0], fov: 1.95 }
  },
  {
    label: '05',
    title: 'motion · cursor · scroll',
    body: 'Three spheres trace slow orbits in time; one tracks the cursor through normalized device coordinates. As you scroll past the hero, each sphere drifts along its own outward vector — chrome breaks tension and leaves the room.',
    codeTitle: 'chrome.frag · scene',
    code: `float t = uTime * 0.55;
vec3 c2 = vec3(cos(t)*0.95, sin(t*1.3)*0.5, sin(t*0.8)*0.45)
        + vec3(-1.7, 0.7, 0.0) * disp * 3.5;
float d2 = sphere(p, c2, 0.42);`,
    caption: 'quiet orbits in time, plus a direction each sphere drifts toward.',
    worldPos: [0.6, -0.45, 0.0],
    cam: { pos: [1.55, -0.55, -1.55], look: [0.5, -0.3, 0.0], fov: 1.9 }
  },
];

// minimal GLSL syntax highlighter — regex, ~30 lines, no dependency.
// good enough for short hand-curated snippets; comments are tokenized
// separately so keywords inside them don't get re-coloured.
const GLSL_KW = ['float', 'vec2', 'vec3', 'vec4', 'mat3', 'mat4', 'int', 'bool', 'void',
                 'if', 'else', 'for', 'while', 'return', 'uniform', 'attribute', 'varying',
                 'in', 'out', 'const', 'break', 'continue', 'true', 'false'];
const GLSL_FN = ['normalize', 'cross', 'dot', 'length', 'mix', 'smoothstep', 'clamp',
                 'min', 'max', 'abs', 'pow', 'sin', 'cos', 'tan', 'sqrt', 'reflect',
                 'step', 'sphere', 'smin', 'scene', 'fract', 'floor', 'ceil'];

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(code) {
  const escaped = escapeHtml(code);
  // split into comment/code parts so keyword-regex doesn't touch comments
  const parts = [];
  let last = 0;
  const re = /\/\/[^\n]*/g;
  let m;
  while ((m = re.exec(escaped)) !== null) {
    if (m.index > last) parts.push({ k: 'c', t: escaped.slice(last, m.index) });
    parts.push({ k: 'co', t: m[0] });
    last = m.index + m[0].length;
  }
  if (last < escaped.length) parts.push({ k: 'c', t: escaped.slice(last) });

  const kwRe = new RegExp(`\\b(${GLSL_KW.join('|')})\\b`, 'g');
  const fnRe = new RegExp(`\\b(${GLSL_FN.join('|')})\\b`, 'g');
  const numRe = /\b(\d+\.?\d*)\b/g;

  return parts.map(p => {
    if (p.k === 'co') return `<span class="cm-co">${p.t}</span>`;
    let t = p.t;
    t = t.replace(kwRe, '<span class="cm-kw">$1</span>');
    t = t.replace(fnRe, '<span class="cm-fn">$1</span>');
    t = t.replace(numRe, '<span class="cm-num">$1</span>');
    return t;
  }).join('');
}

// ---------------------------------------------------------------------------
// projection — replicates the shader's camera math in JS so we can place
// DOM dots over the right surface point each frame, even mid-flight.
// shader: rd = normalize(forward * fov + right * uv.x + up * uv.y)
// inverse: uv.x = (rel · right / rel · forward) * fov; same for y
// ---------------------------------------------------------------------------
function projectToScreen(world, camPos, camLook, fov, viewW, viewH) {
  const fx = camLook[0] - camPos[0];
  const fy = camLook[1] - camPos[1];
  const fz = camLook[2] - camPos[2];
  const fLen = Math.hypot(fx, fy, fz) || 1;
  const fwd = [fx / fLen, fy / fLen, fz / fLen];
  const worldUp = Math.abs(fwd[1]) > 0.97 ? [0, 0, 1] : [0, 1, 0];
  let rx = fwd[1] * worldUp[2] - fwd[2] * worldUp[1];
  let ry = fwd[2] * worldUp[0] - fwd[0] * worldUp[2];
  let rz = fwd[0] * worldUp[1] - fwd[1] * worldUp[0];
  const rLen = Math.hypot(rx, ry, rz) || 1;
  rx /= rLen; ry /= rLen; rz /= rLen;
  const ux = ry * fwd[2] - rz * fwd[1];
  const uy = rz * fwd[0] - rx * fwd[2];
  const uz = rx * fwd[1] - ry * fwd[0];
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
  const dpx = a.pos[0] - b.pos[0];
  const dpy = a.pos[1] - b.pos[1];
  const dpz = a.pos[2] - b.pos[2];
  const dlx = a.look[0] - b.look[0];
  const dly = a.look[1] - b.look[1];
  const dlz = a.look[2] - b.look[2];
  return Math.hypot(dpx, dpy, dpz) +
         Math.hypot(dlx, dly, dlz) * 0.5 +
         Math.abs(a.fov - b.fov) * 0.5;
}

// ---------------------------------------------------------------------------
// audio — tiny synthesized cues, gated by the existing #audio toggle. no
// external assets; the goal is atmosphere, not melody. context lazy-creates
// on first play (browsers require a user gesture, which the click provides).
// ---------------------------------------------------------------------------
let audioCtx = null;
function audioOn() {
  const el = document.getElementById('audio');
  return el && el.getAttribute('aria-pressed') === 'true';
}
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playArrival() {
  if (!audioOn()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(108, now + 0.22);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}
function playClick() {
  if (!audioOn()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 1700;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.035, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
function playEnter() {
  if (!audioOn()) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  // soft swell: two sines a fifth apart
  [110, 165].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.04);
    osc.stop(now + 1.1);
  });
}

// ---------------------------------------------------------------------------
// state + DOM refs
// ---------------------------------------------------------------------------
let state = {
  active: false,
  selected: -1,
  arrivalTimer: null,
  arrived: false,
};

let shellEl, hintsContainerEl, hintEls = [];
let cardEl, cardLineEl, cardLabelEl, cardTitleEl, cardBodyEl;
let cardCodeEl, cardWindowTitleEl, cardCaptionEl;
let counterEl, frameEl, triggerEl;
let rafId = 0;

// ---------------------------------------------------------------------------
// build the overlay DOM (once, on init)
// ---------------------------------------------------------------------------
function buildShell() {
  shellEl = document.createElement('div');
  shellEl.id = 'inspect-shell';
  shellEl.setAttribute('aria-hidden', 'true');
  shellEl.innerHTML = `
    <div class="inspect-frame"></div>
    <div class="inspect-meta inspect-meta-tl">
      <span class="kicker">— lab · inspect mode</span>
    </div>
    <div class="inspect-meta inspect-meta-bl">
      <span class="counter"><span class="counter-now">—</span><em> / 05</em></span>
      <span class="counter-hint">click a marker</span>
    </div>
    <div class="inspect-meta inspect-meta-br">
      <span class="esc-hint">to exit</span>
    </div>
    <button class="inspect-close" aria-label="exit inspect mode">
      <span class="x" aria-hidden="true">✕</span>
      <span class="close-text">close</span>
    </button>
    <div class="inspect-hints"></div>
    <article class="inspect-card" data-active="false" aria-live="polite">
      <div class="card-text">
        <div class="card-line"></div>
        <div class="card-label">— 00</div>
        <h3 class="card-title">title</h3>
        <p class="card-body">body</p>
      </div>
      <div class="card-code">
        <div class="window-bar">
          <span class="window-dots" aria-hidden="true">
            <span class="window-dot dot-red"></span>
            <span class="window-dot dot-yellow"></span>
            <span class="window-dot dot-green"></span>
          </span>
          <span class="window-title">chrome.frag</span>
        </div>
        <pre class="window-body"><code class="code-content"></code></pre>
        <p class="card-caption">caption</p>
      </div>
    </article>
  `;
  document.body.appendChild(shellEl);

  frameEl = shellEl.querySelector('.inspect-frame');
  hintsContainerEl = shellEl.querySelector('.inspect-hints');
  cardEl = shellEl.querySelector('.inspect-card');
  cardLineEl = cardEl.querySelector('.card-line');
  cardLabelEl = cardEl.querySelector('.card-label');
  cardTitleEl = cardEl.querySelector('.card-title');
  cardBodyEl = cardEl.querySelector('.card-body');
  cardCodeEl = cardEl.querySelector('.code-content');
  cardWindowTitleEl = cardEl.querySelector('.window-title');
  cardCaptionEl = cardEl.querySelector('.card-caption');
  counterEl = shellEl.querySelector('.counter-now');

  shellEl.querySelector('.inspect-close').addEventListener('click', exit);

  // click on empty shell area: deselect any active feature. exit must be
  // explicit (Esc or close button) so visitors can't bounce out by accident.
  shellEl.addEventListener('click', (e) => {
    if (e.target === shellEl || e.target === frameEl) {
      if (state.selected >= 0) deselect();
    }
  });
}

function buildHints() {
  FEATURES.forEach((f, i) => {
    const btn = document.createElement('button');
    btn.className = 'inspect-hint';
    btn.dataset.idx = String(i);
    btn.setAttribute('aria-label', `inspect · ${f.title}`);
    btn.innerHTML = `
      <span class="hint-ring"></span>
      <span class="hint-dot"></span>
      <span class="hint-num">${f.label}</span>
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectFeature(i);
    });
    hintsContainerEl.appendChild(btn);
    hintEls.push(btn);
  });
}

// ---------------------------------------------------------------------------
// per-frame: project each hint's worldPos through the live camera and
// position its DOM element. also positions the card relative to the
// selected hint, flipping side if it would overflow the viewport.
// ---------------------------------------------------------------------------
function tick() {
  if (!state.active) { rafId = 0; return; }
  const cam = cameraState.current;
  const w = innerWidth, h = innerHeight;

  hintEls.forEach((el, i) => {
    const proj = projectToScreen(FEATURES[i].worldPos, cam.pos, cam.look, cam.fov, w, h);
    if (!proj) {
      el.classList.add('off');
      return;
    }
    const pad = 28;
    const inFrame = proj.x > pad && proj.x < w - pad && proj.y > pad && proj.y < h - pad;
    el.classList.toggle('off', !inFrame);
    el.style.transform = `translate(${proj.x.toFixed(1)}px, ${proj.y.toFixed(1)}px)`;
  });

  if (state.selected >= 0 && state.arrived) {
    const f = FEATURES[state.selected];
    const proj = projectToScreen(f.worldPos, cam.pos, cam.look, cam.fov, w, h);
    if (proj) {
      // wider card now (text + code window) — dock to the side opposite the
      // active hint instead of floating next to it. the card vertically
      // tracks the hint Y so the connection still reads, just at a distance.
      const cardW = cardEl.offsetWidth || 640;
      const cardH = cardEl.offsetHeight || 240;
      const gutter = 36;
      const hintIsLeft = proj.x < w * 0.5;
      let cx = hintIsLeft ? (w - cardW - gutter) : gutter;
      let cy = proj.y - cardH * 0.4;
      if (cy + cardH > h - gutter) cy = h - cardH - gutter;
      if (cy < gutter) cy = gutter;
      cardEl.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
    }
  }

  rafId = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// camera arrival — poll until current is near target, then fire callback.
// keeps the reveal sequence locked to physical landing rather than a
// fixed timeout, so it always *feels* like the camera settles first.
// ---------------------------------------------------------------------------
function awaitArrival(cb) {
  if (state.arrivalTimer) clearTimeout(state.arrivalTimer);
  const SETTLE = 0.05;
  const MAX_WAIT = 2200;
  const t0 = performance.now();
  const check = () => {
    if (!state.active || state.selected < 0) return;
    const dist = camDistance(cameraState.current, cameraState.target);
    if (dist < SETTLE || performance.now() - t0 > MAX_WAIT) {
      state.arrivalTimer = null;
      cb();
    } else {
      state.arrivalTimer = setTimeout(check, 55);
    }
  };
  state.arrivalTimer = setTimeout(check, 55);
}

// ---------------------------------------------------------------------------
// selecting a feature — fly the camera, hide current card immediately,
// and only reveal the new card once the camera has actually settled.
// ---------------------------------------------------------------------------
function selectFeature(idx) {
  playClick();
  if (state.selected === idx) {
    deselect();
    return;
  }
  state.selected = idx;
  state.arrived = false;
  const f = FEATURES[idx];
  cameraState.target.pos = [...f.cam.pos];
  cameraState.target.look = [...f.cam.look];
  cameraState.target.fov = f.cam.fov;

  hintEls.forEach((e, i) => e.classList.toggle('selected', i === idx));
  counterEl.textContent = f.label;

  hideCard();
  awaitArrival(() => {
    if (state.selected !== idx) return;
    state.arrived = true;
    revealCard(idx);
    playArrival();
  });
}

function deselect() {
  state.selected = -1;
  state.arrived = false;
  cameraState.target.pos = [...HOME_CAM.pos];
  cameraState.target.look = [...HOME_CAM.look];
  cameraState.target.fov = HOME_CAM.fov;
  hintEls.forEach((e) => e.classList.remove('selected'));
  counterEl.textContent = '—';
  hideCard();
  if (state.arrivalTimer) { clearTimeout(state.arrivalTimer); state.arrivalTimer = null; }
}

function revealCard(idx) {
  const f = FEATURES[idx];
  cardLabelEl.textContent = `— ${f.label}`;
  cardTitleEl.textContent = f.title;
  cardBodyEl.textContent = f.body;
  cardCodeEl.innerHTML = highlight(f.code);
  cardWindowTitleEl.textContent = f.codeTitle;
  cardCaptionEl.textContent = f.caption;
  cardEl.dataset.active = 'true';
  cardEl.classList.remove('reveal');
  // force reflow so the next class addition restarts the CSS transitions
  void cardEl.offsetWidth;
  cardEl.classList.add('reveal');
}

function hideCard() {
  cardEl.dataset.active = 'false';
  cardEl.classList.remove('reveal');
}

// ---------------------------------------------------------------------------
// enter / exit
// ---------------------------------------------------------------------------
function enter() {
  if (state.active) return;
  // defensive: if the user clicks inspect before the charIn cascade has
  // finished (loader adds .complete at +2.2s), force it now. without
  // .complete, the headline's transform/opacity sit in the CSS animations
  // cascade origin and transitions are suppressed — chars would jump
  // instead of choreographing.
  document.querySelectorAll('[data-hero-headline]').forEach(el => {
    if (!el.classList.contains('complete')) el.classList.add('complete');
  });
  state.active = true;
  state.selected = -1;
  state.arrived = false;
  document.body.classList.add('inspect-active');
  shellEl.setAttribute('aria-hidden', 'false');
  // ensure we start at home camera with full chrome (override scroll dispersion)
  cameraState.scrollOverride = 0;
  cameraState.mouseFreeze = true;
  cameraState.target.pos = [...HOME_CAM.pos];
  cameraState.target.look = [...HOME_CAM.look];
  cameraState.target.fov = HOME_CAM.fov;
  // if the user scrolled, snap to top so the entrance feels clean
  if (scrollY > 8) window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.style.overflow = 'hidden';
  hintEls.forEach((e) => e.classList.remove('selected'));
  counterEl.textContent = '—';
  hideCard();
  if (!rafId) rafId = requestAnimationFrame(tick);
  playEnter();
}

function exit() {
  if (!state.active) return;
  state.active = false;
  state.selected = -1;
  state.arrived = false;
  document.body.classList.remove('inspect-active');
  shellEl.setAttribute('aria-hidden', 'true');
  cameraState.scrollOverride = null;
  cameraState.mouseFreeze = false;
  cameraState.target.pos = [...HOME_CAM.pos];
  cameraState.target.look = [...HOME_CAM.look];
  cameraState.target.fov = HOME_CAM.fov;
  document.body.style.overflow = '';
  hintEls.forEach((e) => e.classList.remove('selected'));
  counterEl.textContent = '—';
  hideCard();
  if (state.arrivalTimer) { clearTimeout(state.arrivalTimer); state.arrivalTimer = null; }
}

// ---------------------------------------------------------------------------
// trigger — a small mono affordance floating on the right edge of the hero.
// kept deliberately quiet (low default opacity, signal-orange arrow only on
// hover) so it reads as a marginal note next to the chrome, not a CTA.
// ---------------------------------------------------------------------------
function buildTrigger() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  triggerEl = document.createElement('button');
  triggerEl.className = 'blob-trigger';
  triggerEl.setAttribute('aria-label', 'inspect the chrome');
  triggerEl.innerHTML = `
    <span class="trigger-rule"></span>
    <span class="trigger-bracket">[</span>
    <span class="trigger-text">inspect chrome</span>
    <span class="trigger-arrow" aria-hidden="true">↗</span>
    <span class="trigger-bracket">]</span>
  `;
  triggerEl.addEventListener('click', enter);
  hero.appendChild(triggerEl);
}

// ---------------------------------------------------------------------------
export function initInspect() {
  buildShell();
  buildHints();
  buildTrigger();

  addEventListener('keydown', (e) => {
    if (!state.active) return;
    if (e.key === 'Escape') exit();
    else if (e.key >= '1' && e.key <= '5') selectFeature(parseInt(e.key, 10) - 1);
  });

  // keep hint positions correct on resize
  addEventListener('resize', () => { if (state.active) tick(); });
}
