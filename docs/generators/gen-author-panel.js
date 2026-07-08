// Author-panel generator — the /thought#author plate, rebuilt as a TRIANGULATED PHOTO PANEL
// in the cabinet's own facet grammar (jittered ring → Delaunay → shared-edge seam network,
// seeded). Unlike the stones/shards this carries no tone ramp: every facet is filled from ONE
// continuous photograph (a userSpaceOnUse <pattern>), so the image stays coherent while facets
// move. Emits the inline-SVG for thought.html + a standalone preview.
//
// What each facet carries, baked inline:
//   --fd  one-shot FLOAT-IN delay (center-out order); the facet eases from --fx/--fy to its seat
//   --fx/--fy  its small start offset (positional convergence, not a colour resolve)
//   --lx/--ly  its HOVER LIFT vector (radial from centre, +jitter) — opens the candy seams
// The seam network (halo+core candy strokes) is laid on REAL shared mesh edges radiating from a
// central hub, exactly like fig. 07 (clara). All motion/light lives in thought.html's CSS.
//
// Same policy as gen-thesis-stones.js / gen-cabinet-shards.js: this file stays with the docs,
// the SVG in thought.html is the artifact. NEVER hand-edit the polygons — re-run this.

// ── seeded rng ──────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Bowyer–Watson Delaunay (verbatim from gen-cabinet-shards.js) ────────────
function delaunay(pts) {
  const n = pts.length;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const [x, y] of pts) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const dx = maxX - minX, dy = maxY - minY, dm = Math.max(dx, dy), mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const P = pts.concat([[mx - 20 * dm, my - dm], [mx, my + 20 * dm], [mx + 20 * dm, my - dm]]);
  const si = [n, n + 1, n + 2];
  let tris = [[n, n + 1, n + 2]];
  const circum = (t) => {
    const [a, b, c] = t.map((i) => P[i]);
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
    const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
    return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2];
  };
  for (let i = 0; i < n; i++) {
    const p = P[i];
    const bad = [];
    for (const t of tris) {
      const [ux, uy, r2] = circum(t);
      if ((p[0] - ux) ** 2 + (p[1] - uy) ** 2 < r2) bad.push(t);
    }
    const edges = new Map();
    for (const t of bad)
      for (const e of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const k = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]);
        edges.set(k, edges.has(k) ? null : e);
      }
    tris = tris.filter((t) => !bad.includes(t));
    for (const e of edges.values()) if (e) tris.push([e[0], e[1], i]);
  }
  return tris.filter((t) => !t.some((i) => si.includes(i)));
}

const r1 = (v) => Math.round(v * 10) / 10;

function buildPanel({ W, H, ring, seed, nInterior, edgeSub, floatMin, floatMax, liftBase, liftGain, delayStep, nSeams }) {
  const rnd = mulberry32(seed);
  const cx = W / 2, cy = H / 2;

  // point set — EVEN density with a slight edge bias, so the boundary fractures at least as much
  // as the centre. (The old build confined interior points to the central 68% of the box, so the
  // edges came out coarse — the flaw this pass corrects.) Three point sources:
  //   · the ring silhouette corners (the clip outline),
  //   · SUBDIVIDED ring edges — edgeSub points per edge, nudged inward + jittered: the guaranteed
  //     boundary fracture (replaces the single per-edge midpoint),
  //   · a jittered grid across the FULL box, kept only where it lands inside the ring
  //     (point-in-polygon), so interior density stays uniform right out to the edge.
  const pts = ring.map((p) => [...p]);
  const ringN = ring.length;
  const inPoly = (x, y) => {
    let inside = false;
    for (let i = 0, j = ringN - 1; i < ringN; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  for (let i = 0; i < ringN; i++) {
    const a = ring[i], b = ring[(i + 1) % ringN];
    const ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1;
    let nx = -ey / el, ny = ex / el;                         // edge normal…
    if (nx * (cx - a[0]) + ny * (cy - a[1]) < 0) { nx = -nx; ny = -ny; } // …point it inward
    for (let s = 1; s <= edgeSub; s++) {
      const t = (s + (rnd() - 0.5) * 0.5) / (edgeSub + 1);   // along the edge, jittered
      const jn = 2 + rnd() * 6;                               // a few px inward of the clip line
      pts.push([a[0] + ex * t + nx * jn, a[1] + ey * t + ny * jn]);
    }
  }
  const cell = Math.sqrt((W * H) / nInterior);               // ~nInterior points over the box
  const cols = Math.max(1, Math.round(W / cell));
  const rows = Math.max(1, Math.round(H / cell));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = W * ((c + 0.5) / cols) + (rnd() - 0.5) * (W / cols) * 0.9;
      const y = H * ((r + 0.5) / rows) + (rnd() - 0.5) * (H / rows) * 0.9;
      if (inPoly(x, y)) pts.push([x, y]);
    }

  const tris = delaunay(pts);

  // maxR — the farthest facet centroid from centre, to normalise the radial lift
  const facets = tris.map((t) => {
    const c = [(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3];
    return { t, c, r: Math.hypot(c[0] - cx, c[1] - cy) };
  });
  const maxR = Math.max(...facets.map((f) => f.r)) || 1;

  facets.forEach((f) => {
    // FLOAT start offset: a small handcrafted scatter (random direction, seeded magnitude)
    const ang = rnd() * Math.PI * 2;
    const mag = floatMin + rnd() * (floatMax - floatMin);
    f.fx = r1(Math.cos(ang) * mag);
    f.fy = r1(Math.sin(ang) * mag);
    // HOVER LIFT: radial OUT from centre, scaled mildly by distance, + a little jitter
    const nx = (f.c[0] - cx) / (f.r || 1), ny = (f.c[1] - cy) / (f.r || 1);
    const lm = liftBase + liftGain * (f.r / maxR);
    f.lx = r1(nx * lm + (rnd() - 0.5) * 0.8);
    f.ly = r1(ny * lm + (rnd() - 0.5) * 0.8);
  });

  // FLOAT ORDER: centre-out — the image coalesces from the middle (seed tiebreak for stability)
  const order = [...facets].sort((a, b) => a.r - b.r || (a.c[0] + a.c[1]) - (b.c[0] + b.c[1]));
  order.forEach((f, i) => (f.delay = Math.round(i * delayStep) / 1000));

  // SEAM NETWORK: shared edges (count 2), a radiating star from the hub nearest centre + one
  // outward continuation from each arm — a coherent crack network on REAL mesh edges.
  const edgeCount = new Map();
  for (const t of tris)
    for (const e of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
      const k = Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]);
      edgeCount.set(k, (edgeCount.get(k) || 0) + 1);
    }
  const shared = [...edgeCount.entries()].filter(([, n]) => n === 2).map(([k]) => k.split('_').map(Number));
  const distC = (i) => Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
  // hub = the interior vertex nearest the centre that actually carries shared edges
  const incident = (v) => shared.filter((e) => e[0] === v || e[1] === v);
  let hub = -1, hubD = 1e9;
  for (let i = ringN; i < pts.length; i++) if (incident(i).length && distC(i) < hubD) { hubD = distC(i); hub = i; }
  const picked = [];
  const key = (e) => Math.min(e[0], e[1]) + '_' + Math.max(e[0], e[1]);
  const seen = new Set();
  const add = (e) => { const k = key(e); if (!seen.has(k)) { seen.add(k); picked.push(e); } };
  if (hub >= 0) {
    const arms = incident(hub).sort((a, b) => distC(a[0] === hub ? a[1] : a[0]) - distC(b[0] === hub ? b[1] : b[0]));
    for (const a of arms) add(a);
    // one outward continuation per arm endpoint
    for (const a of [...arms]) {
      const far = a[0] === hub ? a[1] : a[0];
      const cont = incident(far).filter((e) => key(e) !== key(a))
        .sort((p, q) => distC(q[0] === far ? q[1] : q[0]) - distC(p[0] === far ? p[1] : p[0]));
      if (cont[0]) add(cont[0]);
    }
  }
  // top up from the most central remaining shared edges if we are short
  if (picked.length < nSeams) {
    const rest = shared.filter((e) => !seen.has(key(e)))
      .sort((a, b) => (distC(a[0]) + distC(a[1])) - (distC(b[0]) + distC(b[1])));
    for (const e of rest) { if (picked.length >= nSeams) break; add(e); }
  }
  const seams = picked.slice(0, nSeams);

  // ── emit ──────────────────────────────────────────────────────────────────
  const poly = (t) => t.map((i) => pts[i].map(r1).join(',')).join(' ');
  let facetSvg = '';
  for (const f of facets)
    facetSvg += `        <polygon class="apf" points="${poly(f.t)}" style="--fd:${f.delay}s;--fx:${f.fx}px;--fy:${f.fy}px;--lx:${f.lx}px;--ly:${f.ly}px"/>\n`;

  let seamSvg = '';
  seams.forEach((e, i) => {
    const [x1, y1] = pts[e[0]].map(r1), [x2, y2] = pts[e[1]].map(r1);
    const sp = -r1((i / seams.length) * 5.6); // de-sync the breath like fig. 07
    seamSvg += `        <g class="author__seam" style="--sp:${sp}s"><line class="author__seam-halo" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="author__seam-core" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></g>\n`;
  });

  const ringPts = ring.map((p) => p.map(r1).join(',')).join(' ');
  const svg =
`<svg class="author__mesh" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
      <defs>
        <!-- the photograph, one continuous plate; userSpaceOnUse so every facet samples the
             SAME image and a moved facet carries its own slice (float-in / lift stay coherent) -->
        <pattern id="authorPhoto" patternUnits="userSpaceOnUse" width="${W}" height="${H}">
          <image href="img/author.webp?v=1" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        <!-- the candy gradient — the cabinet's own illumination (fig. 07 / claraCandy stops),
             reused verbatim for the backing glow and the seam strokes. No new light. -->
        <linearGradient id="authorSeam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff2e88"/>
          <stop offset="0.52" stop-color="#ff9e2e"/>
          <stop offset="1" stop-color="#5f7bff"/>
        </linearGradient>
        <clipPath id="authorBound"><polygon points="${ringPts}"/></clipPath>
      </defs>
      <g clip-path="url(#authorBound)">
        <!-- candy light BEHIND the panel; occluded at rest, shows through the seams on lift -->
        <polygon class="author__backing" points="${ringPts}" fill="url(#authorSeam)"/>
${facetSvg}      </g>
      <g class="author__seams" aria-hidden="true">
${seamSvg}      </g>
    </svg>`;

  console.log(`author-panel: ${facets.length} facets, ${seams.length} seams, hub@${hub}, max float delay ${Math.max(...facets.map((f) => f.delay))}s`);
  return svg;
}

// ── the panel — photo aspect 1037×1120 ≈ 0.926; viewBox 460×497 ─────────────
// irregular convex silhouette (asymmetric octagon), clearly not rectangular.
const panel = buildPanel({
  W: 460, H: 497, seed: 20260707,
  ring: [[168, 9], [332, 30], [451, 158], [436, 372], [338, 489], [120, 476], [15, 322], [34, 121]],
  nInterior: 40,               // grid points over the FULL box; ~70% land inside the ring
  edgeSub: 2,                  // subdivisions per ring edge — the boundary fracture
  floatMin: 6, floatMax: 13,   // start-offset magnitude (viewBox units)
  liftBase: 1.0, liftGain: 1.3, // hover lift: radial px, base + gain*normalisedRadius (subtle)
  delayStep: 11,               // center-out cadence (ms)
  nSeams: 14,
});

const fs = require('fs');
fs.writeFileSync(__dirname + '/author-panel.svg.html', panel);

const preview = `<!doctype html><meta charset="utf-8"><title>author panel</title><style>
  body{background:#050505;margin:0;min-height:100vh;display:flex;gap:70px;align-items:center;justify-content:center;font-family:monospace}
  .stage{width:384px}
  .author__mesh{display:block;width:100%;height:auto}
  .apf{fill:url(#authorPhoto);stroke:url(#authorPhoto);stroke-width:.75;transform-box:fill-box;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
  .stage.is-in .apf{animation:apfFloat .7s cubic-bezier(.2,.8,.2,1) var(--fd) backwards}
  @keyframes apfFloat{from{opacity:0;transform:translate(var(--fx),var(--fy))}}
  .author__backing,.author__seams{opacity:0;transition:opacity .5s cubic-bezier(.2,.8,.2,1)}
  .author__seam{animation:seamBreath 5.6s ease-in-out infinite;animation-delay:var(--sp,0s)}
  .author__seam-halo{stroke:url(#authorSeam);stroke-width:6;stroke-linecap:round;opacity:.16}
  .author__seam-core{stroke:url(#authorSeam);stroke-width:1.3;stroke-linecap:round;opacity:.85}
  @keyframes seamBreath{0%,100%{opacity:.45}50%{opacity:1}}
  .stage:hover .apf{transform:translate(var(--lx),var(--ly))}
  .stage:hover .author__backing{opacity:.85}
  .stage:hover .author__seams{opacity:1}
</style>
<div class="stage is-in">${panel}</div>
<script>
  // re-trigger the float-in on click, for inspection
  const s=document.querySelector('.stage');
  s.addEventListener('click',()=>{s.classList.remove('is-in');void s.offsetWidth;s.classList.add('is-in')});
</script>`;
fs.writeFileSync(__dirname + '/author-panel-preview.html', preview);
console.log('wrote author-panel.svg.html + author-panel-preview.html');
