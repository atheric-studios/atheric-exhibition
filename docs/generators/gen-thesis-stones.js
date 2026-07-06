// Thesis-stone generator — three small faceted "stones" for /thought, in the
// crystallisation band's grammar (jittered ring → Delaunay → warm-biased tone ramp
// #050505 → paper, station-snapped, 1px self-stroke; seeded). The three stones enact
// the annealing down the page: stone i is un-set metal (dark), stone ii is mid-resolve
// (warm greys risen), stone iii is nearly set (one near-paper plate). No embers, no
// loops — the stones assemble once on reveal (per-facet --fd delays) and rest.
// Emits inline-SVG polygon markup for thought.html + a preview page.
// Same policy as gen-cabinet-shards.js: this file stays with the docs, out of the
// repo; the SVGs in thought.html are the artifact. Never hand-edit the polygons.

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

// ── tone ramp — the crystallisation's own warm-biased per-channel curve ────
// d → paper (247,241,226): R v^0.78 / G v^0.9 / B v^1.08, endpoints exact.
function tone(v, d) {
  const ch = (C, e) => Math.round(d + (C - d) * Math.pow(v, e));
  return [ch(247, 0.78), ch(241, 0.9), ch(226, 1.08)];
}
const hex = ([r, g, b]) => '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');

// stations — the cabinet generator's own ladder
const STATIONS = [0, 0.02, 0.045, 0.08, 0.13, 0.2, 0.3, 0.45, 0.65, 0.92];

function buildStone({ name, W, H, ring, seed, nInterior, riseStart, riseGain, glints, delayStep }) {
  const rnd = mulberry32(seed);
  const pts = ring.map((p) => [...p]);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    pts.push([(a[0] + b[0]) / 2 + (rnd() - 0.5) * 5, (a[1] + b[1]) / 2 + (rnd() - 0.5) * 5]);
  }
  const cols = Math.ceil(Math.sqrt(nInterior * (W / H)));
  const rows = Math.ceil(nInterior / cols);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = W * (0.18 + (0.64 * (c + 0.5)) / cols) + (rnd() - 0.5) * (W / cols) * 0.8;
      const y = H * (0.18 + (0.64 * (r + 0.5)) / rows) + (rnd() - 0.5) * (H / rows) * 0.8;
      pts.push([x, y]);
    }
  const tris = delaunay(pts);

  // tone per facet: the one diagonal grain (warm survives lowest bottom-right) + noise,
  // then station-snapped. riseStart/riseGain set how far this stone has annealed.
  const facets = tris.map((t) => {
    const c = [(pts[t[0]][0] + pts[t[1]][0] + pts[t[2]][0]) / 3, (pts[t[0]][1] + pts[t[1]][1] + pts[t[2]][1]) / 3];
    const g = 0.52 * (c[0] / W) + 0.48 * (c[1] / H);
    let v = Math.pow(Math.max(0, (g - riseStart) / (1 - riseStart)), 2.0) * riseGain;
    v = v * (1 + (rnd() - 0.5) * 0.5) + (rnd() - 0.5) * 0.02;
    v = Math.max(0, v);
    let st = STATIONS.reduce((p, s) => (Math.abs(s - v) < Math.abs(p - v) ? s : p), 0);
    return { t, c, st, d: 6 + Math.floor(rnd() * 9) };
  });
  // glint budget: the given stations pressed onto the facets nearest bottom-right
  facets.forEach((f) => { if (f.st > glints[0]) f.st = 0.3; });
  const brSorted = [...facets].sort((a, b) => (b.c[0] / W + b.c[1] / H) - (a.c[0] / W + a.c[1] / H));
  glints.forEach((gst, i) => { if (brSorted[i]) brSorted[i].st = gst; });

  // reveal order: dark first, warm last (it cools into visibility), spatial tiebreak
  const order = [...facets].sort((a, b) => a.st - b.st || (a.c[0] + a.c[1]) - (b.c[0] + b.c[1]));
  order.forEach((f, i) => (f.delay = Math.round(i * delayStep) / 1000));

  const poly = (f) => f.t.map((i) => pts[i].map((v) => Math.round(v * 10) / 10).join(',')).join(' ');
  let svg = '';
  for (const f of facets) {
    const fill = hex(tone(f.st, f.d));
    svg += `<polygon class="ts-f" points="${poly(f)}" fill="${fill}" stroke="${fill}" style="--fd:${f.delay}s"/>\n`;
  }
  console.log(`${name}: ${facets.length} facets, max delay ${Math.max(...facets.map((f) => f.delay))}s`);
  return `<svg viewBox="0 0 ${W} ${H}" focusable="false">\n${svg}</svg>`;
}

// ── the three stones — the annealing, enacted down the page ────────────────
// stone i — un-set metal: near-black mosaic, one warm whisper low bottom-right
const s1 = buildStone({
  name: 'stone-i', W: 220, H: 240, seed: 20260706,
  ring: [[104, 6], [196, 58], [214, 168], [148, 234], [52, 222], [8, 128], [34, 40]],
  nInterior: 6, riseStart: 0.62, riseGain: 0.3, glints: [0.2, 0.13], delayStep: 26,
});
// stone ii — mid-resolve: the warm greys have risen along the grain
const s2 = buildStone({
  name: 'stone-ii', W: 230, H: 220, seed: 7070707,
  ring: [[120, 4], [212, 52], [226, 152], [162, 216], [58, 208], [6, 118], [44, 30]],
  nInterior: 7, riseStart: 0.46, riseGain: 0.5, glints: [0.45, 0.3, 0.3], delayStep: 24,
});
// stone iii — nearly set: one near-paper plate seated bottom-right
const s3 = buildStone({
  name: 'stone-iii', W: 220, H: 235, seed: 31219,
  ring: [[112, 4], [204, 46], [216, 150], [160, 230], [56, 224], [4, 136], [26, 42]],
  nInterior: 6, riseStart: 0.3, riseGain: 0.85, glints: [0.92, 0.65, 0.45], delayStep: 24,
});

const fs = require('fs');
fs.writeFileSync(__dirname + '/stone-i.svg.html', s1);
fs.writeFileSync(__dirname + '/stone-ii.svg.html', s2);
fs.writeFileSync(__dirname + '/stone-iii.svg.html', s3);

const page = `<!doctype html><meta charset="utf-8"><style>
  body{background:#050505;margin:0;padding:60px;display:flex;gap:90px;align-items:center;justify-content:center;min-height:100vh}
  svg{width:220px;height:auto;display:block}
  .ts-f{stroke-width:1}
</style>${s1}${s2}${s3}`;
fs.writeFileSync(__dirname + '/stones-preview.html', page);
console.log('wrote stones-preview.html');
