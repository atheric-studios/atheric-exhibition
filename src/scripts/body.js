// body.js — behaviors for THE BROADSHEET (everything after the hero).
//
// Four small, independent pieces, each cheap and each degrading cleanly:
//   1. Diegetic reveals     — one IntersectionObserver toggles .is-in (drawn rules, heading
//                             line-rise, staggered blocks). No rAF. Inherently lazy.
//   2. The annealing light  — one passive scroll listener → rAF → --descent on :root, so the
//                             warm pool low at the foot of the world brightens + swells with
//                             scroll depth (base.css reads --descent). The cooling is a process.
//   3. (retired)            — the specimen bench's drag-rail went with the invented specimens;
//                             the cabinet's castings are static entries, answered in CSS.
//   4. The hel clock        — the masthead's live local time, echoing v1's "HEL · 18:53:17".
//
// Under prefers-reduced-motion: everything is presented fully formed — reveals are pinned on,
// the annealing light is static (no scroll listener). (Mirrored in CSS.)

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

// The running folio's band hook — while the reader is inside the fracture band the folio's ink
// follows --fracture (the ground under the left gutter turns cream mid-band). Assigned by the
// folio block (§5), called from the fracture scroll rAF (§2b) with the fresh curF.
let folioBandInk = null;

// ── 1. Diegetic reveals ─────────────────────────────────────────────────────────────────────
const revealables = document.querySelectorAll('[data-reveal], [data-anneal], [data-rule], [data-fig]');

if (reduce) {
  revealables.forEach((el) => el.classList.add('is-in'));
} else if (revealables.length) {
  // Stagger items within a group so a block "sets itself" line by line — at the hero's own
  // 0.09s reveal rhythm (dark.js), so the whole page keeps one cadence.
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.09).toFixed(2) + 's';
    });
  });

  const onIn = (entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      }
    });
  };
  const io = new IntersectionObserver(onIn, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  // The footer's own observer: elements living in the page's last few percent can never
  // intersect a root shrunken by -7% bottom margin (the bottom-of-page reveal trap), so the
  // bench's furniture observes an unshrunken root at a near-zero threshold instead.
  const ioFoot = new IntersectionObserver(onIn, { threshold: 0.01 });
  revealables.forEach((el) => (el.closest('.foot') ? ioFoot : io).observe(el));
}

// ── 1b. The pull quote, set word by word ────────────────────────────────────────────────────
// The voice section's chapter-scale line rises WORD by word out of per-word masks — the one
// custom text entrance of the cream close (the headings' line-rise, at word grain). Split at
// word boundaries with the curtain's own technique: spaces stay bare text nodes so kerning,
// line-breaks and the resting render are untouched; the italic <em> rides as one word. Only
// under full motion — reduced motion (and no-JS) keeps the composed paragraph.
const pull = document.querySelector('.pull');
if (pull && !reduce) {
  const words = [];
  const mask = (content) => {
    const w = document.createElement('span');
    w.className = 'w';
    const inner = document.createElement('span');
    inner.className = 'w__in';
    inner.append(content);
    w.append(inner);
    words.push(inner);
    return w;
  };
  [...pull.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        frag.append(/^\s+$/.test(tok) ? document.createTextNode(tok) : mask(tok));
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const w = mask('');
      node.replaceWith(w);
      w.firstChild.append(node);
    }
  });
  words.forEach((el, i) => {
    el.style.transitionDelay = (i * 0.045).toFixed(3) + 's';
  });
  pull.classList.add('pull--split');
}

// ── 2. The annealing light (scroll-scored) ──────────────────────────────────────────────────
const broadsheet = document.querySelector('.broadsheet');
if (broadsheet && !reduce) {
  let startY = 0;
  let span = 1;
  let raf = 0;

  const measure = () => {
    // Warm from just before the broadsheet enters, to the very foot of the page.
    startY = Math.max(0, broadsheet.offsetTop - window.innerHeight * 0.8);
    const endY = Math.max(startY + 1, root.scrollHeight - window.innerHeight);
    span = endY - startY;
  };

  const apply = () => {
    raf = 0;
    const d = Math.min(1, Math.max(0, (window.scrollY - startY) / span));
    root.style.setProperty('--descent', d.toFixed(3));
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };

  measure();
  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    apply();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
}

// ── 2b. The fracture (crystallisation) — canvas-rendered, hand-authored motion ───────────────
// The dark plane fractures into low-poly facets and resolves into the cream close. --fracture (0→1)
// is published as the reader crosses the text-free band; fracture.css uses it for the two layer
// opacities (cheap). The 194 facets themselves are drawn on a <canvas> — driving that many polygon
// fills off a root custom property forces a full style recalc every frame (~30fps); canvas repaints
// in one cheap pass (~60fps) using the SAME geometry, read from the hidden #fracture-geo <svg> (kept
// as the slot-in source).
//
// The resolve is AUTHORED, not a crossfade (docs/DESIGN.md → the crystallisation):
//   nucleate  each facet CHASES its scroll-driven resolve with its own inertia — small shards snap,
//             broad plates settle late — so the front sweeps under scroll and then finishes setting
//             in a breath when the reader pauses. Scroll stays the master; the field only ever
//             converges on the scroll value.
//   crack     mid-resolve a facet contracts a hair about its centroid: the seams part and the gap
//             glows with THE MACHINE'S LIGHT — the blob's own thin-film spectrum (gold → magenta
//             → blue → violet, chrome-blob.js thinFilm()), sampled from a slow spatial sweep so
//             the escaping light reads as one spectral source behind the plane (dark plane only);
//             the parted seam itself is stroked ADDITIVELY as a small neon ring — wide faint halo
//             + thin near-white core — so the light is unmistakable (the neon pass, below); then
//             the crystal seats, the seam seals, and the light is shut out.
//   warm      the tone ramp is warm-biased per channel (endpoints exact: near-black --d → --paper),
//             so facets pass through warm greys — cooling metal, never wet concrete — with a small
//             brightness glint as each crystal seats.
//   unveil    facets gate dark near/below the scrolling .dark-run's bottom edge (smoothstep on
//             screen distance), so the fixed field can never show a hard lit edge sliding out from
//             under the opaque dark sections (the old clipping).
//   breathe   while the plane is un-set (early band) the dark facets are faintly translucent, so
//             the real annealing pool below glows through the un-cooled metal; the field seals
//             opaque before the cream flood begins behind it (#cream-layer at --fracture 0.25).
// Under prefers-reduced-motion the resolve still TRACKS SCROLL (scroll-coupled colour, per the
// brief) but statically: no inertia, no cracks, no glint, no shimmer, no translucency.
const band = document.querySelector('[data-fracture-band]');
const fcanvas = document.querySelector('#fracture-layer canvas');
const fgeo = document.getElementById('fracture-geo');
if (band && fcanvas && fgeo && fcanvas.getContext) {
  const g = fcanvas.getContext('2d');
  const CREAM = [247, 241, 226]; // --paper #f7f1e2 (matches the #cream-layer flood behind the field)
  // THE MACHINE'S LIGHT (2026-07-06) — the crack glow is no longer the annealing orange. The
  // seams part on the blob's own thin-film spectrum (chrome-blob.js → thinFilm(), scaled 0–255):
  // gold → magenta → blue → violet, with the shader's own smoothstep stations (0 → .3 → .55 →
  // .82). Each cracking facet samples the ramp from a slow spatial sweep across the field's
  // diagonal (plus a whisper of per-facet jitter and a very slow drift while the field lives),
  // ping-ponged so the spectrum never wraps hard violet→gold. One spectral source behind the
  // plane, escaping through the parting seams — not confetti.
  const IRID = [[255, 209, 97], [255, 66, 153], [51, 158, 255], [133, 66, 250]];
  const IRB = [0, 0, 0]; // scratch — the sampled crack colour (no per-frame allocation)
  const iridAt = (t) => {
    let a, b, u;
    if (t < 0.3) { a = IRID[0]; b = IRID[1]; u = t / 0.3; }
    else if (t < 0.55) { a = IRID[1]; b = IRID[2]; u = (t - 0.3) / 0.25; }
    else if (t < 0.82) { a = IRID[2]; b = IRID[3]; u = (t - 0.55) / 0.27; }
    else { a = IRID[3]; b = IRID[3]; u = 0; }
    u = u * u * (3 - 2 * u); // the shader's smoothstep between stations
    IRB[0] = a[0] + (b[0] - a[0]) * u;
    IRB[1] = a[1] + (b[1] - a[1]) * u;
    IRB[2] = a[2] + (b[2] - a[2]) * u;
    return IRB;
  };
  const WIDTH = 0.24; // per-facet resolve width
  const VB = 1600, VBH = 1000; // geometry viewBox

  // Parse the hidden SVG once into facet data. A supplied SVG slots in here unchanged, as long as
  // its <polygon>s carry points + data-t (threshold) + data-d (near-black tone) [+ data-sh].
  const facets = [...fgeo.querySelectorAll('polygon')].map((pg) => {
    const pts = pg.getAttribute('points').trim().split(/\s+/).map((pr) => pr.split(',').map(Number));
    const area = Math.abs(
      (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) -
      (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]),
    ) / 2;
    return {
      pts,
      area,
      d: (pg.getAttribute('data-d') || '6 6 8').split(/\s+/).map(Number),
      t: parseFloat(pg.getAttribute('data-t')) || 0.5,
      w: parseFloat(pg.getAttribute('data-w')) || WIDTH, // personal resolve width (the loose facet's is narrow)
      sh: pg.hasAttribute('data-sh'),
      key: pg.hasAttribute('data-key'), // the loose facet — the band's one secret (below)
      ph: Math.random() * 6.283,
      rate: 0.14, // inertia chase factor (set from area below)
      cur: 0, // displayed resolve — chases tgt
      tgt: 0, // scroll-driven resolve × unveil gate
      sp: [0, 0, 0, 0, 0, 0], // scaled points (canvas px, set at resize)
      cx: 0, cy: 0, md: 1, // centroid + max vertex distance (canvas px)
    };
  });
  {
    // Small shards nucleate crisply, broad plates carry mass and settle late — per-facet inertia.
    const maxA = facets.reduce((m, fa) => Math.max(m, fa.area), 1);
    facets.forEach((fa) => {
      fa.rate = 0.085 + 0.12 * (1 - Math.sqrt(fa.area / maxA)) + Math.random() * 0.025;
    });
  }

  // The cover's own tone (--ground-dark #050505, the .dark-run above the band) — the presence
  // fade's blend target, so the field meets the cover's bottom edge in EXACTLY its black.
  const PLANE = [5, 5, 5];
  let scale = 1, ox = 0, oy = 0, dpr = 1, curF = 0, edgeY = -1e9, pspan = 1;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    fcanvas.width = Math.round(w * dpr);
    fcanvas.height = Math.round(h * dpr);
    pspan = fcanvas.height * 0.55; // the presence falloff — long and generous, ~55% of a viewport
    scale = Math.max(w / VB, h / VBH) * dpr; // "slice" / cover
    ox = (fcanvas.width - VB * scale) / 2;
    oy = (fcanvas.height - VBH * scale) / 2;
    for (const fa of facets) {
      const p = fa.pts, s = fa.sp;
      s[0] = p[0][0] * scale + ox; s[1] = p[0][1] * scale + oy;
      s[2] = p[1][0] * scale + ox; s[3] = p[1][1] * scale + oy;
      s[4] = p[2][0] * scale + ox; s[5] = p[2][1] * scale + oy;
      fa.cx = (s[0] + s[2] + s[4]) / 3;
      fa.cy = (s[1] + s[3] + s[5]) / 3;
      fa.md = Math.max(
        Math.hypot(s[0] - fa.cx, s[1] - fa.cy),
        Math.hypot(s[2] - fa.cx, s[3] - fa.cy),
        Math.hypot(s[4] - fa.cx, s[5] - fa.cy),
      );
    }
  };

  // THE NEON SEAMS (illumination pass, 2026-07-06) — the crack's light, made unmistakable.
  // The iridescent underfill alone read under-visible through the 1–3px contraction gap; now
  // each cracking facet also queues its seam ring here and, AFTER the whole field has painted
  // (so no neighbour can cover the light), the rings are stroked additively (composite
  // 'lighter'): a wide faint halo bleeding onto the adjacent faces + a thin near-white core on
  // the seam line itself — small neon panels between the triangles, appearing and vanishing on
  // the same sin(πu) crack envelope, sunk by the same presence fade. Flat scratch array, no
  // per-frame allocation; only facets inside the crack window ever queue (a handful at once).
  const neon = new Float32Array(facets.length * 10); // x1 y1 x2 y2 x3 y3 r g b a
  let neonN = 0;

  // ── THE LOOSE FACET & THE HOLLOW — the band's one secret (rebuilt 2026-07-17; elevated
  //    the same day: the door is easier to find, longer to hold, and it answers the hand) ────
  // ONE crystal of the field never quite set — and it is a DOOR. Behind it lies the hollow:
  // the casting's hidden room (a native <dialog>, markup in index.html, dress in fracture.css).
  // Everything on the canvas here is overlay only: the field's state (fa.cur / fa.tgt) is never
  // touched, so when the room lets go, the next ordinary frame IS the resting band.
  //
  //   the window  the loose facet sets LAST: its own data-t 0.54 with a personal narrow
  //               data-w 0.10 (vs the field's 0.24) holds it dark and live while the field
  //               crystallises around it — the visible holdout — yet fully cream before the
  //               set-seal arrives at --fracture 0.66 (the tab's zero-defect-cream ground
  //               law; the facet's triangle overlaps the seal's station). The live window is
  //               most of the band's traverse, not a passing moment.
  //   the hint    while the key facet is dark, unveiled and covered by the band, its tone
  //               carries a visible warm breath (rose-warm lift, ~4.5 s cycle, shaped like
  //               breathing — quick swell, long settle) and a faint candy WHISPER at its seam:
  //               light leaking from behind the loose crystal, swelling with each breath, its
  //               hue drifting slowly along Clara's ramp. Painted in the field's own frame and
  //               sunk by the same presence fade. Under reduced motion the whisper presents as
  //               a static composed hairline (spatial hint, no motion). Nothing else anywhere
  //               on the site hints.
  //   the answer  under a fine pointer the facet RESPONDS: hover eases the seam bright and
  //               quickens the breath (phase-continuous — a rate change, never a phase snap);
  //               leaving lets it settle back. Touch gets the longer window instead.
  //   the button  [data-facet-key] is fixed and clipped to the facet's exact screen triangle
  //               (placeKey), so the hit area IS the facet. Live only while the band covers it,
  //               the cover has cleared and the crystal is un-set — outside that window it is
  //               invisible, unfocusable, inert. Enter = click; :focus-visible strokes a bone
  //               hairline around the true triangle on the canvas.
  //   the way in  activation answers the SAME FRAME: the seam flares candy pink on the canvas
  //               (drawSeamFX), the dialog opens, and the IRIS — the facet's own triangle,
  //               positioned and clipped to its live screen coordinates — flies: it scales up
  //               about its own centroid until it swallows the viewport, its candy face
  //               crossfading to the room's black mid-flight. You slip through the gap. The
  //               room then composes beneath it on the estate cadence (fracture.css).
  //   inside      the hollow — see fracture.css → THE HOLLOW. Scroll is held still (wheel /
  //               touchmove / scroll-key guards; a scrollbar drag simply closes the room), the
  //               background is inert (modal), focus is trapped by the dialog itself.
  //   the way out [ seal the seam ], Esc, or a scrollbar drag. The designed exit reverses the
  //               flight: the room lets go fast, the iris re-covers and shrinks home to the
  //               facet, black cooling back to candy — and as it lands, the seam's afterglow
  //               dies on the canvas (the coda) and the crystal is still. Scroll position,
  //               band state, focus: byte-identical (nothing was ever moved).
  //   reduced     no flight, no breathing, no stagger: the room fades in composed and still,
  //               fully experiencable; the exit is the same quiet fade.
  const keyBtn = document.querySelector('[data-facet-key]');
  const keyFa = facets.find((fa) => fa.key) || null;
  const CANDY = [[255, 46, 136], [255, 158, 46], [95, 123, 255]]; // Clara's stops: 0 / 0.52 / 1
  const CC = [0, 0, 0]; // scratch — the sampled candy colour (no per-frame allocation)
  const candyAt = (t) => {
    let a, b, u;
    if (t < 0.52) { a = CANDY[0]; b = CANDY[1]; u = t / 0.52; }
    else { a = CANDY[1]; b = CANDY[2]; u = (t - 0.52) / 0.48; }
    u = u * u * (3 - 2 * u); // the gradient's own soft stations
    CC[0] = a[0] + (b[0] - a[0]) * u;
    CC[1] = a[1] + (b[1] - a[1]) * u;
    CC[2] = a[2] + (b[2] - a[2]) * u;
    return CC;
  };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sstep = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

  // room furniture (dialog markup lives beside the button in index.html)
  const room = document.querySelector('.hollow');
  const seal = room ? room.querySelector('.hollow__seal') : null;
  const iris = room ? room.querySelector('.hollow__iris') : null;
  const irisDark = room ? room.querySelector('.hollow__iris-dark') : null;
  // ── THE MASS — the room itself (v6, 2026-08-01). The ball-diagram is dead. ────────────────
  // The v5 sphere read as a DRAWN GLOBE: a lit lattice edge to edge, an iridescent
  // polyline tracing a hard silhouette — a diagram of a ball, nothing ambiguous, nothing
  // fading. The owner's verdict killed that reading. What stands in the dark now is an
  // AMBIGUOUS, evolving volumetric mass — its roundness FELT, never diagrammed:
  //
  //   the darkness  the mass itself is dark. The uniform lattice-lift is gone; light is
  //                 local WEATHER (presences, waves, sparks, aurora pools, the core) on a
  //                 vast dark body whose extent the eye can never trace. The geometry is
  //                 still the welded jittered icosphere (#hollow-geo, shared vertices —
  //                 the living mesh can never open a gap), deformed far past sphere-nature
  //                 by slow deep metaball lobes: the outline, if you could see it, is
  //                 lobed and never rests. You cannot see it.
  //   the veil      every boundary DISSOLVES. All light — and the facet mosaic itself —
  //                 extinguishes smoothly BEFORE the geometric limb, across a noise-warped,
  //                 breathing angular falloff (per-vertex, keyed to facing nz), and again
  //                 across a warped screen-edge falloff where the mass exceeds the frame.
  //                 The polygonal silhouette exists only in total darkness; no rim, no
  //                 edge, no polyline, at any moment of the evolution.
  //   the warp      the thin-film character (the hero blob's own iridAt ramp) is OPTICAL
  //                 WARP now, never a drawn line: (a) the dispersion veil — light entering
  //                 the falloff REFRACTS, its colour shearing along the spectral ramp as
  //                 it dims, so every dissolve boundary is a soft prism zone; (b) the flank
  //                 seep — a presence orbiting BEHIND the mass no longer paints through:
  //                 its light bends AROUND the limb as iridescent fringes sliding along the
  //                 unseen edge, and dies when it swings deep behind (the mass occludes —
  //                 volume read by light, not by outline).
  //
  // The light law holds absolutely: facet paint is near-black (baked data-d, sunk to the
  // void's own black through the veil); ALL candy/spectral light is ADDITIVE (composite
  // 'lighter'). The three presences, the seams' halo+core grammar, sparks, the heartbeat,
  // waves ringing across the surface, attention-light (the surface RISES where you look),
  // THE CORE (recruitment, condensation, time-rings, Fibonacci rings, persistence) and the
  // words' hush all survive re-housed on the mass. Reduced motion: one composed still
  // frame — veil standing, presences at rest — press/Space answer as a STATE, never motion.
  //
  // Budget: geometry parsed and every sprite/colour string baked ONCE at first open (paid
  // under the iris cover); per frame only typed-array math + canvas paths (the few rgb()
  // strings for lit seams/faces are the fracture renderer's own proven pattern — no other
  // allocation). The loop runs ONLY while the room is open; the estate outside never pays.
  const fieldCanvas = room ? room.querySelector('.hollow__field') : null;
  const hgeoEl = document.getElementById('hollow-geo');
  let hf = null; // the built field — lazy; hfLoop/hfLast/hfT0 drive the room-only life loop
  let hfRaf = 0, hfOn = false, hfLast = 0, hfT0 = 0;
  // the hand: damped presence position/intensity (field units), the lean, the charge
  let hpX = 800, hpY = 500, hpTX = 800, hpTY = 500, hpI = 0, hpOn = false;
  let hLeanX = 0, hLeanY = 0, hLeanTX = 0, hLeanTY = 0;
  let hCharging = false, hCharge = 0, hGather = 0, hRmPress = 0;
  let hFed = false; // this hold fed the core — its release is absorbed, not rung
  let hSparkT = 600, hPulseAt = 0; // the crackle's next spark / the heartbeat's next ring
  // the hush — the words' column in field units; the LIGHT quiets beneath the type
  // (legibility as physics, not a heavier veil). Measured while the dialog is open.
  let hHon = false, hHx0 = 0, hHx1 = 0, hHy0 = 0, hHy1 = 0;
  // the waves — four slots, no per-frame allocation
  const WV = 4;
  const wvX = new Float32Array(WV), wvY = new Float32Array(WV);
  const wvT0 = new Float32Array(WV), wvAmp = new Float32Array(WV), wvHue = new Float32Array(WV);
  const wvZ = new Float32Array(WV); // waves live on the SURFACE: origin is a direction
  const wvSig = new Float32Array(WV), wvRad = new Float32Array(WV), wvEnv = new Float32Array(WV);
  const wvChimed = new Uint8Array(WV); // a wave chimes the core ONCE, as it washes the heart
  let wvN = 0;

  const buildField = () => {
    if (hf || !fieldCanvas || !hgeoEl || !fieldCanvas.getContext) return;
    const hg = fieldCanvas.getContext('2d');
    if (!hg) return;
    // — THE MASS (v6): the geometry is still the unit-sphere surface — a data-verts table
    //   of x y z triplets and index-wound faces (outward, so one screen-space cross
    //   product is the backface cull). Watertight by the generator's midpoint welding.
    //   The silhouette is never drawn: the veil extinguishes everything before it. —
    const vraw = (hgeoEl.getAttribute('data-verts') || '').trim().split(/\s+/).map(Number);
    const polys = hgeoEl.querySelectorAll('polygon');
    const T = polys.length;
    const NV = (vraw.length / 3) | 0;
    if (!T || !NV) return;
    const n0x = new Float32Array(NV), n0y = new Float32Array(NV), n0z = new Float32Array(NV);
    for (let i = 0; i < NV; i++) {
      n0x[i] = vraw[i * 3];
      n0y[i] = vraw[i * 3 + 1];
      n0z[i] = vraw[i * 3 + 2];
    }
    const ti = new Uint16Array(T * 3);
    // the mosaic sinks into the void through the veil: per facet, SIX pre-baked fill
    // strings stepping the room's own black (#020202) → the facet's data-d tone — no
    // per-frame strings; steps ≤4/255, spread across the mosaic veil's wide band so
    // neighbouring facets never print a perceivable tone-step at the coast
    const tfillL = new Array(T * 6);
    for (let i = 0; i < T; i++) {
      const pg = polys[i];
      const ix = (pg.getAttribute('data-i') || '0 0 0').split(' ');
      ti[i * 3] = +ix[0]; ti[i * 3 + 1] = +ix[1]; ti[i * 3 + 2] = +ix[2];
      const d = (pg.getAttribute('data-d') || '8 8 11').split(' ').map(Number);
      for (let k = 0; k <= 5; k++) {
        const m = k / 5;
        tfillL[i * 6 + k] = 'rgb(' + ((2 + (d[0] - 2) * m + 0.5) | 0) + ',' +
          ((2 + (d[1] - 2) * m + 0.5) | 0) + ',' + ((2 + (d[2] - 2) * m + 0.5) | 0) + ')';
      }
    }
    // — unique seams (shared edges once) + full edge↔facet ADJACENCY: the core is built
    //   FROM this mesh (facets recruited, seams continuous), so every edge knows its one
    //   or two facets and every facet its three edges —
    const edgeSet = new Map(); // key → edge index
    const eaA = [], ebA = [], et1A = [], et2A = [];
    const tedge = new Uint16Array(T * 3); // facet → its three edge indices
    for (let i = 0; i < T; i++) {
      for (let e = 0; e < 3; e++) {
        const a = ti[i * 3 + e], b = ti[i * 3 + ((e + 1) % 3)];
        const k = a < b ? a * 65536 + b : b * 65536 + a;
        let ei = edgeSet.get(k);
        if (ei === undefined) {
          ei = eaA.length;
          edgeSet.set(k, ei);
          eaA.push(a < b ? a : b);
          ebA.push(a < b ? b : a);
          et1A.push(i);
          et2A.push(-1);
        } else {
          et2A[ei] = i; // the second facet claims the shared seam
        }
        tedge[i * 3 + e] = ei;
      }
    }
    const NE = eaA.length;
    const ea = Uint16Array.from(eaA), ebb = Uint16Array.from(ebA);
    const et1 = Int16Array.from(et1A), et2 = Int16Array.from(et2A);
    // facet centroid DIRECTIONS (unit-ish) — growth, burn and feed reason on the surface
    const tdx = new Float32Array(T), tdy = new Float32Array(T), tdz = new Float32Array(T);
    for (let i = 0; i < T; i++) {
      let cx2 = (n0x[ti[i * 3]] + n0x[ti[i * 3 + 1]] + n0x[ti[i * 3 + 2]]) / 3;
      let cy2 = (n0y[ti[i * 3]] + n0y[ti[i * 3 + 1]] + n0y[ti[i * 3 + 2]]) / 3;
      let cz2 = (n0z[ti[i * 3]] + n0z[ti[i * 3 + 1]] + n0z[ti[i * 3 + 2]]) / 3;
      const l = Math.hypot(cx2, cy2, cz2) || 1;
      tdx[i] = cx2 / l; tdy[i] = cy2 / l; tdz[i] = cz2 / l;
    }
    // the heart's pole — a body-space direction sitting almost on the rotation axis, so
    // the body you grow stays facing the visitor while the surface streams around it
    const h0l = Math.hypot(0.38, -0.2, 0.92);
    const h0x = 0.38 / h0l, h0y = -0.2 / h0l, h0z = 0.92 / h0l;
    // the body's state on the field's OWN facets — no second mesh exists
    const tState = new Uint8Array(T); // 0 field · 1 recruited (part of the body)
    const tBorn = new Float32Array(T);
    const tDepth = new Uint8Array(T); // recruitment depth from the seed (the ring's clock)
    const tMolt = new Array(T), tMoltW = new Array(T), tGlass = new Array(T);
    const bodyList = new Uint16Array(T);
    const vPull = new Float32Array(NV), vPullT = new Float32Array(NV); // the condensation
    const ehd = new Float32Array(NE); // edge midpoint → heart distance (set at resize)
    const frac = (v) => v - Math.floor(v);
    const hash = (x, y) => frac(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
    // — per-vertex character: a phase and amplitude for the surface's micro-shimmer
    //   (the metaball lobes carry the macro deformation) —
    const vph = new Float32Array(NV), vamp = new Float32Array(NV);
    const vpx = new Float32Array(NV), vpy = new Float32Array(NV); // canvas px (per frame)
    const vV = new Float32Array(NV); // the veil — per-vertex light dissolve (per frame)
    const vVm = new Float32Array(NV); // the mosaic's own gentler veil (wider band — no steps)
    const tArea = new Float32Array(T); // per-frame projected area — foreshortening damper
    const vlr = new Float32Array(NV), vlg = new Float32Array(NV), vlb = new Float32Array(NV);
    for (let i = 0; i < NV; i++) {
      const f1 = hash(n0x[i] * 91.7 + 3.1, n0y[i] * 77.3 + n0z[i] * 31.7);
      vph[i] = f1 * 6.283;
      vamp[i] = 0.006 + 0.008 * f1; // radial shimmer, fractions of R0
    }
    // — per-seam character: width + jitter; ehd = ANGULAR distance (1 − dot) from the
    //   seam's midpoint to the heart pole, in BODY space — constant forever —
    const ew = new Float32Array(NE), ej = new Float32Array(NE);
    for (let i = 0; i < NE; i++) {
      const f = hash(n0x[ea[i]] * 57.1 + 3.7, n0y[ebb[i]] * 43.3 + 9.1);
      ew[i] = 3.6 * (0.78 + 0.5 * f);
      ej[i] = 0.45 + 0.8 * f; // wide character spread — even inside lit weather, some seams stay dark
      let mx2 = (n0x[ea[i]] + n0x[ebb[i]]) / 2, my2 = (n0y[ea[i]] + n0y[ebb[i]]) / 2;
      let mz2 = (n0z[ea[i]] + n0z[ebb[i]]) / 2;
      const l = Math.hypot(mx2, my2, mz2) || 1;
      ehd[i] = 1 - (mx2 * h0x + my2 * h0y + mz2 * h0z) / l;
    }
    // — the light sprites: radial glows rastered ONCE (no per-frame gradients, no filters) —
    const mkGlow = (r, g2, b, px) => {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const cg = c.getContext('2d');
      const grd = cg.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      grd.addColorStop(0, 'rgba(' + r + ',' + g2 + ',' + b + ',0.5)');
      grd.addColorStop(0.42, 'rgba(' + r + ',' + g2 + ',' + b + ',0.16)');
      grd.addColorStop(1, 'rgba(' + r + ',' + g2 + ',' + b + ',0)');
      cg.fillStyle = grd;
      cg.fillRect(0, 0, px, px);
      return c;
    };
    // the three presences — lights that ORBIT the mass (unit directions, slow
    //   incommensurate paths). In front they pool on the surface; swinging BEHIND they are
    //   OCCLUDED — their light survives only as the flank seep (iridescent fringes bending
    //   around the unseen limb), then dies. W = angular width of the light's fall.
    const wisps = [
      { wr: 1, wg: 0.180, wb: 0.533, W: 0.42, I: 0.62, spr: mkGlow(255, 46, 136, 256) },
      { wr: 1, wg: 0.620, wb: 0.180, W: 0.36, I: 0.52, spr: mkGlow(255, 158, 46, 256) },
      { wr: 0.373, wg: 0.482, wb: 1, W: 0.46, I: 0.8, spr: mkGlow(95, 123, 255, 256) },
    ];
    const wx = new Float32Array(3), wy = new Float32Array(3), wz = new Float32Array(3);
    // the hand's light takes the room's hue — twelve stations along Clara's ramp
    const pspr = [];
    for (let i = 0; i < 12; i++) {
      const c = candyAt(i / 11);
      pspr.push(mkGlow(c[0] | 0, c[1] | 0, c[2] | 0, 256));
    }
    // the flank seep's spectra — eight thin-film stations, rastered once (the refraction
    // of an occluded light bending around the limb is drawn from these, never computed)
    const ispr = [];
    for (let i = 0; i < 8; i++) {
      const c = iridAt(i / 7);
      ispr.push(mkGlow(c[0] | 0, c[1] | 0, c[2] | 0, 192));
    }
    // — the motes: candy dust ORBITING the organism in tilted shells (each mote keeps an
    //   orthonormal basis u,w of its orbital plane; front/back split at draw time) —
    const NM = 64;
    const mux = new Float32Array(NM), muy = new Float32Array(NM), muz = new Float32Array(NM);
    const mwx = new Float32Array(NM), mwy = new Float32Array(NM), mwz = new Float32Array(NM);
    const mph = new Float32Array(NM), msp = new Float32Array(NM), msh = new Float32Array(NM);
    const mtw = new Float32Array(NM), msz = new Float32Array(NM);
    const mhue = new Uint8Array(NM);
    const mspr = [mkGlow(255, 92, 164, 40), mkGlow(255, 171, 77, 40), mkGlow(143, 163, 255, 40)];
    for (let i = 0; i < NM; i++) {
      const f = hash(i * 17.3 + 4.1, i * 9.7 + 1.3), f2 = hash(i * 5.9 + 8.8, i * 13.1 + 3.2);
      const f3 = hash(i * 7.7 + 2.9, i * 11.3 + 6.1);
      // a random orbital axis → u,w span its plane
      let axx = f - 0.5, axy = f2 - 0.5, axz = f3 - 0.5;
      let l = Math.hypot(axx, axy, axz) || 1;
      axx /= l; axy /= l; axz /= l;
      let ux2 = -axy, uy2 = axx, uz2 = 0;
      l = Math.hypot(ux2, uy2, uz2);
      if (l < 0.1) { ux2 = 1; uy2 = 0; uz2 = 0; l = 1; }
      ux2 /= l; uy2 /= l; uz2 /= l;
      mux[i] = ux2; muy[i] = uy2; muz[i] = uz2;
      mwx[i] = axy * uz2 - axz * uy2;
      mwy[i] = axz * ux2 - axx * uz2;
      mwz[i] = axx * uy2 - axy * ux2;
      mph[i] = f2 * 6.283;
      msp[i] = (0.000025 + f * 0.000035) * (f3 < 0.5 ? 1 : -1); // rad/ms, calm, both ways
      msh[i] = 1.1 + f * 0.55; // shell radius, ×R0
      mtw[i] = 0.0008 + f2 * 0.0009;
      msz[i] = 5 + f * 6; // px-ish at scale 1
      mhue[i] = i % 3;
    }
    // — THE KIN (v6.1): the room's company — three small distant bodies of the mass's
    //   own species, drifting in the deep BEHIND the protagonist. One shared low-res
    //   mesh (#hollow-kin-geo — icosphere ×1, 42 verts / 80 faces, the slot-in
    //   convention, docs/generators/hollow-kin.mjs seed 7); each instance wears it at
    //   its own window-fraction home, scale, drift, spin and hue. SUBORDINATION IS LAW:
    //   deeper tones, ~1/6 the protagonist's light, coloured halo only (the white-hot
    //   core is the protagonist's privilege), slower clocks, painted FIRST so the mass
    //   occludes them (depth by occlusion), veiled/hushed/feather-masked like all light. —
    let hk = null;
    const kgeoEl = document.getElementById('hollow-kin-geo');
    if (kgeoEl) {
      const kraw = (kgeoEl.getAttribute('data-verts') || '').trim().split(/\s+/).map(Number);
      const kpolys = kgeoEl.querySelectorAll('polygon');
      const KT = kpolys.length, KNV = (kraw.length / 3) | 0;
      if (KT && KNV) {
        const kx0 = new Float32Array(KNV), ky0 = new Float32Array(KNV), kz0 = new Float32Array(KNV);
        for (let i = 0; i < KNV; i++) {
          kx0[i] = kraw[i * 3]; ky0[i] = kraw[i * 3 + 1]; kz0[i] = kraw[i * 3 + 2];
        }
        const kti = new Uint16Array(KT * 3);
        const ktone = new Array(KT);
        for (let i = 0; i < KT; i++) {
          const pg = kpolys[i];
          const ix = (pg.getAttribute('data-i') || '0 0 0').split(' ');
          kti[i * 3] = +ix[0]; kti[i * 3 + 1] = +ix[1]; kti[i * 3 + 2] = +ix[2];
          const d = (pg.getAttribute('data-d') || '5 5 8').split(' ');
          ktone[i] = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
        }
        const kEdge = new Map();
        const keaA = [], kebA = [], ket1A = [], ket2A = [];
        for (let i = 0; i < KT; i++) {
          for (let e = 0; e < 3; e++) {
            const a = kti[i * 3 + e], b = kti[i * 3 + ((e + 1) % 3)];
            const kk = a < b ? a * 65536 + b : b * 65536 + a;
            let ei = kEdge.get(kk);
            if (ei === undefined) {
              ei = keaA.length;
              kEdge.set(kk, ei);
              keaA.push(a < b ? a : b);
              kebA.push(a < b ? b : a);
              ket1A.push(i);
              ket2A.push(-1);
            } else {
              ket2A[ei] = i;
            }
          }
        }
        // per-edge character — even inside a kin's lit pool some seams stay dark
        // (light as weather, never an even micro-wireframe)
        const kej = new Float32Array(keaA.length);
        for (let i = 0; i < kej.length; i++) {
          const fr = Math.sin(i * 12.9898 + 4.7) * 43758.5453;
          kej[i] = 0.3 + 0.9 * (fr - Math.floor(fr));
        }
        hk = {
          T: KT, NV: KNV, x0: kx0, y0: ky0, z0: kz0, ti: kti, tone: ktone,
          NE: keaA.length, kej,
          ea: Uint16Array.from(keaA), eb: Uint16Array.from(kebA),
          et1: Int16Array.from(ket1A), et2: Int16Array.from(ket2A),
          px: new Float32Array(KNV), py: new Float32Array(KNV),
          vv: new Float32Array(KNV),
          lr: new Float32Array(KNV), lg: new Float32Array(KNV), lb: new Float32Array(KNV),
          front: new Uint8Array(KT),
          // homes in WINDOW fractions; pux/puy are the PORTRAIT homes — a phone's mass
          // fills the width, so its kin keep to the clear top corners (the third stays
          // deep on the flank, emerging when the swell recedes; never simply empty)
          kin: [
            { ux: -0.72, uy: -0.56, pux: -0.75, puy: -0.88, f: 0.17, I: 0.19,
              ax: 0.5, ay: 0.7, az: 0.5, sp: 0.00006, ph: 1.1, dxp: 0.4, dyp: 2.2,
              la: 0.2, lb2: -0.14, hp: 0.05, hs: 0.000011 },
            { ux: 0.8, uy: -0.42, pux: 0.75, puy: -0.9, f: 0.13, I: 0.15,
              ax: -0.6, ay: 0.5, az: 0.62, sp: -0.00005, ph: 3.8, dxp: 2.9, dyp: 0.7,
              la: 0.16, lb2: -0.11, hp: 0.6, hs: 0.000009 },
            { ux: -0.56, uy: 0.3, pux: -0.82, puy: -0.45, f: 0.1, I: 0.115,
              ax: 0.2, ay: -0.75, az: 0.63, sp: 0.000045, ph: 5.2, dxp: 4.4, dyp: 3.4,
              la: 0.14, lb2: -0.1, hp: 0.85, hs: 0.000013 },
          ],
        };
        for (const kn of hk.kin) {
          const ln = Math.hypot(kn.ax, kn.ay, kn.az) || 1;
          kn.ax /= ln; kn.ay /= ln; kn.az /= ln;
        }
      }
    }
    const act = new Uint8Array(T), eact = new Uint8Array(NE);
    const tFront = new Uint8Array(T); // per-frame facing (screen-space winding)
    // the sparks — transient seam ignitions riding the ambient light (decayed per frame)
    const esprk = new Float32Array(NE);
    hf = {
      esprk, tFront, hk,
      hg, T, NV, NE, ti, tfillL, n0x, n0y, n0z, vph, vamp, vpx, vpy, vV, vVm, tArea,
      vlr, vlg, vlb, ea, eb: ebb, ew, ej, wisps, wx, wy, wz, pspr, ispr,
      NM, mux, muy, muz, mwx, mwy, mwz, mph, msp, msh, mtw, msz, mhue, mspr, act, eact,
      // the core's fabric — the surface's OWN adjacency and body state (no second mesh)
      et1, et2, tedge, tdx, tdy, tdz, h0x, h0y, h0z,
      tState, tBorn, tDepth, tMolt, tMoltW, tGlass, bodyList, vPull, vPullT, ehd,
      scale: 1, ox: 0, oy: 0, dpr: 1, coreW: 1,
      cX: 800, cY: 500, aX: 800, aY: 500,
      sX: 800, sY: 360, R0: 250, // the organism's screen seat + radius (set at resize)
    };
    hfResize();
  };

  const hfResize = () => {
    if (!hf) return;
    const w = innerWidth, h = innerHeight;
    hf.dpr = Math.min(devicePixelRatio || 1, 1.5);
    fieldCanvas.width = Math.round(w * hf.dpr);
    fieldCanvas.height = Math.round(h * hf.dpr);
    // the abstract 1600×1000 stage remains the unit frame for screen math (cover-fit)
    hf.scale = Math.max(fieldCanvas.width / 1600, fieldCanvas.height / 1000);
    hf.ox = (fieldCanvas.width - 1600 * hf.scale) / 2;
    hf.oy = (fieldCanvas.height - 1000 * hf.scale) / 2;
    hf.coreW = Math.max(1, 1.25 * hf.dpr);
    hf.cX = (fieldCanvas.width / 2 - hf.ox) / hf.scale;
    hf.cY = (fieldCanvas.height / 2 - hf.oy) / hf.scale;
    hf.aX = fieldCanvas.width / 2 / hf.scale;
    hf.aY = fieldCanvas.height / 2 / hf.scale;
    // the mass's seat: upper centre, the words keep the lower band
    hf.sX = hf.cX;
    hf.sY = hf.cY - hf.aY * 0.34;
    // imposing: the mass fills most of the frame and EXCEEDS it at its widest swells —
    // the veil (angular + screen-edge) dissolves it into the dark long before any
    // boundary could read; the words keep the lower band under the hush
    hf.R0 = Math.min(hf.aX * 1.28, hf.aY * 0.85);
    hf.act.fill(1); // facing is per-frame now — no viewport cull exists on a sphere
    hf.eact.fill(1);
    // the feather — four eased void-black gradients, baked per resize, composited
    // over the FINISHED frame: strokes and sprites that cross the border (a stroke's
    // alpha is uniform along its length — the per-vertex falloff cannot save it)
    // still dissolve into the room's black before the straight canvas edge
    const fW = fieldCanvas.width, fH = fieldCanvas.height;
    hf.fE = 0.1 * (fW < fH ? fW : fH);
    const mkFade = (x0, y0, x1, y1) => {
      const gr = hf.hg.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(2,2,2,1)');
      gr.addColorStop(0.35, 'rgba(2,2,2,0.62)');
      gr.addColorStop(0.7, 'rgba(2,2,2,0.18)');
      gr.addColorStop(1, 'rgba(2,2,2,0)');
      return gr;
    };
    hf.fadeT = mkFade(0, 0, 0, hf.fE);
    hf.fadeB = mkFade(0, fH, 0, fH - hf.fE);
    hf.fadeL = mkFade(0, 0, hf.fE, 0);
    hf.fadeR = mkFade(fW, 0, fW - hf.fE, 0);
  };

  const foldT = (u) => {
    u = u - Math.floor(u / 2) * 2;
    return u > 1 ? 2 - u : u;
  };

  // ── the kin — the deep's company, one frame (called FIRST from hfDraw: everything
  //    else paints over them; the mass occludes them as it swells — depth by occlusion).
  //    Their laws are the mass's own at a whisper: angular veil (extinction before their
  //    little limb), dispersion in the dissolve, hush near the words, the feather at the
  //    frame; light is one wandering hue pool + late wave-kinship (the room's rings reach
  //    the deep ~half a second after the room) + a faint graze when a presence's glow
  //    drifts near. Coloured halo only — no white core, no wash: they never compete. ────
  const hkDraw = (g2, now, still, wt, al, br, sc) => {
    const hk = hf.hk;
    if (!hk) return;
    const mn = hf.aX < hf.aY ? hf.aX : hf.aY;
    g2.lineCap = 'round';
    const portrait = hf.aX < hf.aY * 0.72; // the phone's mass fills the width
    for (let ki = 0; ki < hk.kin.length; ki++) {
      const kn = hk.kin[ki];
      // the seat — window-fraction home + slow deep drift (frozen composed under RM)
      const hux = portrait ? kn.pux : kn.ux, huy = portrait ? kn.puy : kn.uy;
      const kx = hf.cX + hux * hf.aX + 0.05 * hf.aX * Math.sin(wt * 0.0000137 + kn.dxp);
      const ky = hf.cY + huy * hf.aY + 0.04 * hf.aY * Math.sin(wt * 0.0000101 + kn.dyp);
      const Rk = kn.f * mn;
      // late kinship — the room's waves reach the deep after the room has heard them
      let flash = 0;
      if (!still) {
        for (let v = 0; v < wvN; v++) {
          const ka = (now - wvT0[v] - 480 - ki * 260) / 1900;
          if (ka > 0 && ka < 1) flash += Math.sin(3.14159 * ka) * wvAmp[v] * 0.3;
        }
        if (flash > 0.5) flash = 0.5;
      }
      // the pool — one dim hue wandering the little body, FRONT-BIASED (the visitor's
      // side is never left black-on-black for long; the far side stays the dark's)
      const pph = still ? kn.ph : wt * 0.00004 + kn.ph;
      let pdx = Math.sin(pph), pdy = Math.sin(pph * 0.63 + 1.3) * 0.7;
      let pdz = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(pph * 0.81));
      let ln = Math.hypot(pdx, pdy, pdz) || 1;
      pdx /= ln; pdy /= ln; pdz /= ln;
      const pc2 = candyAt(foldT(kn.hp + wt * kn.hs));
      const pr2 = pc2[0] / 255, pg3 = pc2[1] / 255, pb2 = pc2[2] / 255;
      // a presence grazing the deep — its glow tints the near kin faintly
      let gzr = 0, gzg = 0, gzb = 0;
      for (let k2 = 0; k2 < 3; k2++) {
        if (hf.wz[k2] < -0.05) continue;
        const dxp = hf.sX + hf.wx[k2] * hf.R0 * 1.06 - kx;
        const dyp = hf.sY + hf.wy[k2] * hf.R0 * 1.06 - ky;
        const dd2 = Math.hypot(dxp, dyp);
        const gr2 = hf.R0 * 0.85;
        if (dd2 < gr2) {
          const q = (1 - dd2 / gr2) * (1 - dd2 / gr2) * 0.5;
          const wk2 = hf.wisps[k2];
          gzr += q * wk2.wr; gzg += q * wk2.wg; gzb += q * wk2.wb;
        }
      }
      // the kin's own geologic spin + two slow lobes — evolving like its kind, slower
      const th2 = (still ? 0 : wt * kn.sp) + kn.ph;
      const ct2 = Math.cos(th2), st2 = Math.sin(th2), om2 = 1 - ct2;
      const x2 = kn.ax, y2 = kn.ay, z2 = kn.az;
      const b00 = ct2 + x2 * x2 * om2, b01 = x2 * y2 * om2 - z2 * st2;
      const b02 = x2 * z2 * om2 + y2 * st2;
      const b10 = y2 * x2 * om2 + z2 * st2, b11 = ct2 + y2 * y2 * om2;
      const b12 = y2 * z2 * om2 - x2 * st2;
      const b20 = z2 * x2 * om2 - y2 * st2, b21 = z2 * y2 * om2 + x2 * st2;
      const b22 = ct2 + z2 * z2 * om2;
      let l1x = Math.sin(wt * 0.000021 + kn.dxp), l1y = Math.cos(wt * 0.000017 + kn.dyp);
      let l1z = Math.sin(wt * 0.000013 + kn.ph);
      ln = Math.hypot(l1x, l1y, l1z) || 1;
      l1x /= ln; l1y /= ln; l1z /= ln;
      let l2x = Math.cos(wt * 0.000015 + kn.dyp), l2y = Math.sin(wt * 0.000019 + kn.ph);
      let l2z = Math.cos(wt * 0.000023 + kn.dxp);
      ln = Math.hypot(l2x, l2y, l2z) || 1;
      l2x /= ln; l2y /= ln; l2z /= ln;
      const kI = kn.I * (1 + flash * 2.2) * al * br;
      for (let i = 0; i < hk.NV; i++) {
        const nx = b00 * hk.x0[i] + b01 * hk.y0[i] + b02 * hk.z0[i];
        const ny = b10 * hk.x0[i] + b11 * hk.y0[i] + b12 * hk.z0[i];
        const nz = b20 * hk.x0[i] + b21 * hk.y0[i] + b22 * hk.z0[i];
        let rr = 1;
        let dq = nx * l1x + ny * l1y + nz * l1z;
        if (dq > 0) { dq *= dq; rr += kn.la * dq * dq; }
        dq = nx * l2x + ny * l2y + nz * l2z;
        if (dq > 0) { rr += kn.lb2 * dq * dq; }
        if (rr > 1.3) rr = 1.3; else if (rr < 0.78) rr = 0.78;
        hk.px[i] = (kx + nx * Rk * rr) * sc + hf.ox;
        hk.py[i] = (ky + ny * Rk * rr) * sc + hf.oy;
        // the kin's veil — extinction before its little limb, lightly warped
        let vv = (nz - (0.34 + 0.1 * Math.sin(nx * 2.5 + ny * 2.1 + wt * 0.00003 + kn.ph))) / 0.38;
        vv = vv < 0 ? 0 : vv > 1 ? 1 : vv;
        vv = vv * vv * (3 - 2 * vv);
        hk.vv[i] = vv;
        let lr2 = 0, lg2 = 0, lb3 = 0;
        const pd2 = nx * pdx + ny * pdy + nz * pdz;
        let q2 = 1 - (1 - pd2) / 0.4;
        if (q2 > 0) {
          const s3 = kI * q2 * q2;
          lr2 = s3 * pr2; lg2 = s3 * pg3; lb3 = s3 * pb2;
        }
        if (flash > 0.01) {
          lr2 += flash * 0.16 * pr2; lg2 += flash * 0.16 * pg3; lb3 += flash * 0.16 * pb2;
        }
        if (gzr + gzg + gzb > 0.002) {
          lr2 += gzr * 0.12 * al; lg2 += gzg * 0.12 * al; lb3 += gzb * 0.12 * al;
        }
        // the kin's dissolve refracts too — the family's thin-film, at a whisper
        if (vv < 0.98) {
          const mx2 = lr2 > lg2 ? (lr2 > lb3 ? lr2 : lb3) : (lg2 > lb3 ? lg2 : lb3);
          if (mx2 > 0.003) {
            const ir2 = iridAt(foldT(nx * 0.3 + ny * 0.25 + wt * 0.00004 + kn.hp));
            const mk2 = 0.7 * (1 - vv);
            lr2 += (mx2 * (ir2[0] / 255) - lr2) * mk2;
            lg2 += (mx2 * (ir2[1] / 255) - lg2) * mk2;
            lb3 += (mx2 * (ir2[2] / 255) - lb3) * mk2;
          }
        }
        const lf2 = (0.5 + 0.5 * (nz < 0 ? 0 : nz)) * vv;
        hk.lr[i] = lr2 * lf2; hk.lg[i] = lg2 * lf2; hk.lb[i] = lb3 * lf2;
      }
      // facing + fills — alpha-sunk against the pure void (the mosaic dissolves; the
      // kin paint before everything, so the ground beneath them is always the void)
      g2.globalCompositeOperation = 'source-over';
      for (let t = 0; t < hk.T; t++) {
        const a = hk.ti[t * 3], b3 = hk.ti[t * 3 + 1], c3 = hk.ti[t * 3 + 2];
        const cr2 = (hk.px[b3] - hk.px[a]) * (hk.py[c3] - hk.py[a]) -
          (hk.py[b3] - hk.py[a]) * (hk.px[c3] - hk.px[a]);
        if (cr2 <= 0) { hk.front[t] = 0; continue; }
        hk.front[t] = 1;
        const vmA = (hk.vv[a] + hk.vv[b3] + hk.vv[c3]) * 0.3333;
        if (vmA < 0.03) continue;
        g2.globalAlpha = vmA;
        g2.fillStyle = hk.tone[t];
        g2.beginPath();
        g2.moveTo(hk.px[a], hk.py[a]);
        g2.lineTo(hk.px[b3], hk.py[b3]);
        g2.lineTo(hk.px[c3], hk.py[c3]);
        g2.closePath();
        g2.fill();
      }
      g2.globalAlpha = 1;
      // seams — coloured halo ONLY (the white-hot core is the protagonist's privilege)
      g2.globalCompositeOperation = 'lighter';
      for (let e = 0; e < hk.NE; e++) {
        const q1 = hk.et1[e], q2e = hk.et2[e];
        if (!hk.front[q1] || q2e < 0 || !hk.front[q2e]) continue;
        const a = hk.ea[e], b3 = hk.eb[e];
        const r3 = (hk.lr[a] + hk.lr[b3]) * 0.5;
        const g3 = (hk.lg[a] + hk.lg[b3]) * 0.5;
        const b4 = (hk.lb[a] + hk.lb[b3]) * 0.5;
        const m3 = r3 > g3 ? (r3 > b4 ? r3 : b4) : (g3 > b4 ? g3 : b4);
        if (m3 < 0.02) continue;
        const hsh = hushAt((hk.px[a] - hf.ox) / sc, (hk.py[a] - hf.oy) / sc);
        // per-edge character × the kinship flash (the room's ring, heard late, is
        // allowed to be SEEN — briefly, still far beneath the protagonist)
        let a3 = m3 * 1.5 * hsh * hk.kej[e] * (1 + 2.5 * flash);
        if (a3 > 0.24) a3 = 0.24;
        if (a3 < 0.015) continue;
        const inv2 = 255 / m3;
        g2.globalAlpha = a3;
        g2.lineWidth = Math.max(1, 1.7 * sc);
        g2.strokeStyle = 'rgb(' + ((r3 * inv2) | 0) + ',' + ((g3 * inv2) | 0) + ',' +
          ((b4 * inv2) | 0) + ')';
        g2.beginPath();
        g2.moveTo(hk.px[a], hk.py[a]);
        g2.lineTo(hk.px[b3], hk.py[b3]);
        g2.stroke();
      }
      g2.globalCompositeOperation = 'source-over';
      g2.globalAlpha = 1;
    }
    g2.lineWidth = 1;
  };

  // ── one frame of the MASS — still=true paints the composed reduced-motion state ──────────
  // The room's presence is one evolving, deeply-warped volumetric mass (v6): the jittered
  // icosphere, deformed per frame by slow deep metaball lobes + breath + the hand's bump +
  // the body's raised crust, rotated about an axis tilted toward the visitor (the heart
  // pole rides the axis), projected with gentle perspective. Facing is ONE screen-space
  // cross per face — a cull only, NEVER a drawn silhouette. All light is angular (dot
  // products on world normals) and every boundary is THE VEIL: light and mosaic dissolve
  // to the void's own black before the geometric limb (noise-warped, breathing) and
  // before the screen edge, while the thin-film ramp shears the dying light's colour —
  // the dissolve is a prism zone, the roundness is felt, the outline is never seen.
  const hM = new Float32Array(9); // this frame's rotation (shared with event-time code)
  let hDirWx = 0, hDirWy = -0.2, hDirWz = 0.98; // the heart pole, world (per frame)
  const PD = [0, 0, 1]; // scratch — the hand's surface direction (presDirInto fills it)
  const presDirInto = (out) => {
    // the damped cursor maps to the nearest surface point (or clamps to the rim)
    const R0 = hf.R0;
    let dx = (hpX - hf.sX) / R0, dy = (hpY - hf.sY) / R0;
    const r2 = dx * dx + dy * dy;
    if (r2 < 0.99) {
      out[0] = dx; out[1] = dy; out[2] = Math.sqrt(1 - r2);
    } else {
      const l = Math.sqrt(r2) || 1;
      out[0] = (dx / l) * 0.995; out[1] = (dy / l) * 0.995; out[2] = 0.0999;
    }
  };
  const hfDraw = (now, still) => {
    if (!hf) return;
    const g2 = hf.hg, sc = hf.scale;
    const al = still ? 1 : sstep((now - hfT0) / 2000); // the room WAKES over first breaths
    const br = still ? 1 : 1 + 0.15 * Math.sin(now * 0.00058); // the global breath (~10.8s)
    const wt = still ? 0 : now;
    const R0 = hf.R0;
    // — the rotation: slow turn + gentle axis precession + a lean toward the hand —
    const ax0 = 0.3 + 0.1 * Math.sin(wt * 0.000025);
    const ay0 = -0.25 + 0.1 * Math.cos(wt * 0.00002);
    let l = Math.hypot(ax0, ay0, 0.92);
    const axx = ax0 / l, axy = ay0 / l, axz = 0.92 / l;
    const th = wt * 0.00012 + 0.55; // geologic — ~1 revolution / 9 minutes
    const ct = Math.cos(th), st = Math.sin(th), omc = 1 - ct;
    const m00 = ct + axx * axx * omc, m01 = axx * axy * omc - axz * st, m02 = axx * axz * omc + axy * st;
    const m10 = axy * axx * omc + axz * st, m11 = ct + axy * axy * omc, m12 = axy * axz * omc - axx * st;
    const m20 = axz * axx * omc - axy * st, m21 = axz * axy * omc + axx * st, m22 = ct + axz * axz * omc;
    const rx = hLeanY * 0.08, ry = hLeanX * 0.1; // the body tips a few degrees to the hand
    const cyr = Math.cos(ry), syr = Math.sin(ry), cxr = Math.cos(rx), sxr = Math.sin(rx);
    const l00 = cyr, l01 = 0, l02 = syr;
    const l10 = sxr * syr, l11 = cxr, l12 = -sxr * cyr;
    const l20 = -cxr * syr, l21 = sxr, l22 = cxr * cyr;
    const a00 = l00 * m00 + l02 * m20, a01 = l00 * m01 + l02 * m21, a02 = l00 * m02 + l02 * m22;
    const a10 = l10 * m00 + l11 * m10 + l12 * m20, a11 = l10 * m01 + l11 * m11 + l12 * m21, a12 = l10 * m02 + l11 * m12 + l12 * m22;
    const a20 = l20 * m00 + l21 * m10 + l22 * m20, a21 = l20 * m01 + l21 * m11 + l22 * m21, a22 = l20 * m02 + l21 * m12 + l22 * m22;
    hM[0] = a00; hM[1] = a01; hM[2] = a02;
    hM[3] = a10; hM[4] = a11; hM[5] = a12;
    hM[6] = a20; hM[7] = a21; hM[8] = a22;
    hDirWx = a00 * hf.h0x + a01 * hf.h0y + a02 * hf.h0z;
    hDirWy = a10 * hf.h0x + a11 * hf.h0y + a12 * hf.h0z;
    hDirWz = a20 * hf.h0x + a21 * hf.h0y + a22 * hf.h0z;
    // — the metaball lobes: slow deep swells + one broad asymmetric rise + one DENT —
    //   amplitudes far past sphere-nature (±½ R0 between swell and hollow): the outline,
    //   were it visible, is lobed and never rests; the mass evolves over tens of seconds
    let lx1 = Math.sin(wt * 0.00004 + 1.2), ly1 = Math.cos(wt * 0.000034 + 0.4), lz1 = Math.sin(wt * 0.000027 + 2.6);
    let lx2 = Math.cos(wt * 0.00003 + 4.0), ly2 = Math.sin(wt * 0.000045 + 1.9), lz2 = Math.cos(wt * 0.000023 + 0.7);
    let lx3 = Math.sin(wt * 0.000022 + 3.3), ly3 = Math.sin(wt * 0.000038 + 5.1), lz3 = Math.cos(wt * 0.000042 + 1.5);
    let lx4 = Math.sin(wt * 0.000016 + 0.9), ly4 = Math.cos(wt * 0.000019 + 3.6), lz4 = Math.sin(wt * 0.000013 + 5.4);
    let lx5 = Math.cos(wt * 0.000026 + 2.2), ly5 = Math.sin(wt * 0.000017 + 4.4), lz5 = Math.cos(wt * 0.000031 + 1.1);
    l = Math.hypot(lx1, ly1, lz1) || 1; lx1 /= l; ly1 /= l; lz1 /= l;
    l = Math.hypot(lx2, ly2, lz2) || 1; lx2 /= l; ly2 /= l; lz2 /= l;
    l = Math.hypot(lx3, ly3, lz3) || 1; lx3 /= l; ly3 /= l; lz3 /= l;
    l = Math.hypot(lx4, ly4, lz4) || 1; lx4 /= l; ly4 /= l; lz4 /= l;
    l = Math.hypot(lx5, ly5, lz5) || 1; lx5 /= l; ly5 /= l; lz5 /= l;
    const A1 = 0.26 * (0.55 + 0.45 * Math.sin(wt * 0.00005));
    const A2 = 0.22 * (0.55 + 0.45 * Math.cos(wt * 0.000065));
    const A3 = 0.16;
    const A4 = 0.32 * (0.5 + 0.5 * Math.sin(wt * 0.00003 + 2)); // the broad rise
    const A5 = -0.2; // the dent — the mass is not a ball
    // — the hand's surface direction (damped screen point → sphere) —
    presDirInto(PD);
    const presDx = PD[0], presDy = PD[1], presDz = PD[2];
    // — the presences: unit dirs orbiting the body (rest stations under RM) —
    if (still) {
      hf.wx[0] = -0.62; hf.wy[0] = -0.35; hf.wz[0] = 0.7;
      hf.wx[1] = 0.7; hf.wy[1] = 0.25; hf.wz[1] = 0.66;
      hf.wx[2] = -0.05; hf.wy[2] = 0.75; hf.wz[2] = 0.65;
      for (let k = 0; k < 3; k++) {
        const wl = Math.hypot(hf.wx[k], hf.wy[k], hf.wz[k]) || 1;
        hf.wx[k] /= wl; hf.wy[k] /= wl; hf.wz[k] /= wl;
      }
    } else {
      for (let k = 0; k < 3; k++) {
        const sp1 = k === 0 ? 0.00019 : k === 1 ? 0.00015 : 0.00017;
        const sp2 = k === 0 ? 0.000245 : k === 1 ? 0.00021 : 0.00014;
        const ph = k === 0 ? 0.7 : k === 1 ? 3.9 : 1.9;
        hf.wx[k] = Math.sin(now * sp1 + ph);
        hf.wy[k] = Math.sin(now * sp2 + ph * 2.1) * 0.85;
        hf.wz[k] = Math.cos(now * sp1 + ph);
        if (hGather > 0.001) {
          // a held press GATHERS the presences toward the hand's surface point
          hf.wx[k] += hGather * (presDx - hf.wx[k]);
          hf.wy[k] += hGather * (presDy - hf.wy[k]);
          hf.wz[k] += hGather * (presDz - hf.wz[k]);
        }
        const wl = Math.hypot(hf.wx[k], hf.wy[k], hf.wz[k]) || 1;
        hf.wx[k] /= wl; hf.wy[k] /= wl; hf.wz[k] /= wl;
      }
    }
    // presence light colour — the room's hue at this hour (one sample, the CC scratch)
    const pht = foldT(now * 0.000021 + hpX * 0.0005);
    const pc = candyAt(pht);
    const pcr = pc[0] / 255, pcg = pc[1] / 255, pcb = pc[2] / 255;
    // the heart as a light source — the body's own hour on its own surface
    let hcr = 0, hcg = 0, hcb = 0, heartI = 0, eraT = 0.06;
    if (bodyN) {
      eraT = still ? 0.06 : foldT((now - coreBorn) * 0.000019 + 0.03);
      const hc = candyAt(eraT);
      hcr = hc[0] / 255; hcg = hc[1] / 255; hcb = hc[2] / 255;
      heartI = (0.16 + 0.3 * (bodyN / KB) + 0.3 * coreFlare) * al;
    }
    const presI = still ? hRmPress : hpI;
    const presW = 0.3 * (1 + 0.35 * hCharge);
    const presIk = (0.55 + 0.6 * hCharge) * presI * al;
    const bumpK = 0.08 * (1 + 1.1 * hCharge) * (still ? hRmPress : Math.max(presI, 0.001));
    const kP = 1 / (3.4 * R0);
    const shim = wt * 0.0007;
    // the veil's screen frame — where the mass exceeds the window, its light dies across
    // a warped falloff well inside the canvas edge (never a straight cut of anything)
    const vgW = fieldCanvas.width, vgH = fieldCanvas.height;
    const vgE = 0.12 * (vgW < vgH ? vgW : vgH);
    // per-wave invariants — waves live in ANGULAR (1−dot) space on the surface
    for (let v = 0; v < wvN; v++) {
      const age = (now - wvT0[v]) / 1700;
      wvSig[v] = 0.07 + 0.08 * age; // a narrower crest — the travelling ring READS
      wvRad[v] = age * 2.3;
      wvEnv[v] = age < 1 ? Math.pow(1 - age, 1.8) * wvAmp[v] * 1.2 : 0;
    }
    // — the vertex pass: rotate, deform, project; then gather every light —
    for (let i = 0; i < hf.NV; i++) {
      const bx0 = hf.n0x[i], by0 = hf.n0y[i], bz0 = hf.n0z[i];
      const nx = a00 * bx0 + a01 * by0 + a02 * bz0;
      const ny = a10 * bx0 + a11 * by0 + a12 * bz0;
      const nz = a20 * bx0 + a21 * by0 + a22 * bz0;
      let rr = 1 + (still ? 0 : 0.012 * Math.sin(wt * 0.00028));
      let d = nx * lx1 + ny * ly1 + nz * lz1;
      if (d > 0) { d *= d; rr += A1 * d * d; }
      d = nx * lx2 + ny * ly2 + nz * lz2;
      if (d > 0) { d *= d; rr += A2 * d * d; }
      d = nx * lx3 + ny * ly3 + nz * lz3;
      if (d > 0) { d *= d; d *= d; rr += A3 * d * d; } // sharper knob
      d = nx * lx4 + ny * ly4 + nz * lz4;
      if (d > 0) { rr += A4 * d * d; } // broad
      d = nx * lx5 + ny * ly5 + nz * lz5;
      if (d > 0) { d *= d; rr += A5 * d * d; } // the dent
      if (rr > 1.32) rr = 1.32; else if (rr < 0.8) rr = 0.8;
      if (!still) rr += hf.vamp[i] * Math.sin(shim + hf.vph[i]);
      if (bumpK > 0.002) {
        const pd = nx * presDx + ny * presDy + nz * presDz;
        if (pd > 0.55) {
          const q = (pd - 0.55) / 0.45;
          rr += bumpK * q * q; // the surface RISES where you look
        }
      }
      const pl = hf.vPull[i];
      if (pl > 0.004) rr += pl * 0.05; // the body's raised crust
      const R = R0 * rr;
      const persp = 1 / (1 - nz * R * kP);
      hf.vpx[i] = (hf.sX + nx * R * persp) * sc + hf.ox;
      hf.vpy[i] = (hf.sY + ny * R * persp) * sc + hf.oy;
      let lr = 0, lg = 0, lb = 0;
      for (let k = 0; k < 3; k++) {
        const wk = hf.wisps[k];
        const dd = nx * hf.wx[k] + ny * hf.wy[k] + nz * hf.wz[k];
        const qq = 1 - (1 - dd) / wk.W;
        if (qq > 0) {
          // the composed still frame carries all three pools at once — dimmed a shade
          // there, so the resting union of light never re-tiles the ball
          const s2 = wk.I * (still ? 0.72 : 1) * qq * qq * br * al;
          lr += s2 * wk.wr; lg += s2 * wk.wg; lb += s2 * wk.wb;
        }
      }
      if (presIk > 0.01) {
        const dd = nx * presDx + ny * presDy + nz * presDz;
        const qq = 1 - (1 - dd) / presW;
        if (qq > 0) {
          const s2 = presIk * qq * qq;
          lr += s2 * pcr; lg += s2 * pcg; lb += s2 * pcb;
        }
      }
      for (let v = 0; v < wvN; v++) {
        if (wvEnv[v] <= 0) continue;
        const ad = 1 - (nx * wvX[v] + ny * wvY[v] + nz * wvZ[v]);
        let q = (ad - wvRad[v]) / wvSig[v];
        if (q > -1 && q < 1) {
          q = 1 - q * q;
          q *= q;
          const env = wvEnv[v] * q;
          const c = candyAt(foldT(ad * 0.8 + wvHue[v]));
          lr += env * (c[0] / 255); lg += env * (c[1] / 255); lb += env * (c[2] / 255);
        }
      }
      if (heartI > 0.01) {
        const dd = nx * hDirWx + ny * hDirWy + nz * hDirWz;
        const qq = 1 - (1 - dd) / 0.38;
        if (qq > 0) {
          const s2 = heartI * qq * qq;
          lr += s2 * hcr; lg += s2 * hcg; lb += s2 * hcb;
        }
      }
      // the luminous air — sparse aurora pools drifting over the surface, with deep
      // troughs of true dark between them (the mass is dark; light is weather; the
      // cubed profile keeps dark continents standing even in a hot late state)
      const ambN = Math.sin(nx * 3.1 + wt * 0.0001 + 1.2) *
        Math.sin(ny * 2.7 - wt * 0.00007 + 0.5);
      const ambQ = 0.5 + 0.5 * ambN;
      let amb = (0.01 + 0.08 * ambQ * ambQ * ambQ) * br * al;
      if (pl > 0.02) amb *= Math.max(0.12, 1 - pl * 1.5); // the air stays out of the body
      const ca2 = candyAt(foldT(nx * 0.3 + ny * 0.22 + wt * 0.000018));
      lr += amb * (ca2[0] / 255); lg += amb * (ca2[1] / 255); lb += amb * (ca2[2] / 255);
      // — THE VEIL: every boundary dissolves. The angular falloff extinguishes all light
      //   strictly BEFORE the geometric limb (nz reaches 0 only inside total darkness),
      //   its threshold and width bent by slow travelling noise so the dying line is
      //   never a circle and never rests; the screen-edge falloff does the same where
      //   the mass exceeds the frame. The mosaic fill sinks by the same law (vV). —
      const nv1 = Math.sin(nx * 2.9 + wt * 0.00005 + 1.7) *
        Math.sin(ny * 3.3 - wt * 0.000038 + 0.6);
      const nv2 = Math.sin((nx - ny) * 3.4 + wt * 0.000027 + 3.2);
      // deep: extinction lands at nz 0.28–0.68 (projected, the dissolve BITES to ~0.73·R
      // at its deepest and never survives past ~0.96·R) — the die-line is a wandering
      // coast, never a circle, and the geometric limb sits far inside the dark. The
      // width is capped so the mass's heart always clears the veil.
      const t0v = 0.48 + 0.2 * nv1;
      let wv2 = 0.34 + 0.1 * nv2;
      if (wv2 > 1 - t0v) wv2 = 1 - t0v;
      let v0 = (nz - t0v) / wv2;
      v0 = v0 < 0 ? 0 : v0 > 1 ? 1 : v0;
      v0 = v0 * v0 * (3 - 2 * v0);
      // the mosaic's own veil — same coast, a wider gentler band, so the dark facet
      // tones sink to the void across several facet rings and no tone-step can print
      let vm = (nz - (t0v - 0.08)) / (wv2 + 0.28);
      vm = vm < 0 ? 0 : vm > 1 ? 1 : vm;
      vm = vm * vm * (3 - 2 * vm);
      // the screen-edge falloff, warped per vertex so no straight edge can print
      // (the feather mask at the end of the frame catches strokes and sprites that
      // cross the border — this per-vertex falloff does the organic first pass)
      const ew2 = vgE * (0.75 + 0.35 * Math.sin(hf.vph[i] + wt * 0.00006));
      const pxi = hf.vpx[i], pyi = hf.vpy[i];
      let evg = (pxi < vgW - pxi ? pxi : vgW - pxi);
      const evy = (pyi < vgH - pyi ? pyi : vgH - pyi);
      if (evy < evg) evg = evy;
      evg /= ew2;
      evg = evg < 0 ? 0 : evg > 1 ? 1 : evg;
      evg = evg * evg * (3 - 2 * evg);
      // the dispersion — light entering EITHER dissolve (angular or screen-edge)
      // REFRACTS: its colour shears along the thin-film ramp (the hero blob's own
      // spectrum) as it dims. Optical warp, never a drawn rim: a broad soft prism
      // zone riding every boundary of the mass.
      const vd = v0 * evg;
      if (vd < 0.98) {
        const m2f = lr > lg ? (lr > lb ? lr : lb) : (lg > lb ? lg : lb);
        if (m2f > 0.004) {
          const ir = iridAt(foldT(nx * 0.31 + ny * 0.24 + wt * 0.000055));
          const mixK = 0.8 * (1 - vd);
          lr += (m2f * (ir[0] / 255) - lr) * mixK;
          lg += (m2f * (ir[1] / 255) - lg) * mixK;
          lb += (m2f * (ir[2] / 255) - lb) * mixK;
        }
      }
      hf.vV[i] = vd;
      hf.vVm[i] = vm * evg;
      // gentle volume modelling (front faces a touch brighter) × the veil
      const lf = (0.45 + 0.55 * (nz < 0 ? 0 : nz > 1 ? 1 : nz)) * vd;
      lr *= lf; lg *= lf; lb *= lf;
      if (hHon) {
        // the hush under the words (screen-space, unchanged law)
        const sxf = (hf.vpx[i] - hf.ox) / sc, syf = (hf.vpy[i] - hf.oy) / sc;
        const hx = sxf < hHx0 ? hHx0 - sxf : sxf > hHx1 ? sxf - hHx1 : 0;
        const hy = syf < hHy0 ? hHy0 - syf : syf > hHy1 ? syf - hHy1 : 0;
        const hd = hx > hy ? hx : hy;
        if (hd < 180) {
          let hq = hd / 180;
          hq = hq * hq * (3 - 2 * hq);
          const hu = 0.28 + 0.72 * hq;
          lr *= hu; lg *= hu; lb *= hu;
        }
      }
      hf.vlr[i] = lr; hf.vlg[i] = lg; hf.vlb[i] = lb;
    }
    // — facing: one screen-space cross per face; silhouette edges fall out for free —
    for (let t = 0; t < hf.T; t++) {
      const a = hf.ti[t * 3], b = hf.ti[t * 3 + 1], c = hf.ti[t * 3 + 2];
      const cross = (hf.vpx[b] - hf.vpx[a]) * (hf.vpy[c] - hf.vpy[a]) -
        (hf.vpy[b] - hf.vpy[a]) * (hf.vpx[c] - hf.vpx[a]);
      hf.tFront[t] = cross > 0 ? 1 : 0;
      hf.tArea[t] = cross > 0 ? cross : -cross;
    }
    // — paint. The void, the far dust and far presences, then the body —
    g2.globalCompositeOperation = 'source-over';
    g2.globalAlpha = 1;
    g2.fillStyle = '#020202';
    g2.fillRect(0, 0, fieldCanvas.width, fieldCanvas.height);
    // the kin first — the deep's company; everything after paints over them
    hkDraw(g2, now, still, wt, al, br, sc);
    g2.globalCompositeOperation = 'lighter';
    // dust + presences BEHIND the limb (z < 0), dimmed — the body occludes them
    for (let i = 0; i < hf.NM; i++) {
      const ph = hf.mph[i];
      const cph = Math.cos(ph), sph = Math.sin(ph);
      const px3 = (hf.mux[i] * cph + hf.mwx[i] * sph) * hf.msh[i];
      const py3 = (hf.muy[i] * cph + hf.mwy[i] * sph) * hf.msh[i];
      const pz3 = (hf.muz[i] * cph + hf.mwz[i] * sph) * hf.msh[i];
      if (pz3 >= 0) continue;
      const persp = 1 / (1 - pz3 * R0 * kP);
      const sx = (hf.sX + px3 * R0 * persp) * sc + hf.ox;
      const sy = (hf.sY + py3 * R0 * persp) * sc + hf.oy;
      const tw = still ? 0.5 : 0.5 + 0.5 * Math.sin(now * hf.mtw[i] + ph * 3.1);
      g2.globalAlpha = (0.05 + 0.22 * tw * tw) * al;
      const s2 = hf.msz[i] * sc * persp;
      g2.drawImage(hf.mspr[hf.mhue[i]], sx - s2 / 2, sy - s2 / 2, s2, s2);
    }
    // (a presence swinging behind the mass is OCCLUDED — no light is painted through;
    //  its refracted flank seep is drawn after the body, with the front sprites)
    // the mass's facets — front faces only, each fill picked from its pre-baked
    // void→tone steps by the mosaic veil at its corners: the mosaic itself dissolves
    // into the room's black at every boundary. Recruited facets wear the era's glass —
    // faded by the SAME veil (the body may ride the pole into the coast; its paint
    // must die there like everything else).
    g2.globalCompositeOperation = 'source-over';
    g2.globalAlpha = 1;
    for (let t = 0; t < hf.T; t++) {
      if (!hf.tFront[t]) continue;
      const a = hf.ti[t * 3], b = hf.ti[t * 3 + 1], c = hf.ti[t * 3 + 2];
      if (hf.tState[t]) {
        const vmA = (hf.vVm[a] + hf.vVm[b] + hf.vVm[c]) * 0.3333;
        g2.fillStyle = hf.tGlass[t];
        g2.globalAlpha = vmA;
        g2.beginPath();
        g2.moveTo(hf.vpx[a], hf.vpy[a]);
        g2.lineTo(hf.vpx[b], hf.vpy[b]);
        g2.lineTo(hf.vpx[c], hf.vpy[c]);
        g2.closePath();
        g2.fill();
        g2.globalAlpha = 1;
        continue;
      }
      let lv = ((hf.vVm[a] + hf.vVm[b] + hf.vVm[c]) * 1.6667 + 0.5) | 0;
      if (lv > 5) lv = 5;
      g2.fillStyle = hf.tfillL[t * 6 + lv];
      g2.beginPath();
      g2.moveTo(hf.vpx[a], hf.vpy[a]);
      g2.lineTo(hf.vpx[b], hf.vpy[b]);
      g2.lineTo(hf.vpx[c], hf.vpy[c]);
      g2.closePath();
      g2.fill();
    }
    // — then LIGHT, strictly additive: wash, molten body, seams, the heart, near dust.
    //   Every face/seam alpha carries the FORESHORTENING DAMPER (projected area over a
    //   reference): where the surface turns away, dense tiny triangles would otherwise
    //   pile their additive light into a bright band hugging the limb — the residue of
    //   the old drawn rim. Damped, the compression dims instead of igniting. —
    const aRef = R0 * sc * R0 * sc * 0.005;
    g2.globalCompositeOperation = 'lighter';
    g2.lineCap = 'round';
    for (let t = 0; t < hf.T; t++) {
      if (!hf.tFront[t]) continue;
      const a = hf.ti[t * 3], b = hf.ti[t * 3 + 1], c = hf.ti[t * 3 + 2];
      const r = (hf.vlr[a] + hf.vlr[b] + hf.vlr[c]) * 0.3333;
      const gg = (hf.vlg[a] + hf.vlg[b] + hf.vlg[c]) * 0.3333;
      const bb = (hf.vlb[a] + hf.vlb[b] + hf.vlb[c]) * 0.3333;
      const m2 = r > gg ? (r > bb ? r : bb) : (gg > bb ? gg : bb);
      if (m2 < 0.09) continue;
      let af = hf.tArea[t] / aRef;
      if (af > 1) af = 1; else af = af * af * (3 - 2 * af);
      let a2 = m2 * 0.16 * af;
      if (a2 > 0.1) a2 = 0.1;
      const inv = 255 / m2;
      g2.globalAlpha = a2;
      g2.fillStyle = 'rgb(' + ((r * inv) | 0) + ',' + ((gg * inv) | 0) + ',' + ((bb * inv) | 0) + ')';
      g2.beginPath();
      g2.moveTo(hf.vpx[a], hf.vpy[a]);
      g2.lineTo(hf.vpx[b], hf.vpy[b]);
      g2.lineTo(hf.vpx[c], hf.vpy[c]);
      g2.closePath();
      g2.fill();
    }
    if (!still) {
      // the body's molten faces — newborn and re-melted cells burn (soft inner light;
      // the hot seams carry the birth)
      for (let bi = 0; bi < bodyN; bi++) {
        const t = hf.bodyList[bi];
        if (!hf.tFront[t]) continue;
        const age = now - hf.tBorn[t];
        if (age >= 3000) continue;
        let m = 1 - age / 3000;
        m *= m;
        const a = hf.ti[t * 3], b = hf.ti[t * 3 + 1], c = hf.ti[t * 3 + 2];
        // the burn dies with the veil too — no molten face may stand alone in the coast
        g2.globalAlpha = Math.min(0.38, 0.42 * m) * al *
          ((hf.vVm[a] + hf.vVm[b] + hf.vVm[c]) * 0.3333);
        g2.fillStyle = hf.tMolt[t];
        g2.beginPath();
        g2.moveTo(hf.vpx[a], hf.vpy[a]);
        g2.lineTo(hf.vpx[b], hf.vpy[b]);
        g2.lineTo(hf.vpx[c], hf.vpy[c]);
        g2.closePath();
        g2.fill();
      }
    }
    // — the seams. Three natures: far side / limb (skipped — the limb lives in total
    //   darkness, nothing is ever stroked there), a seam of the body/frontier, or the
    //   field's (its vertex light already carries the veil and the dispersion).
    const ringAge = now - coreRingT0;
    const circT = still ? 1.6 : now * 0.001;
    const flowAmp = (0.16 + 0.42 * hCharge) * al * br;
    const flowR = bodyR + 0.5; // angular
    for (let e = 0; e < hf.NE; e++) {
      const q1 = hf.et1[e], q2 = hf.et2[e];
      const f1 = hf.tFront[q1], f2v = hf.tFront[q2];
      if (!f1 || !f2v) continue; // the far side — and the unseen limb between
      const a = hf.ea[e], b = hf.eb[e];
      const s1 = hf.tState[q1] === 1;
      const s2 = hf.tState[q2] === 1;
      if (s1 || s2) {
        const bt = s1 && s2
          ? (hf.tBorn[q1] > hf.tBorn[q2] ? q1 : q2)
          : (s1 ? q1 : q2);
        let a2;
        if (s1 && s2) {
          const dpt = hf.tDepth[q1] < hf.tDepth[q2] ? hf.tDepth[q1] : hf.tDepth[q2];
          a2 = 0.16 + 0.05 * coreSetLvl;
          const cv2 = Math.cos(dpt * 0.8 - circT);
          if (cv2 > 0) a2 += 0.38 * cv2 * cv2 * cv2;
          if (!still && ringAge < 2600) {
            const rq = (dpt * 150 - ringAge) / 320;
            if (rq > -1 && rq < 1) a2 += 1.1 * (1 - rq * rq) * (1 - ringAge / 2600);
          }
        } else {
          a2 = still ? 0.72 : 0.72 + 0.22 * Math.sin(now * 0.003 + e * 1.7) + 0.35 * hGather;
        }
        if (!still) {
          const h1 = s1 ? 1 - (now - hf.tBorn[q1]) / 3400 : 0;
          const h2 = s2 ? 1 - (now - hf.tBorn[q2]) / 3400 : 0;
          const heat = h1 > h2 ? h1 : h2;
          if (heat > 0) a2 += heat * 0.9;
        }
        a2 *= hf.ej[e] * al;
        // the body's light obeys the veil FULLY (no floor — a burning frontier seam
        // must never stand alone in the darkness of the coast) — and the hush
        a2 *= (hf.vV[a] + hf.vV[b]) * 0.5;
        if (hHon) a2 *= hushAt((hf.vpx[a] - hf.ox) / sc, (hf.vpy[a] - hf.oy) / sc);
        if (a2 < 0.02) continue;
        g2.beginPath();
        g2.moveTo(hf.vpx[a], hf.vpy[a]);
        g2.lineTo(hf.vpx[b], hf.vpy[b]);
        g2.globalAlpha = Math.min(0.78, a2 * 0.62);
        g2.lineWidth = hf.ew[e] * sc * 1.25;
        g2.strokeStyle = hf.tMolt[bt];
        g2.stroke();
        g2.globalAlpha = Math.min(1, a2);
        g2.lineWidth = hf.coreW;
        g2.strokeStyle = hf.tMoltW[bt];
        g2.stroke();
        continue;
      }
      let r = (hf.vlr[a] + hf.vlr[b]) * 0.5;
      let gg = (hf.vlg[a] + hf.vlg[b]) * 0.5;
      let bb = (hf.vlb[a] + hf.vlb[b]) * 0.5;
      let m2 = r > gg ? (r > bb ? r : bb) : (gg > bb ? gg : bb);
      // the surface FEEDS the body — its light streams along the seams toward the pole
      if (bodyN && hf.ehd[e] < flowR && m2 > 0.01) {
        const fl = Math.cos(hf.ehd[e] * 14 + (still ? 0 : now * 0.0019));
        if (fl > 0) {
          let pr2 = 1 - hf.ehd[e] / flowR;
          const boost = flowAmp * pr2 * pr2 * fl * fl * fl;
          if (boost > 0.01) {
            const bm2 = 1 + boost / m2;
            r *= bm2; gg *= bm2; bb *= bm2; m2 *= bm2;
          }
        }
      }
      const sp = hf.esprk[e];
      if (sp > 0.02 && m2 > 0.012) {
        const bm = 1 + 2.4 * sp;
        r *= bm; gg *= bm; bb *= bm; m2 *= bm;
      }
      if (m2 < 0.1) continue; // nothing strokes below the halo gate — skip early
      // the foreshortening damper (min of the two faces) — compressed limb seams dim
      let afe = (hf.tArea[q1] < hf.tArea[q2] ? hf.tArea[q1] : hf.tArea[q2]) / aRef;
      if (afe > 1) afe = 1; else afe = afe * afe * (3 - 2 * afe);
      const inv = 255 / m2;
      const rr = (r * inv) | 0, rg = (gg * inv) | 0, rb = (bb * inv) | 0;
      g2.beginPath();
      g2.moveTo(hf.vpx[a], hf.vpy[a]);
      g2.lineTo(hf.vpx[b], hf.vpy[b]);
      // light POOLS as coloured halo first — the mass glows, it is not wireframed
      let ha = m2 * 0.85 * hf.ej[e] * afe;
      if (ha > 0.7) ha = 0.7;
      g2.globalAlpha = ha;
      g2.lineWidth = hf.ew[e] * sc;
      g2.strokeStyle = 'rgb(' + rr + ',' + rg + ',' + rb + ')';
      g2.stroke();
      // the near-white core is reserved for genuine heat (sparks, wave crests, the
      // presences' hearts) — and it is GATED BY THE VEIL: light entering the dissolve
      // dies in refracted colour, never in white wire
      if (m2 > 0.12) {
        const vve = (hf.vV[a] + hf.vV[b]) * 0.5;
        let cg = (vve - 0.35) / 0.3;
        cg = cg < 0 ? 0 : cg > 1 ? 1 : cg;
        let ca = (m2 - 0.12) * 1.3 * hf.ej[e] * afe * cg * (3 - 2 * cg) * cg;
        if (ca > 0.85) ca = 0.85;
        if (ca > 0.01) {
          g2.globalAlpha = ca;
          g2.lineWidth = hf.coreW;
          g2.strokeStyle = 'rgb(' + ((rr + (255 - rr) * 0.55) | 0) + ',' +
            ((rg + (255 - rg) * 0.55) | 0) + ',' + ((rb + (255 - rb) * 0.55) | 0) + ')';
          g2.stroke();
        }
      }
    }
    // the heart's glow — projected at the pole, in the hour's hue
    if (bodyN) {
      const hIdx = (eraT * 11) | 0;
      const persp = 1 / (1 - hDirWz * R0 * kP);
      const sx = (hf.sX + hDirWx * R0 * persp) * sc + hf.ox;
      const sy = (hf.sY + hDirWy * R0 * persp) * sc + hf.oy;
      const hSize = R0 * (0.9 + 1.1 * (bodyN / KB)) * sc * (1 + 0.2 * coreFlare);
      g2.globalAlpha = Math.min(0.8, 0.3 + 0.28 * coreFlare +
        (still ? 0 : 0.06 * Math.sin(now * 0.0021))) * al;
      g2.drawImage(hf.pspr[hIdx], sx - hSize / 2, sy - hSize / 2, hSize, hSize);
    }
    // the presences — in front, the pool's own candy sprite, easing out as it sinks
    // toward the limb; behind, ONLY the flank seep: the occluded light refracted
    // around the unseen edge as iridescent fringes (thin-film as optical warp), dying
    // entirely once the presence swings deep behind the mass
    for (let k = 0; k < 3; k++) {
      const wzk = hf.wz[k];
      const wk = hf.wisps[k];
      const seep = sstep((0.3 - wzk) / 0.55) * sstep((wzk + 0.85) / 0.5);
      // crossfade: as the seep rises the front sprite yields (never both at full pay)
      const ff = sstep((wzk + 0.45) / 0.5) * (1 - 0.7 * seep);
      if (ff > 0.02) {
        const persp = 1 / (1 - wzk * 1.06 * R0 * kP);
        const sx = (hf.sX + hf.wx[k] * R0 * 1.06 * persp) * sc + hf.ox;
        const sy = (hf.sY + hf.wy[k] * R0 * 1.06 * persp) * sc + hf.oy;
        const size = R0 * 1.7 * sc * persp;
        // the breath term holds a fixed phase in the composed still frame — a
        // reduced-motion press repaint must never shift unrelated light
        g2.globalAlpha = (0.24 + (still ? 0 : 0.07 * Math.sin(now * 0.0004 + k * 2.1))) *
          ff * br * al * hushAt((sx - hf.ox) / sc, (sy - hf.oy) / sc);
        g2.drawImage(wk.spr, sx - size / 2, sy - size / 2, size, size);
      }
      if (seep > 0.02) {
        const az = Math.atan2(hf.wy[k], hf.wx[k]);
        const cax = Math.cos(az), say = Math.sin(az);
        // the mass's deformed reach at that azimuth — the seep hugs the true flank
        let rr2 = 1;
        let d2 = cax * lx1 + say * ly1;
        if (d2 > 0) { d2 *= d2; rr2 += A1 * d2 * d2; }
        d2 = cax * lx2 + say * ly2;
        if (d2 > 0) { d2 *= d2; rr2 += A2 * d2 * d2; }
        d2 = cax * lx3 + say * ly3;
        if (d2 > 0) { d2 *= d2; d2 *= d2; rr2 += A3 * d2 * d2; }
        d2 = cax * lx4 + say * ly4;
        if (d2 > 0) { rr2 += A4 * d2 * d2; }
        d2 = cax * lx5 + say * ly5;
        if (d2 > 0) { d2 *= d2; rr2 += A5 * d2 * d2; }
        if (rr2 > 1.5) rr2 = 1.5; else if (rr2 < 0.68) rr2 = 0.68;
        const Rv = R0 * rr2 * 0.92;
        const tx2 = -say, ty2 = cax;
        for (let o = -1; o <= 1; o++) {
          const j = (foldT(az * 0.159 + wt * 0.00005 + o * 0.14 + k * 0.31) * 7.99) | 0;
          const off = o * R0 * 0.2;
          const sx = (hf.sX + cax * Rv + tx2 * off) * sc + hf.ox;
          const sy = (hf.sY + say * Rv + ty2 * off) * sc + hf.oy;
          const size = R0 * (o === 0 ? 0.85 : 0.6) * sc;
          g2.globalAlpha = (o === 0 ? 0.2 : 0.11) * seep * wk.I * br * al *
            hushAt((sx - hf.ox) / sc, (sy - hf.oy) / sc);
          g2.drawImage(hf.ispr[j], sx - size / 2, sy - size / 2, size, size);
        }
      }
    }
    if (presI > 0.02) {
      const idx = (pht * 11) | 0;
      const persp = 1 / (1 - presDz * R0 * kP);
      const sx = (hf.sX + presDx * R0 * persp) * sc + hf.ox;
      const sy = (hf.sY + presDy * R0 * persp) * sc + hf.oy;
      const size = R0 * presW * 3.4 * sc;
      g2.globalAlpha = Math.min(0.85, 0.42 * presI * (1 + 0.6 * hCharge)) * al *
        hushAt((sx - hf.ox) / sc, (sy - hf.oy) / sc);
      g2.drawImage(hf.pspr[idx], sx - size / 2, sy - size / 2, size, size);
    }
    for (let i = 0; i < hf.NM; i++) {
      const ph = hf.mph[i];
      const cph = Math.cos(ph), sph = Math.sin(ph);
      const px3 = (hf.mux[i] * cph + hf.mwx[i] * sph) * hf.msh[i];
      const py3 = (hf.muy[i] * cph + hf.mwy[i] * sph) * hf.msh[i];
      const pz3 = (hf.muz[i] * cph + hf.mwz[i] * sph) * hf.msh[i];
      if (pz3 < 0) continue;
      const persp = 1 / (1 - pz3 * R0 * kP);
      const sx = (hf.sX + px3 * R0 * persp) * sc + hf.ox;
      const sy = (hf.sY + py3 * R0 * persp) * sc + hf.oy;
      const tw = still ? 0.5 : 0.5 + 0.5 * Math.sin(now * hf.mtw[i] + ph * 3.1);
      g2.globalAlpha = (0.1 + 0.4 * tw * tw) * al;
      const s2 = hf.msz[i] * sc * persp;
      g2.drawImage(hf.mspr[hf.mhue[i]], sx - s2 / 2, sy - s2 / 2, s2, s2);
    }
    // — the feather, painted LAST over everything: the frame never guillotines the
    //   mass — where it exceeds the window, its light dies into the room's own black
    //   before the straight edge (the per-vertex falloff does the organic first pass;
    //   this catches uniform-alpha strokes and sprite blooms crossing the border) —
    g2.globalCompositeOperation = 'source-over';
    g2.globalAlpha = 1;
    g2.fillStyle = hf.fadeT;
    g2.fillRect(0, 0, fieldCanvas.width, hf.fE);
    g2.fillStyle = hf.fadeB;
    g2.fillRect(0, fieldCanvas.height - hf.fE, fieldCanvas.width, hf.fE);
    g2.fillStyle = hf.fadeL;
    g2.fillRect(0, 0, hf.fE, fieldCanvas.height);
    g2.fillStyle = hf.fadeR;
    g2.fillRect(fieldCanvas.width - hf.fE, 0, hf.fE, fieldCanvas.height);
    g2.lineWidth = 1;
  };

  const hfTick = (now) => {
    if (!hfOn) return;
    const dt = Math.min(50, Math.max(1, now - hfLast));
    hfLast = now;
    // the hand — NEAR-INSTANT: the light must feel attached to the cursor (a long
    // damping constant here reads as lag); only the lean keeps a soft settle
    const kp = Math.min(1, dt / 55);
    hpX += (hpTX - hpX) * kp;
    hpY += (hpTY - hpY) * kp;
    hpI += ((hpOn ? 1 : 0) - hpI) * Math.min(1, dt / 140);
    hLeanX += (hLeanTX - hLeanX) * Math.min(1, dt / 220);
    hLeanY += (hLeanTY - hLeanY) * Math.min(1, dt / 220);
    hCharge = hCharging ? Math.min(1, hCharge + dt / 1100) : Math.max(0, hCharge - dt / 450);
    hGather += ((hCharging ? 0.30 * hCharge : 0) - hGather) * Math.min(1, dt / 320);
    // the dust orbits — each mote advances along its own tilted shell
    if (hf) {
      for (let i = 0; i < hf.NM; i++) {
        hf.mph[i] += hf.msp[i] * dt;
      }
      // the crackle — sparks decay, and every few beats a LIT seam ignites past its
      // ambient light (candidates are drawn from last frame's vertex light, so a spark
      // can only ever be born where the light already is — never in the dark)
      const dk = Math.exp(-dt / 420);
      const es = hf.esprk;
      for (let e = 0; e < hf.NE; e++) if (es[e] > 0.004) es[e] *= dk;
      hSparkT -= dt;
      if (hSparkT <= 0) {
        hSparkT = 230 + Math.random() * 500;
        for (let tr = 0; tr < 5; tr++) {
          const e = (Math.random() * hf.NE) | 0;
          if (!hf.eact[e]) continue;
          const a = hf.ea[e], b = hf.eb[e];
          const m = Math.max(hf.vlr[a] + hf.vlr[b], hf.vlg[a] + hf.vlg[b],
            hf.vlb[a] + hf.vlb[b]) * 0.5;
          if (m > 0.05) { es[e] = 0.55 + Math.random() * 0.5; break; }
        }
      }
      // the heartbeat — the room's pulse now comes FROM the core: a soft wave leaves the
      // heart every so often (and immediately chimes the lattice on its way out)
      if (now > hPulseAt) {
        hPulseAt = now + 15000 + Math.random() * 13000;
        hfSpawnWave(hDirWx, hDirWy, hDirWz, 0.3 + Math.random() * 0.18);
      }
      // THE CORE's clock — accretion, feeding, maturity, the chime
      if (bodyN) {
        // the condensation eases toward its targets (the field bends, never snaps)
        const pk2 = Math.min(1, dt / 900);
        for (let i = 0; i < hf.NV; i++) {
          const d2 = hf.vPullT[i] - hf.vPull[i];
          if (d2 > 0.001 || d2 < -0.001) hf.vPull[i] += d2 * pk2;
        }
        if (hCharging && now >= coreFeedAt) {
          presDirInto(PD);
          const d = 1 - (PD[0] * hDirWx + PD[1] * hDirWy + PD[2] * hDirWz);
          if (d < bodyR * 1.6 + 0.32) {
            // the feeding hand — burst growth toward it, the heart drinks
            coreFeedAt = now + 240;
            coreGrow(now, true);
            coreFlare = Math.min(2, coreFlare + 0.12);
            hFed = true;
          }
        }
        if (now >= coreGrowAt) {
          if (bodyN < KB) {
            coreGrow(now, false);
            presDirInto(PD);
            const d = 1 - (PD[0] * hDirWx + PD[1] * hDirWy + PD[2] * hDirWz);
            const pf = hpI * Math.max(0, 1 - d); // dwelling on the body quickens it
            const base = GROW_MS[coreRingN < 4 ? coreRingN : 4];
            coreGrowAt = now + (base * (0.8 + 0.4 * Math.random())) / (1 + 1.6 * pf);
          } else {
            // maturity — the body never fully sets: an old cell re-melts now and then
            const bi = (Math.random() * bodyN) | 0;
            const t = hf.bodyList[bi];
            if (now - hf.tBorn[t] > 9000) hf.tBorn[t] = now - 320;
            coreGrowAt = now + 6500 + Math.random() * 5000;
          }
        }
        coreFlare *= Math.exp(-dt / 750);
        // a wave washing the heart chimes the lattice — once per wave
        for (let v = 0; v < wvN; v++) {
          if (wvChimed[v]) continue;
          const age = (now - wvT0[v]) / 1700;
          if (age >= 1) continue;
          const d = 1 - (wvX[v] * hDirWx + wvY[v] * hDirWy + wvZ[v] * hDirWz);
          if (age * 2.3 >= d) {
            wvChimed[v] = 1;
            coreChime(now, 0.6 * wvAmp[v]);
          }
        }
      }
    }
    // retire spent waves (order irrelevant — swap-with-last, no allocation)
    for (let v = wvN - 1; v >= 0; v--) {
      if (now - wvT0[v] >= 1700) {
        wvN--;
        wvX[v] = wvX[wvN]; wvY[v] = wvY[wvN]; wvZ[v] = wvZ[wvN]; wvT0[v] = wvT0[wvN];
        wvAmp[v] = wvAmp[wvN]; wvHue[v] = wvHue[wvN]; wvChimed[v] = wvChimed[wvN];
      }
    }
    hfDraw(now, false);
    hfRaf = requestAnimationFrame(hfTick);
  };

  const hfStart = () => {
    if (hfOn || !hf) return;
    hfOn = true;
    hfT0 = hfLast = performance.now();
    // the hand starts clean — no charge, no presence, no lean, no leftover shear from the
    // last visit (the field must compose at rest, then answer THIS visitor)
    hCharge = 0; hGather = 0; hCharging = false; hpI = 0; hpOn = false; wvN = 0;
    hLeanX = hLeanY = hLeanTX = hLeanTY = 0;
    hpX = hpTX = hf.sX;
    hpY = hpTY = hf.sY;
    hf.esprk.fill(0);
    hSparkT = 600;
    hPulseAt = hfT0 + 8000; // the first heartbeat arrives once the room has woken
    // the core REMEMBERS: only a first visit seeds it — re-entry finds the body it grew
    if (!bodyN) bodySeed(hfT0);
    else coreGrowAt = hfT0 + 1200; // waking, it stirs soon
    hfRaf = requestAnimationFrame(hfTick);
  };
  const hfStop = () => {
    if (!hfOn) return;
    hfOn = false;
    cancelAnimationFrame(hfRaf);
  };

  // the words' live rect → field units (only measurable while the dialog is open)
  const hfMeasureHush = () => {
    hHon = false;
    if (!hf || !room) return;
    const col = room.querySelector('.hollow__col');
    if (!col) return;
    const r = col.getBoundingClientRect();
    if (!r.width || !r.height) return;
    hHx0 = ((r.left - 14) * hf.dpr - hf.ox) / hf.scale;
    hHx1 = ((r.right + 14) * hf.dpr - hf.ox) / hf.scale;
    hHy0 = ((r.top - 14) * hf.dpr - hf.oy) / hf.scale;
    hHy1 = ((r.bottom + 14) * hf.dpr - hf.oy) / hf.scale;
    hHon = true;
  };

  // ── THE CORE v2 — the field organizes ITSELF (rebuilt 2026-08-02). ─────────────────────────
  // The first core was a second mesh floating ON the field — disconnected, an overlay.
  // Now the body is built FROM the field's own facets: growth RECRUITS a facet adjacent
  // to the body (same shared vertices — seams continuous, light shared, by construction);
  // the recruited corners PULL toward the heart (the mesh CONDENSES, and because vertices
  // are shared the surrounding field visibly bends around the body); the frontier seams
  // burn permanently (the growing edge is the unfinished edge — the thesis, structural);
  // and the field FEEDS the body: its own seam light streams inward along every seam near
  // the heart. Everything else holds from the first core: molten birth cooling to
  // era-hued glass (time-rings of the visit's hours), circulation by recruitment depth,
  // Fibonacci RINGS {8,21,34,55,89} that chime the room and the type, attention-directed
  // growth, feeding, burning, waves chiming, persistence across re-entry, and a
  // deterministic composed body under reduced motion.
  let bodyN = 0, bodyR = 0.1; // recruited count + angular reach (1 − dot, body space)
  let coreBorn = 0, coreGrowAt = 0, coreRingT0 = -1e9, coreRingN = 0, coreSetLvl = 0;
  let coreFeedAt = 0, coreFlare = 0, coreEra = 0;
  const RINGS_AT = [8, 21, 34, 55, 89];
  const GROW_MS = [620, 900, 1150, 1500, 2100]; // cadence per era — eager young, stately old
  const KB = 96; // the body's reach, in facets — a region of the field, never the field
  let coreSeed = 7;
  const coreRnd = () => {
    coreSeed |= 0; coreSeed = (coreSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(coreSeed ^ (coreSeed >>> 15), 1 | coreSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // the words answer the body — every ring/chime flares the inscription for a breath
  let chimeT = 0;
  const wordChime = () => {
    if (reduce || !room) return;
    room.classList.add('hollow--chime');
    clearTimeout(chimeT);
    chimeT = setTimeout(() => room.classList.remove('hollow--chime'), 1400);
  };

  const recruit = (t, now, forced, depth) => {
    coreEra = foldT((now - coreBorn) * 0.000019 + 0.03); // the hour's hue — time-rings
    const c = candyAt(coreEra);
    hf.tMolt[t] = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
    hf.tMoltW[t] = 'rgb(' + ((c[0] + (255 - c[0]) * 0.6) | 0) + ',' +
      ((c[1] + (255 - c[1]) * 0.6) | 0) + ',' + ((c[2] + (255 - c[2]) * 0.6) | 0) + ')';
    // condensed glass — DEEPER than the field's own dark (the body reads as a dense
    // figure by contrast inversion: dark mass, self-lit lattice, burning rim)
    hf.tGlass[t] = 'rgb(' + ((4 + c[0] * 0.014) | 0) + ',' + ((3 + c[1] * 0.012) | 0) + ',' +
      ((6 + c[2] * 0.018) | 0) + ')';
    hf.tState[t] = 1;
    hf.tBorn[t] = now - (forced ? 180 : 0);
    hf.tDepth[t] = depth > 254 ? 254 : depth;
    hf.bodyList[bodyN++] = t;
    const d = 1 - (hf.tdx[t] * hf.h0x + hf.tdy[t] * hf.h0y + hf.tdz[t] * hf.h0z);
    if (d + 0.1 > bodyR) bodyR = d + 0.1; // angular reach (1 − dot), body space
    // the condensation — the recruited corners pull toward the order; shared vertices
    // bend the surrounding field around the body
    const pw = Math.max(0.35, 1 - depth * 0.055);
    for (let e = 0; e < 3; e++) {
      const v = hf.ti[t * 3 + e];
      if (hf.vPullT[v] < pw) hf.vPullT[v] = pw;
    }
    if (coreRingN < RINGS_AT.length && bodyN >= RINGS_AT[coreRingN]) {
      // the body RINGS as it comes of age — the room and the type answer
      coreRingN++;
      coreSetLvl = coreRingN;
      coreRingT0 = now;
      coreFlare = Math.min(2, coreFlare + 1.2);
      hfSpawnWave(hDirWx, hDirWy, hDirWz, 0.42 + 0.1 * coreRingN);
      wordChime();
    }
  };

  const bodySeed = (now) => {
    if (!hf) return;
    coreBorn = now;
    coreGrowAt = now + 900;
    coreRingN = 0; coreSetLvl = 0; coreFlare = 1; bodyN = 0; bodyR = 0.1;
    hf.tState.fill(0);
    hf.vPullT.fill(0);
    hf.vPull.fill(0);
    let s = -1, sd = -1e9;
    for (let t = 0; t < hf.T; t++) {
      const d = hf.tdx[t] * hf.h0x + hf.tdy[t] * hf.h0y + hf.tdz[t] * hf.h0z;
      if (d > sd) { sd = d; s = t; }
    }
    if (s >= 0) recruit(s, now, false, 0);
  };

  // one growth step — recruit a field facet adjacent to the body, leaning toward the
  // dwelling hand (attention is the material); forced = the feeding hand's burst
  const coreGrow = (now, forced) => {
    if (!hf || !bodyN || bodyN >= KB) return;
    // the hand on the surface (world) — attention leans the frontier toward it
    presDirInto(PD);
    const attn = forced ? 1 : hpI;
    let best = -1, bestD = 1, bestS = -1e9;
    for (let bi = 0; bi < bodyN; bi++) {
      const bt = hf.bodyList[bi];
      for (let e = 0; e < 3; e++) {
        const ei = hf.tedge[bt * 3 + e];
        const o = hf.et1[ei] === bt ? hf.et2[ei] : hf.et1[ei];
        if (o < 0 || hf.tState[o]) continue;
        // compactness in body space (the pole never moves there)
        const md = 1 - (hf.tdx[o] * hf.h0x + hf.tdy[o] * hf.h0y + hf.tdz[o] * hf.h0z);
        let sc = -md * (bodyN < 18 ? 4.6 : 2.0) + coreRnd() * 1.3;
        if (attn > 0.05) {
          // the candidate's WORLD direction leaning toward the hand's surface point
          const wxc = hM[0] * hf.tdx[o] + hM[1] * hf.tdy[o] + hM[2] * hf.tdz[o];
          const wyc = hM[3] * hf.tdx[o] + hM[4] * hf.tdy[o] + hM[5] * hf.tdz[o];
          const wzc = hM[6] * hf.tdx[o] + hM[7] * hf.tdy[o] + hM[8] * hf.tdz[o];
          sc += 2.8 * attn * (wxc * PD[0] + wyc * PD[1] + wzc * PD[2]);
        }
        if (sc > bestS) { bestS = sc; best = o; bestD = hf.tDepth[bt] + 1; }
      }
    }
    if (best >= 0) recruit(best, now, forced, bestD);
  };

  // the chime — a wave (or the keyboard's ring) washes the heart: the lattice answers
  const coreChime = (now, amp) => {
    if (!bodyN) return;
    if (now - coreRingT0 > 900) coreRingT0 = now;
    coreFlare = Math.min(2, coreFlare + amp);
    wordChime();
  };

  // the burn — the hand touched the body: the touched cells re-melt and re-cool
  const coreBurn = (tx, ty, tz, now) => {
    if (!hf || !bodyN) return false;
    // angular nearness of the touch to the body's facets (world dirs, event-time)
    let hd = 1e9;
    for (let bi = 0; bi < bodyN; bi++) {
      const t = hf.bodyList[bi];
      const wxc = hM[0] * hf.tdx[t] + hM[1] * hf.tdy[t] + hM[2] * hf.tdz[t];
      const wyc = hM[3] * hf.tdx[t] + hM[4] * hf.tdy[t] + hM[5] * hf.tdz[t];
      const wzc = hM[6] * hf.tdx[t] + hM[7] * hf.tdy[t] + hM[8] * hf.tdz[t];
      const d = 1 - (wxc * tx + wyc * ty + wzc * tz);
      if (d < hd) hd = d;
    }
    if (hd > 0.06) return false;
    for (let bi = 0; bi < bodyN; bi++) {
      const t = hf.bodyList[bi];
      const wxc = hM[0] * hf.tdx[t] + hM[1] * hf.tdy[t] + hM[2] * hf.tdz[t];
      const wyc = hM[3] * hf.tdx[t] + hM[4] * hf.tdy[t] + hM[5] * hf.tdz[t];
      const wzc = hM[6] * hf.tdx[t] + hM[7] * hf.tdy[t] + hM[8] * hf.tdz[t];
      const d = 1 - (wxc * tx + wyc * ty + wzc * tz);
      if (d < 0.16 && now - hf.tBorn[t] > 3200) {
        hf.tBorn[t] = now - 350 - d * 2600; // re-molten, radiating out from the touch
      }
    }
    coreFlare = Math.min(2, coreFlare + 0.7);
    return true;
  };

  // the hush at a point — used for the sprite bodies (the vertex pass fuses its own copy)
  const hushAt = (x, y) => {
    if (!hHon) return 1;
    const hx = x < hHx0 ? hHx0 - x : x > hHx1 ? x - hHx1 : 0;
    const hy = y < hHy0 ? hHy0 - y : y > hHy1 ? y - hHy1 : 0;
    const hd = hx > hy ? hx : hy;
    if (hd >= 180) return 1;
    const hq = hd / 180;
    return 0.28 + 0.72 * hq * hq * (3 - 2 * hq);
  };

  const hfSpawnWave = (dx, dy, dz, amp) => {
    if (!hf) return;
    let v = 0;
    if (wvN < WV) {
      v = wvN++;
    } else {
      // a fifth wave recycles the ELDEST ring (the one nearest its own end)
      for (let i = 1; i < WV; i++) if (wvT0[i] < wvT0[v]) v = i;
    }
    wvChimed[v] = 0;
    const l = Math.hypot(dx, dy, dz) || 1;
    wvX[v] = dx / l; wvY[v] = dy / l; wvZ[v] = dz / l;
    wvT0[v] = performance.now();
    wvAmp[v] = amp;
    wvHue[v] = foldT(performance.now() * 0.000021);
  };

  // client px → field units (the inverse of the cover transform)
  const hfFieldX = (cx) => hf ? ((cx * hf.dpr - hf.ox) / hf.scale) : 800;
  const hfFieldY = (cy) => hf ? ((cy * hf.dpr - hf.oy) / hf.scale) : 500;

  const onFieldMove = (e) => {
    if (!hf) return;
    hpTX = hfFieldX(e.clientX);
    hpTY = hfFieldY(e.clientY);
    hpOn = true;
    hLeanTX = (e.clientX / innerWidth - 0.5) * 2;
    hLeanTY = (e.clientY / innerHeight - 0.5) * 2;
  };
  const onFieldDown = (e) => {
    if (!hf || e.target.closest('.hollow__seal')) return;
    hpTX = hfFieldX(e.clientX);
    hpTY = hfFieldY(e.clientY);
    hpOn = true;
    if (reduce) {
      // a state, not a motion: the field parts and lights around the held point, composed
      hpX = hpTX; hpY = hpTY;
      hRmPress = 1;
      hfDraw(performance.now(), true);
      return;
    }
    hCharging = true;
    hFed = false;
  };
  const onFieldUp = () => {
    if (!hf) return;
    if (reduce) {
      if (hRmPress) {
        hRmPress = 0;
        hfDraw(performance.now(), true);
      }
      return;
    }
    if (!hCharging) return;
    hCharging = false;
    const now = performance.now();
    // a quick touch ON the body burns it (the visit scars the casting); a hold that fed
    // the core is ABSORBED (the heart drinks the wave); anywhere else, the room rings
    presDirInto(PD);
    if (hCharge < 0.22 && bodyN && coreBurn(PD[0], PD[1], PD[2], now)) return;
    if (hFed) {
      coreFlare = Math.min(2, coreFlare + 0.5);
      return;
    }
    hfSpawnWave(PD[0], PD[1], PD[2], 0.55 + 0.9 * hCharge);
  };
  const onFieldLeave = () => {
    hpOn = false;
    hLeanTX = 0;
    hLeanTY = 0;
  };
  const fieldPointerOn = () => {
    room.addEventListener('pointermove', onFieldMove);
    room.addEventListener('pointerdown', onFieldDown);
    room.addEventListener('pointerleave', onFieldLeave);
    addEventListener('pointerup', onFieldUp);
    addEventListener('pointercancel', onFieldUp);
  };
  const fieldPointerOff = () => {
    room.removeEventListener('pointermove', onFieldMove);
    room.removeEventListener('pointerdown', onFieldDown);
    room.removeEventListener('pointerleave', onFieldLeave);
    removeEventListener('pointerup', onFieldUp);
    removeEventListener('pointercancel', onFieldUp);
  };

  let roomState = 'idle'; // idle → flight → in → out → idle
  let flareT0 = 0, codaT0 = 0; // canvas seam moments (entry flare / exit afterglow)
  const FLARE = 420, CODA = 640;
  let openScrollY = 0;
  let tIn1 = 0, tIn2 = 0, tOut1 = 0;
  let keyLive = false, keyFocus = false, keyTop = 0, keyBot = 0;
  // the hand at the seam: hover eases in/out (keyHoverF) and the breath keeps its own phase
  // accumulator (keyPh) so a quickening rate can never snap the cycle
  let keyHover = false, keyHoverF = 0, keyPh = 0, keyT0 = 0;

  // the facet's screen triangle → the button (CSS px; the canvas sp[] carries dpr)
  const placeKey = () => {
    if (!keyBtn || !keyFa) return;
    const s = keyFa.sp;
    const x0 = s[0] / dpr, y0 = s[1] / dpr, x1 = s[2] / dpr, y1 = s[3] / dpr;
    const x2 = s[4] / dpr, y2 = s[5] / dpr;
    const L = Math.min(x0, x1, x2), T = Math.min(y0, y1, y2);
    const W = Math.max(x0, x1, x2) - L || 1, H = Math.max(y0, y1, y2) - T || 1;
    keyTop = T;
    keyBot = T + H;
    keyBtn.style.left = L.toFixed(1) + 'px';
    keyBtn.style.top = T.toFixed(1) + 'px';
    keyBtn.style.width = W.toFixed(1) + 'px';
    keyBtn.style.height = H.toFixed(1) + 'px';
    const pc = (vx, vy) =>
      (((vx - L) / W) * 100).toFixed(2) + '% ' + (((vy - T) / H) * 100).toFixed(2) + '%';
    keyBtn.style.clipPath =
      'polygon(' + pc(x0, y0) + ', ' + pc(x1, y1) + ', ' + pc(x2, y2) + ')';
  };

  const setKeyLive = (on) => {
    if (!keyBtn || on === keyLive) return;
    keyLive = on;
    if (on && !hf) {
      // pre-build the mass at idle — entry must never pay the parse under the click.
      // Guarded: if the visitor is ALREADY inside when this fires (opened within the
      // idle window), a resize here would wipe the reduced-motion composed frame —
      // buildField() no-ops once hf exists and openRoom did its own resize.
      (window.requestIdleCallback || ((f) => setTimeout(f, 120)))(() => {
        if (!hf) buildField(); // buildField ends in hfResize()
      });
    }
    keyBtn.classList.toggle('facet-key--live', on);
    keyBtn.tabIndex = on ? 0 : -1;
    if (!on) {
      keyFocus = false;
      keyHover = false;
      keyHoverF = 0;
      if (document.activeElement === keyBtn) keyBtn.blur();
    }
  };

  // the breath, the seam's candy whisper, the hover answer — and, on :focus-visible, the
  // hairline. Runs inside the field's own frame.
  const drawKeyExtras = (time) => {
    if (!keyFa || roomState !== 'idle' || flareT0 || codaT0 || curF <= 0.001) return;
    const s = keyFa.sp;
    if (!reduce && keyFa.cur < 0.04) {
      let pk = (keyFa.cy - edgeY) / pspan; // the same presence fade as the field's paint
      pk = pk < 0 ? 0 : pk > 1 ? 1 : pk;
      pk = pk * pk * (3 - 2 * pk);
      if (pk > 0.02) {
        // the hand at the seam — eased, never snapped
        keyHoverF += ((keyHover && keyLive ? 1 : 0) - keyHoverF) * 0.11;
        if (keyHoverF < 0.004) keyHoverF = 0; else if (keyHoverF > 0.996) keyHoverF = 1;
        // breath-shaped swell — quick inhale, long settle (the ^1.6 keeps a resting trough).
        // The phase ACCUMULATES so the hover quickening bends the rhythm without a snap.
        const dtk = Math.min(50, Math.max(0, time - (keyT0 || time)));
        keyT0 = time;
        keyPh += dtk * (0.0014 + 0.0011 * keyHoverF);
        const b = Math.pow(0.5 + 0.5 * Math.sin(keyPh), 1.6) * pk;
        const minX = Math.min(s[0], s[2], s[4]), minY = Math.min(s[1], s[3], s[5]);
        const maxX = Math.max(s[0], s[2], s[4]), maxY = Math.max(s[1], s[3], s[5]);
        g.save();
        g.beginPath();
        g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
        g.clip();
        g.clearRect(minX - 1, minY - 1, maxX - minX + 2, maxY - minY + 2);
        // repaint exactly what the field just painted (v ≈ 0), lifted rose-warm — a visible
        // breath now (the door is meant to be findable), warmer still under the hand
        const baseA = Math.min(1, 0.8 + 0.2 * (curF / 0.2));
        g.globalAlpha = 1 - (1 - baseA) * pk;
        const lift = 1 + 0.55 * keyHoverF;
        const R = PLANE[0] + (keyFa.d[0] + 18 * b * lift - PLANE[0]) * pk;
        const G2 = PLANE[1] + (keyFa.d[1] + 7 * b * lift - PLANE[1]) * pk;
        const B2 = PLANE[2] + (keyFa.d[2] + 9 * b * lift - PLANE[2]) * pk;
        g.fillStyle = 'rgb(' + (R | 0) + ',' + (G2 | 0) + ',' + (B2 | 0) + ')';
        g.strokeStyle = g.fillStyle;
        g.beginPath();
        g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
        g.fill();
        g.stroke(); // seal the cleared antialiasing edge, like the field's self-stroke
        g.restore();
        // the seam's whisper — candy light leaking at the perimeter, swelling with each
        // breath, blooming under the hand; hue drifting slowly along Clara's ramp
        const wa = pk * (0.1 + 0.17 * b + 0.55 * keyHoverF * (0.72 + 0.28 * b));
        if (wa > 0.02) {
          let ht = 0.5 + 0.5 * Math.sin(time * 0.00012);
          const col = candyAt(ht * 0.9);
          g.globalCompositeOperation = 'lighter';
          g.beginPath();
          g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
          g.globalAlpha = 0.5 * wa;
          g.lineWidth = Math.min(7 * dpr, 10);
          g.strokeStyle = 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')';
          g.stroke();
          g.globalAlpha = Math.min(1, 0.95 * wa + 0.15 * keyHoverF);
          g.lineWidth = Math.max(1, 1.2 * dpr);
          g.strokeStyle = 'rgb(' + ((col[0] + (255 - col[0]) * 0.4) | 0) + ',' +
            ((col[1] + (255 - col[1]) * 0.4) | 0) + ',' + ((col[2] + (255 - col[2]) * 0.4) | 0) + ')';
          g.stroke();
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 1;
          g.lineWidth = 1;
        }
      }
    } else if (reduce && keyLive && keyFa.cur < 0.04) {
      // reduced motion: the hint is COMPOSED, not moving — a faint candy hairline resting on
      // the seam (brighter under the hand), drawn in the static per-scroll paints
      const col = candyAt(0.06);
      g.globalAlpha = keyHover ? 0.62 : 0.3;
      g.lineWidth = Math.max(1, 1.2 * dpr);
      g.strokeStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
      g.beginPath();
      g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
      g.stroke();
      g.globalAlpha = 1;
      g.lineWidth = 1;
    }
    if (keyFocus && keyLive) {
      // the focus ring — a bone hairline around the TRUE triangle (diegetic :focus-visible)
      g.globalAlpha = 0.85;
      g.lineWidth = Math.max(1, 1.2 * dpr);
      g.strokeStyle = 'rgb(226,222,212)';
      g.beginPath();
      g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
      g.stroke();
      g.globalAlpha = 1;
      g.lineWidth = 1;
    }
  };

  // ── the seam moments (canvas): the entry FLARE and the exit CODA ──────────────────────────
  // Both are additive light on the facet's own seam — the neon pass's grammar (wide candy halo
  // + thin near-white core) — painted in the field's frame (the life loop always runs mid-band,
  // which the live window guarantees). The flare answers the click within one frame and is
  // swallowed by the iris; the coda is the seam's afterglow dying as the crystal reseats.
  const drawSeamFX = (time) => {
    if (!keyFa || (!flareT0 && !codaT0)) return;
    let e = 0, hue = 0.04; // hot pink at the head of the ramp
    if (flareT0) {
      const t = time - flareT0;
      if (t >= FLARE) flareT0 = 0;
      else {
        e = sstep(t / 110) * (1 - sstep((t - 250) / 170)); // fast attack, gone as the iris covers
        hue = 0.04 + 0.2 * (t / FLARE); // pink warming toward tangerine as it opens
      }
    }
    if (!e && codaT0) {
      const t = time - codaT0;
      if (t >= CODA) codaT0 = 0;
      else {
        const u = t / CODA;
        e = (1 - u) * (1 - u) * 0.75; // lands bright, cools to nothing — the seam seals
        hue = 0.04 + 0.42 * u; // the dying light drifts through the ramp as it cools
      }
    }
    if (e <= 0.01) return;
    const s = keyFa.sp;
    const col = candyAt(hue);
    const r0 = col[0], g0 = col[1], b0 = col[2];
    g.globalCompositeOperation = 'lighter';
    g.beginPath();
    g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
    g.globalAlpha = 0.16 * e; // a breath of light inside the gap
    g.fillStyle = 'rgb(' + (r0 | 0) + ',' + (g0 | 0) + ',' + (b0 | 0) + ')';
    g.fill();
    g.globalAlpha = 0.55 * e;
    g.lineWidth = Math.min(9 * dpr, 13);
    g.strokeStyle = g.fillStyle;
    g.stroke();
    g.globalAlpha = 0.92 * e;
    g.lineWidth = Math.max(1, 1.3 * dpr);
    g.strokeStyle = 'rgb(' + ((r0 + (255 - r0) * 0.55) | 0) + ',' +
      ((g0 + (255 - g0) * 0.55) | 0) + ',' + ((b0 + (255 - b0) * 0.55) | 0) + ')';
    g.stroke();
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.lineWidth = 1;
  };
  const fxOn = () => flareT0 !== 0 || codaT0 !== 0;

  // ── the room controller ────────────────────────────────────────────────────────────────────
  // While the hollow is open the sheet beneath must not move: wheel / touchmove / scroll-keys
  // are held (the room is a place, not a scroll state). If the words ever outgrow a short
  // viewport the centre column scrolls ITSELF (overscroll contained) — the guards stand aside
  // for that one case. A scrollbar drag cannot be prevented, so it simply closes the room.
  const hvCenter = room ? room.querySelector('.hollow__center') : null;
  const centerScrolls = () => hvCenter && hvCenter.scrollHeight > hvCenter.clientHeight + 4;
  const guardWheel = (e) => {
    // zoom is never guarded: ctrl+wheel is the browser's zoom gesture, and a multi-touch
    // move is a pinch — both pass (WCAG 1.4.4/1.4.10); only single-point scroll is held
    if (e.ctrlKey || (e.touches && e.touches.length > 1)) return;
    if (!centerScrolls()) e.preventDefault();
  };
  const guardKeys = (e) => {
    const k = e.key;
    if (k === ' ' && e.target === seal) return; // space still presses the seal
    if ((k === 'ArrowUp' || k === 'ArrowDown' || k === 'PageUp' || k === 'PageDown' ||
      k === 'Home' || k === 'End' || k === ' ') && !centerScrolls()) {
      e.preventDefault();
      // the keyboard's own hand: Space rings the wave from the room's heart (under
      // reduced motion it presents the composed press-state instead — cleared on keyup)
      if (k === ' ' && !e.repeat && roomState === 'in' && hf) {
        if (reduce) {
          hpX = hf.sX; hpY = hf.sY;
          hRmPress = 1;
          hfDraw(performance.now(), true);
        } else {
          hfSpawnWave(hDirWx, hDirWy, hDirWz, 0.9); // rings from the heart pole
        }
      }
    }
  };
  const guardKeyUp = (e) => {
    if (e.key === ' ' && reduce && hRmPress && hf) {
      hRmPress = 0;
      hfDraw(performance.now(), true);
    }
  };
  const addGuards = () => {
    addEventListener('wheel', guardWheel, { passive: false });
    addEventListener('touchmove', guardWheel, { passive: false });
    addEventListener('keydown', guardKeys, true);
    addEventListener('keyup', guardKeyUp, true);
  };
  const removeGuards = () => {
    removeEventListener('wheel', guardWheel, { passive: false });
    removeEventListener('touchmove', guardWheel, { passive: false });
    removeEventListener('keydown', guardKeys, true);
    removeEventListener('keyup', guardKeyUp, true);
  };

  // the iris: the facet's own triangle in live CSS coordinates, ready to fly
  let irisScale = 20;
  const placeIris = () => {
    if (!iris || !keyFa) return;
    const s = keyFa.sp;
    const x0 = s[0] / dpr, y0 = s[1] / dpr, x1 = s[2] / dpr, y1 = s[3] / dpr;
    const x2 = s[4] / dpr, y2 = s[5] / dpr;
    const L = Math.min(x0, x1, x2), T = Math.min(y0, y1, y2);
    const W = Math.max(x0, x1, x2) - L || 1, H = Math.max(y0, y1, y2) - T || 1;
    iris.style.left = L.toFixed(1) + 'px';
    iris.style.top = T.toFixed(1) + 'px';
    iris.style.width = W.toFixed(1) + 'px';
    iris.style.height = H.toFixed(1) + 'px';
    const pc = (vx, vy) =>
      (((vx - L) / W) * 100).toFixed(2) + '% ' + (((vy - T) / H) * 100).toFixed(2) + '%';
    iris.style.clipPath = 'polygon(' + pc(x0, y0) + ', ' + pc(x1, y1) + ', ' + pc(x2, y2) + ')';
    const gx = (x0 + x1 + x2) / 3, gy = (y0 + y1 + y2) / 3;
    iris.style.transformOrigin = (gx - L).toFixed(1) + 'px ' + (gy - T).toFixed(1) + 'px';
    // scale: the triangle must swallow the viewport from its centroid — farthest corner over
    // the centroid's nearest edge (point-line distance), with margin
    const dCorner = Math.max(
      Math.hypot(gx, gy),
      Math.hypot(innerWidth - gx, gy),
      Math.hypot(gx, innerHeight - gy),
      Math.hypot(innerWidth - gx, innerHeight - gy),
    );
    const edgeDist = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay) || 1;
      return Math.abs((bx - ax) * (ay - gy) - (ax - gx) * (by - ay)) / len;
    };
    const dEdge = Math.min(
      edgeDist(x0, y0, x1, y1),
      edgeDist(x1, y1, x2, y2),
      edgeDist(x2, y2, x0, y0),
    );
    irisScale = (dCorner / Math.max(8, dEdge)) * 1.12;
  };

  const clearRoomTimers = () => {
    clearTimeout(tIn1);
    clearTimeout(tIn2);
    clearTimeout(tOut1);
  };

  const settleRoomShut = () => {
    clearRoomTimers(); // a browser-forced close must not leave a delayed second settle armed
    clearTimeout(chimeT);
    room.classList.remove('hollow--in', 'hollow--flight', 'hollow--out', 'hollow--return',
      'hollow--chime');
    if (iris) {
      iris.style.display = 'none';
      iris.style.transform = '';
    }
    if (irisDark) irisDark.style.opacity = '';
    hfStop();
    fieldPointerOff();
    removeGuards();
    if (room.open) room.close();
    roomState = 'idle';
    // hand the band its life back (the loop idles while the room owns the screen)
    if (!reduce && curF > 0.001) setLoop(true);
    // the door is still live (nothing scrolled) — hand the key back to the visitor
    if (keyLive && keyBtn) keyBtn.focus({ preventScroll: true });
  };

  const openRoom = () => {
    if (!room || roomState !== 'idle' || !keyLive) return;
    roomState = 'flight';
    openScrollY = window.scrollY;
    clearRoomTimers();
    addGuards();
    buildField(); // first open pays the parse — under the iris cover
    hfResize();
    fieldPointerOn();
    if (reduce) {
      // composed and still: a quiet fade, no flight (the iris is display:none in CSS);
      // the field presents ONE composed frame — presences at rest, motes settled, and
      // the core as a fully-grown composed body (deterministic, circulation frozen).
      // (Exit under reduced motion is the estate's hard cut, like the set-veil's.)
      hRmPress = 0;
      if (hf && !bodyN) {
        const t0 = performance.now() - 60000;
        bodySeed(t0);
        for (let i = 0; i < 33; i++) coreGrow(t0, false);
        hf.vPull.set(hf.vPullT); // the condensation stands composed
        wvN = 0; // the growth rings' waves are no part of the still frame
        coreFlare = 0;
        coreSetLvl = 3;
      }
      room.showModal();
      room.focus({ preventScroll: true }); // the room itself receives the visitor (below)
      hfMeasureHush(); // the column is measurable only once the dialog renders
      hfDraw(performance.now(), true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // the door may have been shut inside this two-frame window (a scrollbar drag) —
          // an un-guarded flip here would resurrect 'in' on a closed dialog
          if (roomState !== 'flight' || !room.open) return;
          room.classList.add('hollow--in');
          roomState = 'in';
        });
      });
      return;
    }
    hfStart(); // the room wakes beneath the flight
    flareT0 = performance.now(); // the seam answers THIS frame
    codaT0 = 0;
    placeIris();
    iris.style.display = 'block';
    iris.style.transform = 'scale(1)';
    irisDark.style.opacity = '0';
    room.showModal();
    // focus the ROOM, not the seal: showModal would hand focus to the only button, where
    // Space means [ seal the seam ] — and the keyboard could never ring the wave. The
    // dialog itself receives the visitor (tabindex="-1"); Tab reaches the seal.
    room.focus({ preventScroll: true });
    hfMeasureHush(); // one layout read per open, never in the frame loop
    room.classList.add('hollow--flight');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        iris.style.transform = 'scale(' + irisScale.toFixed(2) + ')';
        irisDark.style.opacity = '1';
      });
    });
    tIn1 = setTimeout(() => room.classList.add('hollow--in'), 600); // compose under the cover
    tIn2 = setTimeout(() => {
      roomState = 'in';
      iris.style.display = 'none'; // the room's own black has the screen now
      room.classList.remove('hollow--flight');
    }, 1000);
  };

  const closeRoom = (quick) => {
    if (!room || roomState === 'idle' || roomState === 'out') return;
    clearRoomTimers();
    if (reduce || quick) {
      // the quiet way out (reduced motion), or the world moved (scrollbar drag): let go now
      roomState = 'out';
      settleRoomShut();
      return;
    }
    roomState = 'out';
    room.classList.remove('hollow--flight');
    room.classList.add('hollow--out', 'hollow--return');
    placeIris(); // resize-safe: the facet's live position, right now
    iris.style.display = 'block';
    iris.style.transform = 'scale(' + irisScale.toFixed(2) + ')';
    irisDark.style.opacity = '1'; // cover instantly; the room lets go beneath
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        iris.style.transform = 'scale(1)'; // home to the facet
        irisDark.style.opacity = '0'; //      black cooling back to candy
      });
    });
    tOut1 = setTimeout(() => {
      codaT0 = performance.now(); // the landed seam's afterglow dies on the canvas
      setLoop(true);
      settleRoomShut();
    }, 760);
  };

  if (room && seal && keyBtn && keyFa) {
    keyBtn.addEventListener('click', openRoom);
    seal.addEventListener('click', () => {
      if (roomState === 'in') closeRoom(false); // armed only once the room has composed
    });
    room.addEventListener('cancel', (e) => {
      e.preventDefault(); // Esc takes the designed exit, not the browser's hard cut
      if (roomState === 'in' || roomState === 'flight') closeRoom(false);
    });
    room.addEventListener('close', () => {
      if (roomState !== 'idle') {
        // closed by other means (e.g. the browser) — restore everything at once
        roomState = 'out';
        settleRoomShut();
      }
    });
    keyBtn.addEventListener('focus', () => {
      keyFocus = keyBtn.matches(':focus-visible');
      if (keyFocus && (reduce || !looping)) draw(performance.now());
    });
    keyBtn.addEventListener('blur', () => {
      if (!keyFocus) return;
      keyFocus = false;
      if (reduce || !looping) draw(performance.now());
    });
    // the hover answer — the seam brightens, the breath quickens (eased in drawKeyExtras;
    // under reduced motion a single static repaint carries the composed brighter hairline)
    keyBtn.addEventListener('pointerenter', () => {
      keyHover = true;
      if (reduce || !looping) draw(performance.now());
    });
    keyBtn.addEventListener('pointerleave', () => {
      keyHover = false;
      if (reduce || !looping) draw(performance.now());
    });
  }

  const draw = (time) => {
    g.clearRect(0, 0, fcanvas.width, fcanvas.height);
    if (curF <= 0.001) return; // dark: nothing to paint (layer is hidden too)
    neonN = 0;
    const shimmer = !reduce && curF > 0.02 && curF < 0.92;
    // breathe: the un-set plane lets the annealing pool through; opaque before the cream flood
    // (applied per facet below — the presence fade lifts it back to opaque at the cover's edge)
    const baseA = reduce ? 1 : Math.min(1, 0.8 + 0.2 * (curF / 0.2));
    g.lineWidth = 1;
    g.lineJoin = 'round';
    for (let i = 0; i < facets.length; i++) {
      const fa = facets[i];
      const v = fa.cur;
      // THE PRESENCE FADE — the cover's straight bottom edge must never read as a clip line.
      // Whatever a facet would paint, at the edge it paints the plane's own black, fully
      // opaque (no tonal variance, no breathe, no ember can meet the cover), and it gains its
      // true tone only over a long smoothstepped falloff below (pspan). Anchored to the same
      // edge as the unveil gate; spatial correctness, not motion — reduced motion keeps it.
      let pr = (fa.cy - edgeY) / pspan;
      pr = pr < 0 ? 0 : pr > 1 ? 1 : pr;
      pr = pr * pr * (3 - 2 * pr);
      g.globalAlpha = 1 - (1 - baseA) * pr;
      // warm-biased resolve — endpoints exact, warm greys midway (cooling metal, not concrete)
      let R = fa.d[0] + (CREAM[0] - fa.d[0]) * Math.pow(v, 0.78);
      let G = fa.d[1] + (CREAM[1] - fa.d[1]) * Math.pow(v, 0.9);
      let B = fa.d[2] + (CREAM[2] - fa.d[2]) * Math.pow(v, 1.08);
      let k = 1;
      if (!reduce && v > 0.3 && v < 0.88) {
        // the set-glint: a small brightness lift as the crystal seats, gone once cream
        k = 1 + 0.05 * Math.sin(((v - 0.3) / 0.58) * Math.PI);
      }
      if (shimmer && fa.sh) {
        // slow, in-place tonal flicker; strongest mid-resolve, zero once cream (calm for type)
        k *= 1 + Math.sin(time * 0.0009 + fa.ph) * 0.13 * (1 - v) * (v + 0.15);
      }
      R = Math.min(CREAM[0], R * k); G = Math.min(CREAM[1], G * k); B = Math.min(CREAM[2], B * k);
      // presence: sink the resolved tone toward the cover's black near its edge
      R = PLANE[0] + (R - PLANE[0]) * pr;
      G = PLANE[1] + (G - PLANE[1]) * pr;
      B = PLANE[2] + (B - PLANE[2]) * pr;
      const s = fa.sp;
      const u = reduce ? -1 : (v - 0.03) / 0.59; // the crack window, v 0.03 → 0.62
      if (u > 0 && u < 1) {
        // the seam parts: full facet as iridescent underfill (the machine's light inside the
        // fracture) … the light cools as the field sets: full glow in the early cracks, faint
        // by the time the cream carries the view (no hot outlines on a mostly-set field)
        const bump = Math.sin(Math.PI * u);
        const m = 0.34 * bump * (1 - 0.6 * curF);
        // sample the thin-film ramp: spatial sweep along the diagonal + slow drift + jitter,
        // ping-ponged (triangle wave) so neighbours never sit across a hard violet→gold seam
        let ht = (fa.cx + fa.cy) / (fcanvas.width + fcanvas.height) * 0.9 + time * 0.000022 + fa.ph * 0.03;
        ht = ht - Math.floor(ht);
        const IR = iridAt(ht < 0.5 ? ht * 2 : 2 - ht * 2);
        // the lit underfill sinks with the same presence — no glowing seam can meet the cover
        g.fillStyle = 'rgb(' +
          ((PLANE[0] + ((fa.d[0] + (IR[0] - fa.d[0]) * m) - PLANE[0]) * pr) | 0) + ',' +
          ((PLANE[1] + ((fa.d[1] + (IR[1] - fa.d[1]) * m) - PLANE[1]) * pr) | 0) + ',' +
          ((PLANE[2] + ((fa.d[2] + (IR[2] - fa.d[2]) * m) - PLANE[2]) * pr) | 0) + ')';
        g.strokeStyle = g.fillStyle;
        g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
        g.fill(); g.stroke();
        // queue the seam ring for the neon pass (drawn after the field, additive). The light's
        // strength rides the crack envelope × presence — AND the facet's own nucleation motion
        // (its remaining chase distance), so the neon flares while the seam is actually parting
        // and dies as the facet comes to rest: a transient of the CRACKING, never a held state.
        // (A front-line facet parked mid-window at scroll-rest would otherwise hold its ring lit.)
        const act = Math.min(1, Math.abs(fa.tgt - fa.cur) * 25);
        const na = bump * act * pr * (1 - 0.35 * curF);
        if (na > 0.02) {
          const q = neonN * 10;
          neon[q] = s[0]; neon[q + 1] = s[1]; neon[q + 2] = s[2]; neon[q + 3] = s[3];
          neon[q + 4] = s[4]; neon[q + 5] = s[5];
          neon[q + 6] = IR[0]; neon[q + 7] = IR[1]; neon[q + 8] = IR[2]; neon[q + 9] = na;
          neonN++;
        }
        // … then the crystal seats: the facet contracted about its centroid, sealing at the set
        const sc = Math.max(0.4, 1 - (Math.min(3 * dpr, fa.md * 0.08) * bump) / fa.md);
        g.fillStyle = 'rgb(' + (R | 0) + ',' + (G | 0) + ',' + (B | 0) + ')';
        g.beginPath();
        g.moveTo(fa.cx + (s[0] - fa.cx) * sc, fa.cy + (s[1] - fa.cy) * sc);
        g.lineTo(fa.cx + (s[2] - fa.cx) * sc, fa.cy + (s[3] - fa.cy) * sc);
        g.lineTo(fa.cx + (s[4] - fa.cx) * sc, fa.cy + (s[5] - fa.cy) * sc);
        g.closePath(); g.fill();
      } else {
        g.fillStyle = 'rgb(' + (R | 0) + ',' + (G | 0) + ',' + (B | 0) + ')';
        g.strokeStyle = g.fillStyle;
        g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
        g.fill(); g.stroke(); // the self-stroke seals antialiasing seams between neighbours
      }
    }
    // — the neon pass: the queued seam rings, stroked as LIGHT over the finished field —
    if (neonN) {
      g.globalCompositeOperation = 'lighter';
      const wHalo = Math.min(5 * dpr, 7);
      const wCore = Math.max(1, 1.2 * dpr);
      for (let i = 0; i < neonN; i++) {
        const q = i * 10, a = neon[q + 9];
        const r = neon[q + 6], gg = neon[q + 7], b = neon[q + 8];
        g.beginPath();
        g.moveTo(neon[q], neon[q + 1]); g.lineTo(neon[q + 2], neon[q + 3]);
        g.lineTo(neon[q + 4], neon[q + 5]); g.closePath();
        // halo — the bloom escaping onto the neighbouring faces
        g.globalAlpha = 0.26 * a;
        g.lineWidth = wHalo;
        g.strokeStyle = 'rgb(' + (r | 0) + ',' + (gg | 0) + ',' + (b | 0) + ')';
        g.stroke();
        // core — thin and near-white-hot on the seam line itself (hue pulled 55% to white)
        g.globalAlpha = 0.9 * a;
        g.lineWidth = wCore;
        g.strokeStyle = 'rgb(' +
          ((r + (255 - r) * 0.55) | 0) + ',' +
          ((gg + (255 - gg) * 0.55) | 0) + ',' +
          ((b + (255 - b) * 0.55) | 0) + ')';
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
    // — the loose facet: the breath (and, focused, its hairline); the seam's flare / afterglow —
    drawKeyExtras(time);
    drawSeamFX(time);
  };

  // The life loop — advances every facet toward its scroll-driven target (the nucleation settle)
  // and carries the shimmer. Runs only while unsettled or visibly mid-resolve; self-stops on the
  // dark and on the cream. Never started under reduced motion (static scroll-tracked draws there).
  let raf = 0, looping = false, lastT = 0;
  const advance = (dt) => {
    let maxD = 0;
    const n = dt / 16.7;
    for (const fa of facets) {
      const d = fa.tgt - fa.cur;
      const ad = d < 0 ? -d : d;
      if (ad < 0.0005) { fa.cur = fa.tgt; continue; }
      if (ad > maxD) maxD = ad;
      fa.cur += d * (1 - Math.pow(1 - fa.rate, n));
    }
    return maxD;
  };
  const tick = (now) => {
    if (!looping) return;
    if (roomState === 'in') {
      // the room owns the screen (opaque above the band) — the band's life idles rather
      // than repaint unseen frames all visit; every way out of the room hands it back
      // (closeRoom's coda path and settleRoomShut both setLoop(true))
      looping = false;
      return;
    }
    const dt = Math.min(50, Math.max(1, now - lastT));
    lastT = now;
    const maxD = advance(dt);
    draw(now);
    if (maxD > 0.0005 || (curF > 0.02 && curF < 0.92) || fxOn()) raf = requestAnimationFrame(tick);
    else looping = false;
  };
  const setLoop = (on) => {
    if (on === looping) return;
    looping = on;
    if (on) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
    else cancelAnimationFrame(raf);
  };

  let sraf = 0;
  const onScroll = () => {
    if (sraf) return;
    sraf = requestAnimationFrame(() => {
      sraf = 0;
      const vh = innerHeight || 1;
      const r = band.getBoundingClientRect();
      // 0 when the band top reaches the viewport bottom; 1 when its bottom reaches ~38% up the
      // viewport (the cream close entering). The tall band keeps the mixed-facet middle off type.
      const lin = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.62 + r.height)));
      // smoothstep the front (same curve as the blob's set-veil): the crystallisation begins
      // quietly as the cabinet exits and finishes gently into the cream — no linear snap at
      // either edge of the band. Scroll-coupled colour, so it stays on under reduced motion.
      curF = lin * lin * (3 - 2 * lin);
      root.style.setProperty('--fracture', curF.toFixed(4));
      if (folioBandInk) folioBandInk(curF);
      // per-facet target: threshold resolve × the unveil gate. The band top IS the .dark-run's
      // bottom edge; nothing may light until that opaque cover has scrolled clear of a facet.
      const edge = r.top * dpr;
      edgeY = edge; // the presence fade (draw) anchors on the same cover edge
      const gspan = vh * 0.3 * dpr;
      for (const fa of facets) {
        let rr = (curF - fa.t) / fa.w;
        rr = rr < 0 ? 0 : rr > 1 ? 1 : rr;
        let gt = (fa.cy - edge) / gspan;
        gt = gt < 0 ? 0 : gt > 1 ? 1 : gt;
        fa.tgt = rr * (gt * gt * (3 - 2 * gt));
      }
      // the loose facet — the room's ground guard + the live window (see the block above draw).
      // Wheel/touch/keys are held while the hollow is open, so the only way this fires mid-room
      // is a scrollbar drag — the world moved, so the room lets go at once (byte-clean close).
      if (keyFa && keyBtn) {
        if (roomState !== 'idle' && Math.abs(window.scrollY - openScrollY) > 2) closeRoom(true);
        let pk = (keyFa.cy - edge) / pspan;
        pk = pk < 0 ? 0 : pk > 1 ? 1 : pk;
        setKeyLive(
          pk * pk * (3 - 2 * pk) > 0.3 && // the cover has cleared (tone arriving — door wakes early)
          keyFa.tgt < 0.02 && //             the crystal is still un-set (dark; breath territory)
          r.top < keyTop - 30 && //          the band itself covers the facet's fixed screen spot
          r.bottom > keyBot + 30, //         … so the button can never sit over neighbouring type
        );
      }
      if (reduce) {
        for (const fa of facets) fa.cur = fa.tgt;
        draw(performance.now()); // static: the resolve tracks scroll, nothing else moves
      } else if (curF > 0.001) {
        setLoop(true);
      } else {
        // fully back on the dark (layer hidden): snap the field dark so re-entry nucleates fresh
        for (const fa of facets) fa.cur = fa.tgt;
        if (!looping) draw(performance.now());
      }
    });
  };

  resize();
  placeKey();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    resize();
    placeKey();
    onScroll();
    if (roomState !== 'idle') {
      hfResize(); // the room refits its cover transform live
      hfMeasureHush();
      if (reduce) hfDraw(performance.now(), true);
    }
  }, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { resize(); placeKey(); onScroll(); });
  }
}

// ── 3. (retired) The specimen bench ─────────────────────────────────────────────────────────
// The horizontal drag-rail went with the invented specimens (2026-07-05). The cabinet's two
// castings are static entries: their facet assembly is pure CSS off the shared reveal IO
// (per-facet transition-delay), the ember answer is :hover / :focus-within — no JS here.

// ── 5. The running folio ────────────────────────────────────────────────────────────────────
// The broadsheet's sheet-corner: one centre-band IntersectionObserver watches the sections'
// data-folio labels and names the sheet under the reader. Label changes tick through the
// letterpress mask (folioSwap; plain text swap under reduced motion). Ink flips with the
// ground: .folio--ink on the cream sections, scroll-coupled through the band (folioBandInk).
const folio = document.querySelector('.folio');
if (folio) {
  const line = folio.querySelector('.folio__line');
  let cur = null;
  let tSwap = 0;
  let tDone = 0;
  const show = (el) => {
    if (el === cur) return;
    cur = el;
    const label = el.getAttribute('data-folio');
    if (!el.hasAttribute('data-fracture-band')) {
      folio.classList.toggle('folio--ink', el.classList.contains('on-cream'));
    }
    if (reduce) {
      line.textContent = label;
      return;
    }
    clearTimeout(tSwap);
    clearTimeout(tDone);
    line.classList.remove('folio-swap');
    void line.offsetWidth; // restart the tick cleanly on rapid section changes
    line.classList.add('folio-swap');
    tSwap = setTimeout(() => {
      line.textContent = label;
    }, 175);
    tDone = setTimeout(() => line.classList.remove('folio-swap'), 400);
  };
  const fio = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) show(e.target);
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  );
  document.querySelectorAll('[data-folio]').forEach((s) => fio.observe(s));
  folioBandInk = (f) => {
    if (cur && cur.hasAttribute('data-fracture-band')) {
      folio.classList.toggle('folio--ink', f > 0.45);
    }
  };
}

// ── 4. The hel clock ────────────────────────────────────────────────────────────────────────
const clock = document.querySelector('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const tick = () => {
    clock.textContent = 'hel ' + fmt.format(new Date());
  };
  tick();
  setInterval(tick, 1000);
}

// ── 6. The copy instrument ──────────────────────────────────────────────────────────────────
// Click-to-copy for the contact address (the begin control + the footer's contact row). The
// mailto stays the primary path; this serves every machine without a configured mail client.
// The verb answers "copied" through the folio's letterpress tick (plain swap under reduced
// motion), then settles back. One polite live region announces the copy for screen readers.
const copyBtns = document.querySelectorAll('[data-copy]');
if (copyBtns.length) {
  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;';
  document.body.appendChild(status);

  copyBtns.forEach((btn) => {
    const tick = btn.querySelector('.copy-tick');
    let tText = 0;
    let tRevert = 0;
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      let ok = true;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand('copy');
          ta.remove();
        } catch {
          ok = false;
        }
      }
      if (!ok) return;
      clearTimeout(tText);
      clearTimeout(tRevert);
      btn.classList.remove('is-copied');
      if (tick) void tick.offsetWidth; // restart the tick cleanly on rapid re-copies
      btn.classList.add('is-copied');
      const swap = () => { if (tick) tick.textContent = 'copied'; };
      if (reduce) swap();
      else tText = setTimeout(swap, 175); // the label changes inside the letterpress mask
      status.textContent = text + ' copied to the clipboard';
      tRevert = setTimeout(() => {
        btn.classList.remove('is-copied');
        if (tick) tick.textContent = 'copy';
        status.textContent = '';
      }, 2100);
    });
  });
}

// ── 7. The scroll-up nav ──────────────────────────────────────────────────────────────────────
// The hero's own nav leaves the viewport with the hero; past the hero this liquid-glass panel
// appears on any scroll-UP (and hides on scroll-down), so any destination — Author included — is
// one tap away from mid-page without a return to the top. State only: the glass look and the
// no-motion reduced-motion presentation live in base.css. One passive scroll listener → rAF (the
// annealing light's own pattern). The orange progress indicator is independent and untouched.
const scrollnav = document.querySelector('[data-scrollnav]');
if (scrollnav) {
  const heroSection = document.querySelector('#dark section'); // the hero (first section)
  let showAfter = window.innerHeight; // past the hero — recomputed from its true height
  const measure = () => {
    if (heroSection) {
      const r = heroSection.getBoundingClientRect();
      showAfter = Math.max(120, r.bottom + window.scrollY - 80); // absolute doc Y of the hero foot
    }
  };
  let lastY = window.scrollY;
  let shown = false;
  let raf = 0;
  const setShown = (on) => {
    if (on === shown) return;
    shown = on;
    scrollnav.classList.toggle('is-up', on);
    scrollnav.setAttribute('aria-hidden', on ? 'false' : 'true');
  };
  const apply = () => {
    raf = 0;
    const y = window.scrollY;
    const dy = y - lastY;
    if (y <= showAfter) setShown(false); // in/near the hero — its own nav is present
    else if (dy < -4) setShown(true); //     scrolling up  → reveal
    else if (dy > 4) setShown(false); //     scrolling down → hide
    lastY = y; // (a jitter < 4px keeps the current state — no flicker)
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
}
