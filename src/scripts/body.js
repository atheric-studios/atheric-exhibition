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

  // ── THE LOOSE FACET & THE HOLLOW — the band's one secret (rebuilt 2026-07-17) ──────────────
  // ONE crystal of the field never quite set — and it is a DOOR. Behind it lies the hollow:
  // the casting's hidden room (a native <dialog>, markup in index.html, dress in fracture.css).
  // Everything on the canvas here is overlay only: the field's state (fa.cur / fa.tgt) is never
  // touched, so when the room lets go, the next ordinary frame IS the resting band.
  //
  //   the hint    while the key facet is dark, unveiled and covered by the band, its tone
  //               carries a sub-perceptual warm breath (≈ +3% luminance, 4.5 s cycle, shaped
  //               like breathing — quick swell, long settle), painted in the field's own frame
  //               and sunk by the same presence fade. Off under reduced motion. Nothing else
  //               anywhere on the site hints.
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
  const scene = room ? room.querySelector('.hollow__scene') : null;

  let roomState = 'idle'; // idle → flight → in → out → idle
  let flareT0 = 0, codaT0 = 0; // canvas seam moments (entry flare / exit afterglow)
  const FLARE = 420, CODA = 640;
  let openScrollY = 0;
  let tIn1 = 0, tIn2 = 0, tOut1 = 0;
  let keyLive = false, keyFocus = false, keyTop = 0, keyBot = 0;

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
    keyBtn.classList.toggle('facet-key--live', on);
    keyBtn.tabIndex = on ? 0 : -1;
    if (!on) {
      keyFocus = false;
      if (document.activeElement === keyBtn) keyBtn.blur();
    }
  };

  // the breath — and, on :focus-visible, the hairline. Runs inside the field's own frame.
  const drawKeyExtras = (time) => {
    if (!keyFa || roomState !== 'idle' || flareT0 || codaT0 || curF <= 0.001) return;
    const s = keyFa.sp;
    if (!reduce && keyFa.cur < 0.04) {
      let pk = (keyFa.cy - edgeY) / pspan; // the same presence fade as the field's paint
      pk = pk < 0 ? 0 : pk > 1 ? 1 : pk;
      pk = pk * pk * (3 - 2 * pk);
      if (pk > 0.02) {
        // breath-shaped swell — quick inhale, long settle (the ^1.6 keeps a resting trough)
        const b = Math.pow(0.5 + 0.5 * Math.sin(time * 0.0014), 1.6) * pk;
        const minX = Math.min(s[0], s[2], s[4]), minY = Math.min(s[1], s[3], s[5]);
        const maxX = Math.max(s[0], s[2], s[4]), maxY = Math.max(s[1], s[3], s[5]);
        g.save();
        g.beginPath();
        g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
        g.clip();
        g.clearRect(minX - 1, minY - 1, maxX - minX + 2, maxY - minY + 2);
        // repaint exactly what the field just painted (v ≈ 0), lifted a whisper warm
        const baseA = Math.min(1, 0.8 + 0.2 * (curF / 0.2));
        g.globalAlpha = 1 - (1 - baseA) * pk;
        const R = PLANE[0] + (keyFa.d[0] + 9 * b - PLANE[0]) * pk;
        const G2 = PLANE[1] + (keyFa.d[1] + 6 * b - PLANE[1]) * pk;
        const B2 = PLANE[2] + (keyFa.d[2] + 3 * b - PLANE[2]) * pk;
        g.fillStyle = 'rgb(' + (R | 0) + ',' + (G2 | 0) + ',' + (B2 | 0) + ')';
        g.strokeStyle = g.fillStyle;
        g.beginPath();
        g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.lineTo(s[4], s[5]); g.closePath();
        g.fill();
        g.stroke(); // seal the cleared antialiasing edge, like the field's self-stroke
        g.restore();
      }
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
    if (!centerScrolls()) e.preventDefault();
  };
  const guardKeys = (e) => {
    const k = e.key;
    if (k === ' ' && e.target === seal) return; // space still presses the seal
    if ((k === 'ArrowUp' || k === 'ArrowDown' || k === 'PageUp' || k === 'PageDown' ||
      k === 'Home' || k === 'End' || k === ' ') && !centerScrolls()) e.preventDefault();
  };
  const addGuards = () => {
    addEventListener('wheel', guardWheel, { passive: false });
    addEventListener('touchmove', guardWheel, { passive: false });
    addEventListener('keydown', guardKeys, true);
  };
  const removeGuards = () => {
    removeEventListener('wheel', guardWheel, { passive: false });
    removeEventListener('touchmove', guardWheel, { passive: false });
    removeEventListener('keydown', guardKeys, true);
  };

  // the pointer-damped parallax — the light answers the hand (fine pointers, full motion only)
  let pRaf = 0;
  const onRoomMove = (e) => {
    if (pRaf || !scene) return;
    pRaf = requestAnimationFrame(() => {
      pRaf = 0;
      const px = e.clientX / innerWidth - 0.5;
      const py = e.clientY / innerHeight - 0.5;
      scene.style.transform = 'translate(' + (px * -14).toFixed(1) + 'px,' + (py * -10).toFixed(1) + 'px)';
    });
  };
  const finePointer = matchMedia('(pointer: fine)');

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
    room.classList.remove('hollow--in', 'hollow--flight', 'hollow--out', 'hollow--return');
    if (iris) {
      iris.style.display = 'none';
      iris.style.transform = '';
    }
    if (irisDark) irisDark.style.opacity = '';
    if (scene) scene.style.transform = '';
    removeGuards();
    room.removeEventListener('pointermove', onRoomMove);
    if (room.open) room.close();
    roomState = 'idle';
    // the door is still live (nothing scrolled) — hand the key back to the visitor
    if (keyLive && keyBtn) keyBtn.focus({ preventScroll: true });
  };

  const openRoom = () => {
    if (!room || roomState !== 'idle' || !keyLive) return;
    roomState = 'flight';
    openScrollY = window.scrollY;
    clearRoomTimers();
    addGuards();
    if (finePointer.matches && !reduce) room.addEventListener('pointermove', onRoomMove);
    if (reduce) {
      // composed and still: a quiet fade, no flight (the iris is display:none in CSS)
      room.showModal();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          room.classList.add('hollow--in');
          roomState = 'in';
        });
      });
      return;
    }
    flareT0 = performance.now(); // the seam answers THIS frame
    codaT0 = 0;
    placeIris();
    iris.style.display = 'block';
    iris.style.transform = 'scale(1)';
    irisDark.style.opacity = '0';
    room.showModal();
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
        let rr = (curF - fa.t) / WIDTH;
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
          pk * pk * (3 - 2 * pk) > 0.4 && // the cover has truly cleared (presence ≈ full tone)
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
  window.addEventListener('resize', () => { resize(); placeKey(); onScroll(); }, { passive: true });
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
