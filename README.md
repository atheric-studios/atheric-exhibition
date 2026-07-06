# Atheric.

Source for [atheric.eu](https://atheric.eu) — a small software studio in
Helsinki. This is **v2**, frozen as `v2.0.0` on 2026-07-06.

This repository is published for transparency and inspection, not for
redistribution. You may read it. You may not copy, modify, or republish
it. For commission and licensing inquiries: **hello@atheric.eu**.

See [LICENSE](./LICENSE) for the full terms, and
[EXHIBITION.md](./EXHIBITION.md) for what this repository is and how it
is kept in sync with the live site.

## The concept — the chrome cools

One page, one material, one process. The hero is **molten chrome**: an
iridescent thin-film blob, raymarched live on the GPU (72-step raymarch,
SDF metaballs, thin-film interference material). As the reader scrolls
past, the chrome **sets** — the blob dissolves into the permanent dark
plane, and everything below is read as the same metal, cooled: a
machinist's **engineering broadsheet** drawn in light on the dark ground.
Low in the document the plane **crystallises** — a procedural low-poly
facet field (rendered on one canvas) resolves dark into Atheric's cream
paper — and the document closes on the dark bench it was drawn on, under
the last warmth of a banked furnace.

Along the way:

- **The craft study** — "see how the chrome is made": a real 3D camera
  flight into the live shader, five annotated stations with the GLSL
  quoted verbatim, the machine's frame parting as a curtain.
- **The fracture** — the dark→cream crystallisation, authored as motion
  (nucleate / crack / warm / unveil / breathe), text-free by design.
- **The cabinet** — the studio's two live works presented as castings:
  [clara](https://gym.atheric.eu) and
  [under the code](https://under.atheric.eu).
- A full reduced-motion presentation, keyboard operability throughout,
  and self-hosted type (no request leaves the origin).

The complete design law — every mechanism, measurement and trap — lives
in [docs/DESIGN.md](./docs/DESIGN.md).

## Stack

None, deliberately. Static HTML, hand-written CSS, vanilla ES modules,
one hand-written GLSL shader. No framework, no build step, no third-party
requests at runtime. Deployed on Cloudflare Pages.

## Structure

```
index.html            ← the whole document (hero + broadsheet + inline SVG artifacts)
privacy.html          ← privacy notice + imprint (/privacy)
404.html              ← the lost-address sheet
_headers              ← CSP + security headers + immutable caching law
robots.txt, sitemap.xml, og.jpg
fonts/                ← self-hosted brand type (Archivo, Instrument Serif,
                        JetBrains Mono) — subset + deduped variable fonts
src/
├── styles/
│   ├── fonts.css     ← @font-face set (mirrors Google css2 ranges; see head comment)
│   ├── tokens.css    ← brand primitives + broadsheet tokens
│   ├── base.css      ← dark ground, set-veil, annealing light, backdrop stack
│   ├── dark.css      ← hero styles (locked)
│   ├── body.css      ← the broadsheet: every post-hero section + motion
│   ├── fracture.css  ← crystallisation layers, cream flip, cast's edge
│   └── craft.css     ← the craft study (curtain, shell, panels)
└── scripts/
    ├── chrome-blob.js ← the shader + render loop (locked material)
    ├── blob.js        ← mount adapter
    ├── main.js        ← blob lifecycle: the scroll-coupled dissolve
    ├── dark.js        ← hero behaviours (locked)
    ├── body.js        ← reveals, scroll score, fracture canvas, folio, clock
    └── craft.js       ← the craft study: camera flights, curtain, pager
docs/
├── DESIGN.md          ← the design law (canonical home is this repo)
└── generators/
    └── gen-cabinet-shards.js ← generator for the cabinet casting SVGs
```

## Provenance

Everything above except `docs/`, `LICENSE`, `README.md` and
`EXHIBITION.md` is a **tree snapshot** of the private working repo's
`main` — exactly the files atheric.eu serves. History is not mirrored.

— Atheric · MMXXVI
