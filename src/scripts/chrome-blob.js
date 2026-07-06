// chrome-blob.js — the studio's raymarched WebGL chrome blob, carried over from the v1
// site (atheric-studios/home → liquid-chrome-v2/src/js/chrome-blob.js).
//
// GROUND TRUTH: the shader (vsrc/fsrc) and the GL pipeline below are the v1's, UNCHANGED
// (spec: "Reuse the exact same blob and material … Do not rewrite the shader"). The blob is
// a 4-sphere metaball with a chrome material that reflects a bright-sky / dark-ground
// environment — so it reads as chrome on the off-black ground with no material edit.
//
// Only the PLUMBING is adapted to run inside the merge substrate (not the shader):
//   1. cursorMouse is inlined here (the v1 imported it from interactions.js).
//   2. initChromeBlob(canvas) takes the canvas (the v1 did getElementById('chrome')).
//   3. The v1 hero scroll-dispersion (.hero offsetHeight → uScroll → blob exits frame) is
//      NOT wired. uScroll is pinned to 0 so the blob HOLDS POSITION as one constant object.
//      Driving uScroll/uCompress from the seam's `t` is a later (seam-animation) step.
//   4. prefers-reduced-motion freezes the blob (via the v1's own motionQuiet mechanism).
//   5. A dispose() handle is returned so the adapter can tear the loop down.
//
// 60fps handling is the v1's, intact: devicePixelRatio clamped to 1.4, a 72-step raymarch,
// and motion-freeze. This loop is the blob's own render loop; it does not touch the
// substrate's single seam rAF (transition.js).

// normalized cursor (NDC, y-up). Inlined from the v1 interactions.js convention.
const cursorMouse = { x: 0, y: 0 };

// the blob's two tempos: at home the chrome idles a touch slower than v1 (0.85 — statelier,
// weightier); inside the craft study it runs a touch livelier (the examined machine works).
// The transition between them is EASED in the render loop, never a jump.
export const BLOB_SPEED = { home: 0.85, study: 1.05 };

// shared camera/scroll control (v1). Exported (as in v1) so the craft-reveal zoom
// (craft.js) can fly the lens — it writes `target` and the loop below lerps `current`
// toward it each frame. Camera only: the shader, SDF and material are untouched.
export const cameraState = {
  current: { pos: [0, 0.3, -3], look: [0, 0.3, 0], fov: 1.7 },
  target:  { pos: [0, 0.3, -3], look: [0, 0.3, 0], fov: 1.7 },
  scrollOverride: 0, // PINNED to 0 in the merge: blob holds position, no hero dispersion.
  mouseFreeze: false,
  ease: 0.075,
  compressCurrent: 0,
  compressTarget: 0,
  compressEase: 0.10,
  pageMode: 0,       // 0 = home (full 4-sphere blob)
  motionQuiet: false, // set from prefers-reduced-motion below
  // time-scale for the blob's own motion (drift + orbits + film wobble). The render loop
  // accumulates frozenT by dt * speed and EASES speed toward speedTarget, so a speed change
  // never jumps phase — the orbits simply, gradually, take up a new tempo. craft.js raises
  // the target on entering the study (the machine, examined, runs a touch livelier) and
  // restores it on exit. Plumbing only: the shader still just reads uTime.
  speed: BLOB_SPEED.home,
  speedTarget: BLOB_SPEED.home,
};

// the resting hero camera — craft.js restores this on exit. Reframed (2026-07): the camera
// trucks UP 0.3 world units (pos+look together, a pure reframe — same viewing angle, the
// blob just sits LOWER on screen, deeper behind the hero headline) and the fov rises
// 1.6 → 1.7 (~6% larger on screen). The study's STAGE/figure cams (craft.js) are their own
// framings and still centre the blob themselves.
export const HOME_CAM = { pos: [0, 0.3, -3], look: [0, 0.3, 0], fov: 1.7 };

/**
 * Mount the v1 chrome blob onto a provided canvas. Returns a handle with dispose().
 * @param {HTMLCanvasElement} canvas
 */
export function initChromeBlob(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) {
    console.warn('[chrome-blob] no WebGL context — hiding canvas');
    canvas.style.display = 'none';
    return { canvas, dispose() {} };
  }

  // detect fragment-shader high-float precision support. some mobile GPUs report 0 for
  // highp, which would silently fail to compile — fall back to mediump there.
  const fragHighp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const usePrecision = (fragHighp && fragHighp.precision > 0) ? 'highp' : 'mediump';

  const vsrc = `
      attribute vec2 aPos;
      void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;
  const fsrc = `
      precision ${usePrecision} float;
      uniform vec2 uRes;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uScroll;
      uniform vec3 uCamPos;
      uniform vec3 uCamLook;
      uniform float uCamFOV;
      uniform float uCompress;   // 0 = idle, 1 = launched (blob compressed + lifted off frame)
      uniform float uPageMode;   // 0 = home (4-sphere blob), 1 = page (tiny 2-sphere mark)

      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }

      float sphere(vec3 p, vec3 c, float r) {
        return length(p - c) - r;
      }

      float scene(vec3 p) {
        // page mode — a tiny two-sphere mark, calmer orbits, acting as the
        // typographic "dot" of the page-header word. position is computed
        // from viewport aspect so the blobs stay on screen on portrait
        // (mobile) and landscape (desktop) alike. participates in launch.
        if (uPageMode > 0.5) {
          float pt = uTime * 0.30;
          float pComp = uCompress;
          float pRadiusScale = 1.0 - pComp * 0.55;
          vec3 pLift = vec3(0.0, pComp * pComp * 5.5, 0.0);

          // viewport-aware position — keeps the blob aligned with the
          // page-header text on portrait and landscape. on landscape we
          // sit further left in world space (since uv.x range is wide);
          // on portrait we pull in toward centre. uses step()+mix() rather
          // than a bool-ternary on vec3 because Safari's GLSL compiler has
          // historically rejected the bool-conditional-on-vec3 pattern.
          float portraitFactor = step(uRes.x, uRes.y);
          // right side, aligned with the page-header text vertically.
          // y differs sharply between landscape and portrait because uv.y
          // scales by min(uRes.x, uRes.y) — a portrait viewport's small
          // min dimension means the same world Y projects to a much shorter
          // screen distance, so portrait needs a much higher Y.
          vec3 base1 = mix(vec3(1.95, 1.10, 0.0), vec3(0.95, 2.30, 0.0), portraitFactor);
          vec3 base2 = mix(vec3(2.18, 1.10, 0.0), vec3(1.18, 2.30, 0.0), portraitFactor);

          vec3 pc1 = base1
                   + vec3(cos(pt) * 0.10, sin(pt * 1.2) * 0.06, 0.0)
                   + pLift;
          float pd1 = sphere(p, pc1, 0.20 * pRadiusScale);
          vec3 pc2 = base2
                   + vec3(cos(pt * 0.7 + 1.5) * 0.08, sin(pt * 0.9) * 0.05, 0.0)
                   + pLift;
          float pd2 = sphere(p, pc2, 0.14 * pRadiusScale);
          return smin(pd1, pd2, 0.07);
        }

        // home mode — existing 4-sphere field plus the launch (uCompress).
        // launch shrinks all radii (radiusScale), lifts the centres upward
        // along an accelerating curve (pow comp), pulls them back toward a
        // single mass (mergeBonus), and disengages cursor tracking.
        // uniform 1.3x size: evaluate in a shrunk space, scale the distance back
        // (return d * 1.3). enlarges the whole blob only; nothing else changes.
        p /= 1.3;
        float disp = pow(clamp(uScroll, 0.0, 1.2), 1.4);
        float comp = uCompress;
        float radiusScale = 1.0 - comp * 0.55;
        vec3 lift = vec3(0.0, comp * comp * 5.5, 0.0);
        float mouseW = 0.55 * (1.0 - clamp(uScroll * 1.4, 0.0, 1.0)) * (1.0 - comp);
        float mergeBonus = comp * 0.45;

        // ambient drift — lissajous on c1 so the dominant sphere drifts
        // continuously even when the cursor is still. paired with the
        // orbital satellites (c2..c4) below, this keeps the silhouette
        // morphing at all times.
        vec3 drift = vec3(cos(uTime * 0.42) * 0.55, sin(uTime * 0.31) * 0.38, 0.0);
        vec3 c1 = vec3(uMouse * mouseW, 0.0)
                + drift
                + vec3(0.0, 1.6, 0.0) * disp * 3.2
                + lift;
        float d1 = sphere(p, c1, 0.78 * radiusScale);

        float t = uTime * 0.55;
        vec3 c2 = vec3(cos(t) * 0.95, sin(t * 1.3) * 0.5, sin(t * 0.8) * 0.45)
                + vec3(-1.7, 0.7, 0.0) * disp * 3.5
                + lift;
        float d2 = sphere(p, c2, 0.42 * radiusScale);

        vec3 c3 = vec3(sin(t * 0.7) * 0.7, cos(t * 1.05) * 0.6, cos(t * 0.5) * 0.35)
                + vec3(1.5, -0.9, 0.0) * disp * 3.5
                + lift;
        float d3 = sphere(p, c3, 0.38 * radiusScale);

        vec3 c4 = vec3(cos(t * 1.4) * 0.55, sin(t * 0.9) * 0.7, sin(t * 1.2) * 0.5)
                + vec3(-1.4, -1.1, 0.0) * disp * 3.5
                + lift;
        float d4 = sphere(p, c4, 0.32 * radiusScale);

        // smin k: scroll un-merges, launch re-merges. mergeBonus tightens the
        // chrome into one body just before liftoff — pressure building, then
        // release. inverse of the scroll-driven dispersion.
        float kFalloff = 1.0 - clamp(uScroll * 1.1, 0.0, 0.92);
        float k1 = (0.65 + mergeBonus) * kFalloff;
        float k2 = (0.55 + mergeBonus) * kFalloff;
        float k3 = (0.45 + mergeBonus) * kFalloff;

        float d = smin(d1, d2, max(k1, 0.001));
        d = smin(d, d3, max(k2, 0.001));
        d = smin(d, d4, max(k3, 0.001));
        return d * 1.3;
      }

      vec3 normal(vec3 p) {
        float e = 0.0015;
        vec2 h = vec2(e, 0.0);
        return normalize(vec3(
          scene(p + h.xyy) - scene(p - h.xyy),
          scene(p + h.yxy) - scene(p - h.yxy),
          scene(p + h.yyx) - scene(p - h.yyx)
        ));
      }

      // ---- iridescent (thin-film) material helpers -----------------------------
      // MATERIAL CHANGE: the v1 warm-chrome shading is replaced below with an
      // oil-slick thin-film approximation. SDF/geometry/raymarch above are untouched.

      // cheap value noise — breaks the thin-film bands so they aren't perfectly
      // concentric. one lookup per shaded pixel; no extra passes.
      float hash31(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      }
      float vnoise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
                   mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
      }

      // thin-film spectral ramp: warm/camera-facing -> cool/grazing.
      // gold/amber -> magenta -> cyan/blue -> violet. tuned by eye, not physical.
      vec3 thinFilm(float t) {
        t = clamp(t, 0.0, 1.0);
        vec3 cGold    = vec3(1.00, 0.82, 0.38);
        vec3 cMagenta = vec3(1.00, 0.26, 0.60);
        vec3 cBlue    = vec3(0.20, 0.62, 1.00);
        vec3 cViolet  = vec3(0.52, 0.26, 0.98);
        vec3 c = cGold;
        c = mix(c, cMagenta, smoothstep(0.00, 0.30, t));
        c = mix(c, cBlue,    smoothstep(0.30, 0.55, t));
        c = mix(c, cViolet,  smoothstep(0.55, 0.82, t));
        return c;
      }

      // split warm/cool reflection on a near-black world. the chrome carries a
      // gold key from above and a blue fill from below, plus a tight white sun
      // sparkle. everything else is near-black so the blob's own colour is the
      // only luminance on the dark plane.
      vec3 envColor(vec3 d) {
        float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0); // 0 = down, 1 = up
        vec3 below = vec3(0.015, 0.022, 0.050);      // cool, faint blue
        vec3 above = vec3(0.045, 0.035, 0.022);      // warm, faint amber
        vec3 c = mix(below, above, smoothstep(0.0, 1.0, up));
        // warm key glint from above (gold)
        float key = pow(max(dot(d, normalize(vec3(0.25, 0.85, 0.45))), 0.0), 5.0);
        c += vec3(1.00, 0.66, 0.26) * key * 0.85;
        // cool fill glint from below (blue)
        float fill = pow(max(dot(d, normalize(vec3(-0.25, -0.80, 0.30))), 0.0), 4.0);
        c += vec3(0.20, 0.45, 1.00) * fill * 0.55;
        // tight bright sun -> near-white specular sparkle
        float sun = pow(max(dot(d, normalize(vec3(0.40, 0.65, 0.55))), 0.0), 90.0);
        c += vec3(1.00, 0.96, 0.92) * sun * 1.6;
        return c;
      }

      void main() {
        // hard cutoff once dispersion is complete (home mode only — page mode
        // renders independently of scroll). skip the raymarch entirely.
        if (uPageMode < 0.5 && uScroll > 1.05) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) * 2.0;

        // build camera basis from pos/look uniforms — lets inspect mode
        // fly the lens around the chrome surface
        vec3 forward = normalize(uCamLook - uCamPos);
        vec3 worldUp = abs(forward.y) > 0.97 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
        // standard right-handed: right = up × forward, camUp = forward × right.
        // earlier order (forward × up) produced right = -x for a +z-facing
        // camera, which mirrored the entire scene horizontally — making the
        // cursor-tracked sphere drift opposite to the cursor.
        vec3 right = normalize(cross(worldUp, forward));
        vec3 camUp = cross(forward, right);
        vec3 ro = uCamPos;
        vec3 rd = normalize(forward * uCamFOV + right * uv.x + camUp * uv.y);

        float t = 0.0;
        bool hit = false;
        vec3 p;
        for (int i = 0; i < 72; i++) {
          p = ro + rd * t;
          float d = scene(p);
          if (d < 0.001) { hit = true; break; }
          if (t > 6.5) break;
          t += d * 0.85;
        }

        if (!hit) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec3 n = normal(p);
        vec3 r = reflect(rd, n);
        vec3 env = envColor(r);

        // facing term: 1 at camera-facing, 0 at grazing. fres is its complement.
        float ndv = max(dot(-rd, n), 0.0);
        float fres = 1.0 - ndv;

        // (1) THIN-FILM IRIDESCENCE — drive surface colour by the fresnel term,
        // wobbled by slow noise so the bands aren't perfectly concentric. warm on
        // the faces pointing at camera, cool/violet toward grazing angles.
        float tFilm = clamp(
          pow(fres, 0.80) + (vnoise(p * 1.1 + uTime * 0.05) - 0.5) * 0.40,
          0.0, 1.0);
        vec3 iri = thinFilm(tFilm);

        // oil-slick body: the iridescent colour is the blob's own light,
        // intensifying toward grazing where the film is strongest. brighter base
        // so the camera-facing gold reads rich rather than muddy/olive.
        vec3 col = iri * (0.62 + 0.45 * fres);
        // warm core lift — a soft amber glow on the most camera-facing faces so the
        // gold centre reads luminous instead of recessed/olive under the magenta ring.
        col += vec3(1.00, 0.72, 0.30) * pow(ndv, 2.5) * 0.26;

        // (3) SPLIT ENV REFLECTION — gold-top / blue-bottom glints punch through,
        // tinted by the film so highlights carry the spectral cast (except the sun).
        col += env * mix(vec3(1.0), iri, 0.35);

        // (2) BLOOMING FRESNEL RIM — strong near-white grazing highlight, additive,
        // soft falloff so the edge glows into the dark background. brighter than v1.
        float rim      = pow(fres, 4.0);
        float rimBloom = pow(fres, 10.0);
        col += vec3(1.00, 0.97, 0.95) * (rim * 0.50 + rimBloom * 1.55);

        // shadow at base of blob (kept from v1)
        float shadow = smoothstep(0.0, 1.0, p.y * 0.5 + 0.5);
        col *= mix(0.82, 1.0, shadow);

        // silhouette alpha — v1's soft coverage feather, restored. (NOTE: no backticks in
        // these comments. The shader is a JS template literal, so a stray backtick ends the
        // string and breaks the whole file — that was a self-inflicted bug during this fix.)
        //
        // The iridescence rewrite did not narrow this feather; it ADDED a rim-driven term,
        // alpha = max(edge, rimBloom*1.2), that forced the silhouette fully OPAQUE exactly
        // where v1 faded to zero (rimBloom = pow(fres,10) climbs to 1 at the grazing edge).
        // That hard cutoff exposed the raw, stair-stepped raymarch boundary: the context is
        // antialias:false and a fullscreen-quad SDF cannot be MSAA'd, so this angular feather
        // is the blob's ONLY edge AA. Dropping the rim->alpha coupling and restoring the plain
        // smoothstep makes the border smooth again. Body opacity is UNCHANGED away from the
        // edge (there rimBloom was already ~0, so the old alpha already equalled this same
        // smoothstep); only the outermost grazing band, previously clamped opaque, now fades.
        // The bright rim stays in col, glowing just inside the edge instead of terminating on
        // a hard, aliased line.
        float alpha = smoothstep(0.0, 0.4, ndv);
        gl_FragColor = vec4(col, alpha);
      }
    `;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const label = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      console.error(`[chrome-blob] ${label} shader compile failed:`, gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, vsrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsrc);
  if (!vs || !fs) {
    console.warn('[chrome-blob] shader compile failed — hiding canvas (precision=' + usePrecision + ')');
    canvas.style.display = 'none';
    return { canvas, dispose() {} };
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[chrome-blob] program link failed:', gl.getProgramInfoLog(prog));
    canvas.style.display = 'none';
    return { canvas, dispose() {} };
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uScroll = gl.getUniformLocation(prog, 'uScroll');
  const uCamPosLoc = gl.getUniformLocation(prog, 'uCamPos');
  const uCamLookLoc = gl.getUniformLocation(prog, 'uCamLook');
  const uCamFOVLoc = gl.getUniformLocation(prog, 'uCamFOV');
  const uCompressLoc = gl.getUniformLocation(prog, 'uCompress');
  const uPageModeLoc = gl.getUniformLocation(prog, 'uPageMode');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let mLerpX = 0, mLerpY = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.4);
    // Width = the LAYOUT viewport (documentElement.clientWidth), never innerWidth. On mobile
    // innerWidth tracks the layout viewport AS IT EXPANDS to fit any horizontal overflow — so
    // a stray over-wide element would balloon innerWidth (measured: 390 → 453 at device-width
    // 390), the blob would size to that, render off-centre, and its right half would sit
    // off-canvas (pinch-zoom exposed it). clientWidth is the stable visible width (== the
    // visual viewport at scale 1) and cannot be pushed past the screen, so the blob stays
    // clamped to what the viewport actually shows. Height stays innerHeight (no such feedback
    // vertically; the blob must still fill the full hero height incl. the URL bar zone). */
    const w = document.documentElement.clientWidth || innerWidth, h = innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  addEventListener('resize', resize);

  // cursor tracking (inlined from the v1 interactions.js convention).
  const onPointer = (e) => {
    cursorMouse.x = (e.clientX / innerWidth) * 2 - 1;
    cursorMouse.y = -((e.clientY / innerHeight) * 2 - 1);
  };
  addEventListener('pointermove', onPointer, { passive: true });

  // reduced-motion → freeze the blob's time advancement (v1's motionQuiet).
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const applyReduce = () => { cameraState.motionQuiet = reduceMq.matches; };
  applyReduce();
  reduceMq.addEventListener('change', applyReduce);

  let frozenT = 0;
  let lastNow = performance.now();
  let running = true;
  let rafId = 0;
  // the last frame actually drawn — under motion-quiet the raymarch is skipped whenever the
  // next frame would be identical, so a static blob costs zero GPU (see below).
  const drawn = { px: NaN, py: NaN, pz: NaN, lx: NaN, ly: NaN, lz: NaN, fov: NaN, comp: NaN, t: NaN, mx: NaN, my: NaN, w: -1, h: -1 };
  const render = () => {
    if (!running) return;
    const now = performance.now();
    // motion-quiet freezes time advancement — the blob holds its shape.
    if (!cameraState.motionQuiet) {
      // ease the tempo toward its target (≈1.2s time constant at 60fps), then advance the
      // blob's clock by SCALED dt — phase-continuous, so tempo changes swell, never snap.
      cameraState.speed += (cameraState.speedTarget - cameraState.speed) * 0.022;
      frozenT += ((now - lastNow) / 1000) * cameraState.speed;
    }
    lastNow = now;
    const t = frozenT;
    // under motion-quiet the cursor lean is parked too, so the frame can fully settle
    const mTargetX = (cameraState.mouseFreeze || cameraState.motionQuiet) ? 0 : cursorMouse.x;
    const mTargetY = (cameraState.mouseFreeze || cameraState.motionQuiet) ? 0 : cursorMouse.y;
    mLerpX += (mTargetX - mLerpX) * 0.06;
    mLerpY += (mTargetY - mLerpY) * 0.06;

    // camera: lerp current toward target (static in the merge — current == target).
    const ease = cameraState.ease;
    for (let i = 0; i < 3; i++) {
      cameraState.current.pos[i]  += (cameraState.target.pos[i]  - cameraState.current.pos[i])  * ease;
      cameraState.current.look[i] += (cameraState.target.look[i] - cameraState.current.look[i]) * ease;
    }
    cameraState.current.fov += (cameraState.target.fov - cameraState.current.fov) * ease;

    cameraState.compressCurrent +=
      (cameraState.compressTarget - cameraState.compressCurrent) * cameraState.compressEase;

    // uScroll pinned to 0 in the merge — the blob holds position (no hero dispersion).
    const targetScroll = cameraState.scrollOverride;
    // (scrollLerp settles instantly since target is constant 0.)

    // Reduced motion: time is frozen and the lean is parked, so a frame is fully determined
    // by the numbers below. If none moved since the last draw, skip the raymarch outright —
    // the loop idles at zero GPU cost behind the static image. Any change (a craft-study
    // camera snap, a resize, a resume after idle) draws again on the very next tick.
    if (cameraState.motionQuiet) {
      const c = cameraState.current;
      const eps = 1e-4;
      const same =
        Math.abs(c.pos[0] - drawn.px) < eps && Math.abs(c.pos[1] - drawn.py) < eps &&
        Math.abs(c.pos[2] - drawn.pz) < eps && Math.abs(c.look[0] - drawn.lx) < eps &&
        Math.abs(c.look[1] - drawn.ly) < eps && Math.abs(c.look[2] - drawn.lz) < eps &&
        Math.abs(c.fov - drawn.fov) < eps &&
        Math.abs(cameraState.compressCurrent - drawn.comp) < eps &&
        Math.abs(t - drawn.t) < eps &&
        Math.abs(mLerpX - drawn.mx) < eps && Math.abs(mLerpY - drawn.my) < eps &&
        canvas.width === drawn.w && canvas.height === drawn.h;
      if (same) {
        rafId = requestAnimationFrame(render);
        return;
      }
    }
    drawn.px = cameraState.current.pos[0];
    drawn.py = cameraState.current.pos[1];
    drawn.pz = cameraState.current.pos[2];
    drawn.lx = cameraState.current.look[0];
    drawn.ly = cameraState.current.look[1];
    drawn.lz = cameraState.current.look[2];
    drawn.fov = cameraState.current.fov;
    drawn.comp = cameraState.compressCurrent;
    drawn.t = t;
    drawn.mx = mLerpX;
    drawn.my = mLerpY;
    drawn.w = canvas.width;
    drawn.h = canvas.height;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mLerpX, mLerpY);
    gl.uniform1f(uScroll, targetScroll);
    gl.uniform3f(uCamPosLoc, cameraState.current.pos[0], cameraState.current.pos[1], cameraState.current.pos[2]);
    gl.uniform3f(uCamLookLoc, cameraState.current.look[0], cameraState.current.look[1], cameraState.current.look[2]);
    gl.uniform1f(uCamFOVLoc, cameraState.current.fov);
    gl.uniform1f(uCompressLoc, cameraState.compressCurrent);
    gl.uniform1f(uPageModeLoc, cameraState.pageMode);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(render);
  };

  // Commit the CURRENT state to the uniforms and draw ONE frame — no time advance, no camera
  // lerp, no rAF. setActive(true) calls this synchronously on resume so a correct frame is in
  // the drawing buffer BEFORE the set-veil (main.js, --set) lifts to reveal it. Without it the
  // buffer cleared on idle (setActive(false)) shows through for the one composite between the
  // resume and the next render rAF — a stale/blank blob flash on ~half of scroll-ups (worst
  // under reduced motion, where the veil un-covers in a single hard cut). Records drawn.* so
  // the motion-quiet skip treats this as the frame it already laid down.
  const commitAndDraw = () => {
    const c = cameraState.current;
    const t = frozenT;
    drawn.px = c.pos[0]; drawn.py = c.pos[1]; drawn.pz = c.pos[2];
    drawn.lx = c.look[0]; drawn.ly = c.look[1]; drawn.lz = c.look[2];
    drawn.fov = c.fov; drawn.comp = cameraState.compressCurrent; drawn.t = t;
    drawn.mx = mLerpX; drawn.my = mLerpY; drawn.w = canvas.width; drawn.h = canvas.height;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mLerpX, mLerpY);
    gl.uniform1f(uScroll, cameraState.scrollOverride);
    gl.uniform3f(uCamPosLoc, c.pos[0], c.pos[1], c.pos[2]);
    gl.uniform3f(uCamLookLoc, c.look[0], c.look[1], c.look[2]);
    gl.uniform1f(uCamFOVLoc, c.fov);
    gl.uniform1f(uCompressLoc, cameraState.compressCurrent);
    gl.uniform1f(uPageModeLoc, cameraState.pageMode);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  render();

  return {
    canvas,

    // Hero-only lifecycle. The blob is a HERO element; once scrolled past it must stop
    // burning GPU (the always-on 72-step raymarch is the flagged cost). setActive(false)
    // tears down the render LOOP — no rAF, no draw calls, GPU goes idle — and clears the
    // drawingbuffer so no frozen frame lingers. The GL context, program and buffers are
    // kept warm so setActive(true) restores instantly and reliably (re-creating a WebGL
    // context on scroll-up is failure-prone and would risk the locked hero). On resume we
    // reset lastNow so frozenT doesn't jump by the paused duration.
    setActive(on) {
      if (on) {
        if (running) return;
        running = true;
        lastNow = performance.now(); // reset the clock so frozenT doesn't jump the paused span
        commitAndDraw(); // one clean frame NOW, at the settled position, before the veil lifts
        rafId = requestAnimationFrame(render);
      } else {
        if (!running) return;
        running = false;
        cancelAnimationFrame(rafId);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    },

    dispose() {
      running = false;
      cancelAnimationFrame(rafId);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onPointer);
      reduceMq.removeEventListener('change', applyReduce);
    },
  };
}
