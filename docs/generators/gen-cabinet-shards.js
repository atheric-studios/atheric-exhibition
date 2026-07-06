// Shard generator — two faceted "castings" in the crystallisation band's grammar:
// jittered points → Delaunay → warm-biased tone ramp (#050505 → paper), diagonal grain
// (warm survives lowest bottom-right), station-snapped, 1px self-stroke. Seeded.
// Emits inline-SVG polygon markup for index.html + a preview page.

// ── seeded rng ──────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Bowyer–Watson Delaunay ──────────────────────────────────────────────────
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

// ── tone ramp — the crystallisation's own warm-biased per-channel curve ────
// d → paper (247,241,226): R v^0.78 / G v^0.9 / B v^1.08, endpoints exact.
function tone(v, d) {
  const ch = (C, e) => Math.round(d + (C - d) * Math.pow(v, e));
  return [ch(247, 0.78), ch(241, 0.9), ch(226, 1.08)];
}
const hex = ([r, g, b]) => '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');

// stations — mostly un-set metal, a few risen facets, rare near-paper glints
const STATIONS = [0, 0.02, 0.045, 0.08, 0.13, 0.2, 0.3, 0.45, 0.65, 0.92];

function buildShard({ name, W, H, ring, seed, nInterior, glints, embers, delayStep }) {
  const rnd = mulberry32(seed);
  // point set: silhouette ring + edge midpoints (jittered inward) + interior jitter
  const pts = ring.map((p) => [...p]);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    pts.push([(a[0] + b[0]) / 2 + (rnd() - 0.5) * 6, (a[1] + b[1]) / 2 + (rnd() - 0.5) * 6]);
  }
  // interior: jittered grid clipped to a margin box (ring is convex-ish; hull will close it)
  const cols = Math.ceil(Math.sqrt(nInterior * (W / H)));
  const rows = Math.ceil(nInterior / cols);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = W * (0.14 + (0.72 * (c + 0.5)) / cols) + (rnd() - 0.5) * (W / cols) * 0.85;
      const y = H * (0.14 + (0.72 * (r + 0.5)) / rows) + (rnd() - 0.5) * (H / rows) * 0.85;
      pts.push([x, y]);
    }
  const tris = delaunay(pts);

  // tone per facet: diagonal grain (warm bottom-right) + noise, dark-biased, snapped
  const facets = tris.map((t) => {
    const c = [(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3];
    const g = 0.52 * (c[0] / W) + 0.48 * (c[1] / H); // 1 at bottom-right
    // dark until ~45% along the grain, then a steep warm rise; noise scaled by the rise so
    // the un-set region stays coherently near-black (the band's own mosaic behaviour)
    let v = Math.pow(Math.max(0, (g - 0.42) / 0.58), 2.2) * 0.72;
    v = v * (1 + (rnd() - 0.5) * 0.55) + (rnd() - 0.5) * 0.025;
    v = Math.max(0, v);
    // snap to nearest station
    let st = STATIONS.reduce((p, s) => (Math.abs(s - v) < Math.abs(p - v) ? s : p), 0);
    const area = Math.abs((pts[t[1]][0] - pts[t[0]][0]) * (pts[t[2]][1] - pts[t[0]][1]) - (pts[t[2]][0] - pts[t[0]][0]) * (pts[t[1]][1] - pts[t[0]][1])) / 2;
    return { t, c, st, area, d: 6 + Math.floor(rnd() * 9) };
  });
  // enforce glint budget: keep the `glints` highest-g facets nearest bottom-right at >=0.6
  facets.forEach((f) => { if (f.st >= 0.65) f.st = 0.45; });
  const brSorted = [...facets].sort((a, b) => (b.c[0] / W + b.c[1] / H) - (a.c[0] / W + a.c[1] / H));
  for (let i = 0; i < glints && i < brSorted.length; i++) brSorted[i].st = i === 0 ? 0.92 : 0.65;

  // reveal order: dark first, warm last (it cools into visibility), spatial tiebreak
  const order = [...facets].sort((a, b) => a.st - b.st || (a.c[0] + a.c[1]) - (b.c[0] + b.c[1]));
  order.forEach((f, i) => (f.delay = Math.round(i * delayStep) / 1000));

  // embers: mid-tone, mid-size facets, spread out (greedy max-min)
  const cand = facets.filter((f) => f.st >= 0.08 && f.st <= 0.3 && f.area > 900 && (0.52 * (f.c[0] / W) + 0.48 * (f.c[1] / H)) > 0.5).sort((a, b) => b.area - a.area).slice(0, 24);
  const chosen = [];
  while (chosen.length < embers && cand.length) {
    let best = null, bestD = -1;
    for (const f of cand) {
      const d = chosen.length ? Math.min(...chosen.map((c) => (c.c[0] - f.c[0]) ** 2 + (c.c[1] - f.c[1]) ** 2)) : (f.c[0] / W) * (f.c[1] / H) + f.area;
      if (d > bestD) { bestD = d; best = f; }
    }
    chosen.push(best); cand.splice(cand.indexOf(best), 1);
  }

  const poly = (f) => f.t.map((i) => pts[i].map((v) => Math.round(v * 10) / 10).join(',')).join(' ');
  let svg = '';
  for (const f of facets) {
    const fill = hex(tone(f.st, f.d));
    svg += `<polygon class="w-f" points="${poly(f)}" fill="${fill}" stroke="${fill}" style="--fd:${f.delay}s"/>\n`;
  }
  chosen.forEach((f, i) => {
    svg += `<polygon class="w-e${i === 0 ? ' w-e--k' : ''}" points="${poly(f)}"/>\n`;
  });
  console.log(`${name}: ${facets.length} facets, ${chosen.length} embers, max delay ${Math.max(...facets.map((f) => f.delay))}s`);
  return `<svg class="work__shard" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">\n${svg}</svg>`;
}

// ── the two castings ────────────────────────────────────────────────────────
// clara — upright, phone-portrait proportion; a taller crystal standing on the bench
const clara = buildShard({
  name: 'clara', W: 440, H: 560, seed: 20260705,
  ring: [[210, 4], [382, 92], [430, 300], [352, 548], [150, 530], [44, 368], [70, 120]],
  nInterior: 14, glints: 3, embers: 4, delayStep: 22,
});
// under the code — a wide spread; the open book's landscape plate
const utc = buildShard({
  name: 'under-the-code', W: 640, H: 380, seed: 424242,
  ring: [[24, 206], [210, 18], [470, 4], [610, 120], [626, 268], [430, 372], [130, 356]],
  nInterior: 17, glints: 3, embers: 4, delayStep: 20,
});

require('fs').writeFileSync(__dirname + '/shard-clara.svg.html', clara);
require('fs').writeFileSync(__dirname + '/shard-utc.svg.html', utc);

// preview page — dark plane, hover to see the embers
const page = `<!doctype html><meta charset="utf-8"><style>
  body{background:#050505;margin:0;padding:60px;display:flex;gap:80px;align-items:center;justify-content:center;min-height:100vh}
  .work{width:38%}
  .work__shard{width:100%;height:auto;display:block}
  .w-f{stroke-width:1}
  .w-e{fill:#ff4d1f;stroke:#ff4d1f;stroke-width:1;opacity:0;transition:opacity .5s}
  .w-e--k{opacity:.3}
  .work:hover .w-e{opacity:.85}
</style>
<div class="work">${clara}</div>
<div class="work">${utc}</div>`;
require('fs').writeFileSync(__dirname + '/preview.html', page);
console.log('wrote preview.html');
