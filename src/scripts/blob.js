// blob.js — ADAPTER for the dark build's chrome metaball blob.
//
// IMPORTANT: this is NOT a blob implementation. The blob, its geometry, and its CHROME
// MATERIAL are ground truth from the dark build and must be pasted in unchanged
// (spec: "Do not rewrite the shader"). This file is the thin seam between that existing
// object and the merge substrate.
//
// The blob is the connective tissue: one constant object whose surrounding world changes
// across the inversion. Across t 0.5–1.0 the adapter changes ONLY two inputs into the
// existing material — the environment it reflects and its fresnel/lighting response —
// re-lit for the brighter cream ground. Material constants stay identical.

// NOTE: the ?v stamp busts the CDN/browser cache (4h max-age on module files) and MUST match
// craft.js's specifier exactly — module identity is by URL, and both need the ONE instance
// (one cameraState) of chrome-blob.js.
import { initChromeBlob } from './chrome-blob.js?v=12';

export class BlobAdapter {
  constructor() {
    this._instance = null; // the dark build's blob instance goes here
  }

  /**
   * Mount the existing dark-build blob, anchored behind the hero / seam text.
   *
   * INTEGRATION SLOT (3): paste the dark build's blob setup here and return/assign the
   * instance. Do not modify its material — only wire it up.
   *
   * @param {Element} mountEl  the element inside #seam the blob is anchored to
   */
  mount(mountEl) {
    // === INTEGRATION SLOT 3: the studio's chrome blob + material (verbatim) ===
    // The shader/material lives in ./chrome-blob.js (carried over from the v1 site,
    // unchanged). Here we only give it a canvas inside the page-level blob layer and start
    // it as ONE shared instance. That layer sits at negative z-index, behind every region.
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    mountEl.appendChild(canvas);
    this._instance = initChromeBlob(canvas);
    // ========================================================================
    return this._instance;
  }

  /**
   * Re-light the blob for the inversion. `local` is the inversion beat's 0→1
   * (i.e. subrange(t, 0.5, 1.0)). 0 = dark ground, 1 = cream ground.
   *
   * INTEGRATION SLOT (3, cont.): drive ONLY the environment map / background reflection and
   * the fresnel response between the dark and cream lighting setups. Do NOT touch material
   * constants. The object must read as constant; only its world changes.
   */
  relight(local) {
    if (!this._instance) return; // graceful degradation: no blob ⇒ the page still renders
    // === INTEGRATION SLOT 3 (cont.): blob light response ===
    // No-op. The world is PERMANENTLY DARK (docs/DESIGN.md) — there is no cream ground to
    // re-light for, and the ported material already reads as chrome on the off-black plane.
    // `local` is the live scroll signal (--seam-progress range); a later pass may use it to
    // nudge the blob's light as paper objects pass. Nothing is faked or hardcoded here.
    // =======================================================================
    void local;
  }

  /**
   * Hero-only lifecycle. The blob is a HERO element; as the user scrolls past the hero it
   * must LEAVE — and its render loop must shut down to recover the always-on GPU cost. The
   * page-level departure controller (main.js) calls this from an IntersectionObserver on the
   * hero: setActive(false) once the hero has left, setActive(true) when it returns. The
   * loop teardown lives in chrome-blob.js; this is the thin passthrough.
   *
   * @param {boolean} on  true = run the render loop, false = stop it (idle the GPU)
   */
  setActive(on) {
    this._instance?.setActive?.(on);
  }

  dispose() {
    // Tear down the blob's render loop + listeners (chrome-blob.js exposes dispose()).
    this._instance?.dispose?.();
    this._instance = null;
  }
}
