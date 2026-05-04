import { cursorMouse } from './interactions.js';

// shared camera/scroll control. inspect.js writes target/scrollOverride;
// the chrome render loop lerps current → target every frame and uploads
// to the shader uniforms. defaults match the original hardcoded values.
export const cameraState = {
  current: { pos: [0, 0, -3], look: [0, 0, 0], fov: 1.6 },
  target:  { pos: [0, 0, -3], look: [0, 0, 0], fov: 1.6 },
  scrollOverride: null,
  // when true, the cursor-tracking sphere stops chasing the pointer and
  // settles back to centre. inspect mode flips this on so the hints/close
  // button cursor movement doesn't yank chrome out of frame.
  mouseFreeze: false,
  ease: 0.075,
  // launch animation — 0 = idle, 0.3 = hover-anticipation, 1 = fully launched.
  // the render loop lerps current → target with compressEase each frame.
  compressCurrent: 0,
  compressTarget: 0,
  compressEase: 0.10,
  // 0 = home (full 4-sphere blob), 1 = page mode (tiny 2-sphere top-left).
  // not lerped — flipped instantly during the launch handoff so the new
  // mode appears once the home blob is offscreen.
  pageMode: 0,
  // motion-quiet: when true, the render loop freezes time advancement so
  // the blob holds whatever shape it had at the moment the flag was set.
  // wired by the preferences "Reduce motion" toggle.
  motionQuiet: false,
};

export const HOME_CAM = { pos: [0, 0, -3], look: [0, 0, 0], fov: 1.6 };

export function initChromeBlob() {
  const canvas = document.getElementById('chrome');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) {
    canvas.style.display = 'none';
  } else {
    const vsrc = `
      attribute vec2 aPos;
      void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;
    const fsrc = `
      precision highp float;
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
        // page mode — a tiny two-sphere mark, fixed top-left, calmer orbits.
        // serves as the typographic "dot" of the page header word. no cursor,
        // no scroll. participates in launch (uCompress) so navigating away
        // from a page also lifts these marbles up out of frame.
        if (uPageMode > 0.5) {
          float pt = uTime * 0.30;
          float pComp = uCompress;
          float pRadiusScale = 1.0 - pComp * 0.55;
          vec3 pLift = vec3(0.0, pComp * pComp * 5.5, 0.0);
          vec3 pc1 = vec3(-2.40, 1.45, 0.0)
                   + vec3(cos(pt) * 0.10, sin(pt * 1.2) * 0.06, 0.0)
                   + pLift;
          float pd1 = sphere(p, pc1, 0.14 * pRadiusScale);
          vec3 pc2 = vec3(-2.16, 1.45, 0.0)
                   + vec3(cos(pt * 0.7 + 1.5) * 0.08, sin(pt * 0.9) * 0.05, 0.0)
                   + pLift;
          float pd2 = sphere(p, pc2, 0.10 * pRadiusScale);
          return smin(pd1, pd2, 0.07);
        }

        // home mode — existing 4-sphere field plus the launch (uCompress).
        // launch shrinks all radii (radiusScale), lifts the centres upward
        // along an accelerating curve (pow comp), pulls them back toward a
        // single mass (mergeBonus), and disengages cursor tracking.
        float disp = pow(clamp(uScroll, 0.0, 1.2), 1.4);
        float comp = uCompress;
        float radiusScale = 1.0 - comp * 0.55;
        vec3 lift = vec3(0.0, comp * comp * 5.5, 0.0);
        float mouseW = 0.55 * (1.0 - clamp(uScroll * 1.4, 0.0, 1.0)) * (1.0 - comp);
        float mergeBonus = comp * 0.45;

        vec3 c1 = vec3(uMouse * mouseW, 0.0)
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
        return d;
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

      vec3 envColor(vec3 d) {
        float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 sky = vec3(0.96, 0.94, 0.88);
        vec3 horizon = vec3(1.00, 0.78, 0.55);
        vec3 ground = vec3(0.06, 0.06, 0.07);
        vec3 c = mix(ground, horizon, smoothstep(0.0, 0.5, t));
        c = mix(c, sky, smoothstep(0.5, 1.0, t));
        float sun = pow(max(dot(d, normalize(vec3(0.45, 0.6, 0.7))), 0.0), 28.0);
        c += vec3(1.0, 0.5, 0.18) * sun * 0.85;
        float rim = pow(max(dot(d, normalize(vec3(-0.5, -0.3, -0.8))), 0.0), 6.0);
        c += vec3(0.12, 0.18, 1.0) * rim * 0.18;
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
        vec3 right = normalize(cross(forward, worldUp));
        vec3 camUp = cross(right, forward);
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

        float fres = pow(1.0 - max(dot(-rd, n), 0.0), 2.6);
        vec3 col = env;
        col += vec3(1.0, 0.85, 0.7) * fres * 0.45;

        // shadow at base of blob
        float shadow = smoothstep(0.0, 1.0, p.y * 0.5 + 0.5);
        col *= mix(0.78, 1.0, shadow);

        // fade at silhouette edges for soft compositing on bone bg
        float edge = smoothstep(0.0, 0.4, max(dot(-rd, n), 0.0));
        gl_FragColor = vec4(col, edge);
      }
    `;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, vsrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
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
      const w = innerWidth, h = innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener('resize', resize);

    // scroll progress: 0 at top of hero, 1 at end of hero. drives the
    // dispersion / un-merge / cursor-release in the shader. canvas opacity
    // stays at 1 — marbles exit the frame on their own, and the marquee
    // section (opaque background) acts as a visual curtain over any tail.
    const heroEl = document.querySelector('.hero');
    let scrollLerp = 0;
    const computeScroll = () => {
      const h = heroEl ? heroEl.offsetHeight : innerHeight;
      return Math.max(0, scrollY / Math.max(1, h));
    };

    const start = performance.now();
    let frozenT = 0;
    let lastNow = performance.now();
    const render = () => {
      const now = performance.now();
      // when motion-quiet is on, freeze time advancement — the blob holds
      // whatever shape it had. uMouse and uScroll still respond if quiet
      // mode is toggled mid-session; the orbits and dispersion that are
      // time-driven simply stop progressing.
      if (!cameraState.motionQuiet) {
        frozenT += (now - lastNow) / 1000;
      }
      lastNow = now;
      const t = frozenT;
      const mTargetX = cameraState.mouseFreeze ? 0 : cursorMouse.x;
      const mTargetY = cameraState.mouseFreeze ? 0 : cursorMouse.y;
      mLerpX += (mTargetX - mLerpX) * 0.06;
      mLerpY += (mTargetY - mLerpY) * 0.06;

      // camera: lerp current toward target. inspect mode writes targets;
      // home state restores when inspect exits.
      const ease = cameraState.ease;
      for (let i = 0; i < 3; i++) {
        cameraState.current.pos[i]  += (cameraState.target.pos[i]  - cameraState.current.pos[i])  * ease;
        cameraState.current.look[i] += (cameraState.target.look[i] - cameraState.current.look[i]) * ease;
      }
      cameraState.current.fov += (cameraState.target.fov - cameraState.current.fov) * ease;

      // compress: lerp current → target with its own ease. fast for launches,
      // slower for hover anticipation and spring-back.
      cameraState.compressCurrent +=
        (cameraState.compressTarget - cameraState.compressCurrent) * cameraState.compressEase;

      // scroll override lets inspect mode pin uScroll to 0 regardless of scrollY
      const targetScroll = cameraState.scrollOverride !== null
        ? cameraState.scrollOverride
        : computeScroll();
      scrollLerp += (targetScroll - scrollLerp) * 0.12;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mLerpX, mLerpY);
      gl.uniform1f(uScroll, scrollLerp);
      gl.uniform3f(uCamPosLoc, cameraState.current.pos[0], cameraState.current.pos[1], cameraState.current.pos[2]);
      gl.uniform3f(uCamLookLoc, cameraState.current.look[0], cameraState.current.look[1], cameraState.current.look[2]);
      gl.uniform1f(uCamFOVLoc, cameraState.current.fov);
      gl.uniform1f(uCompressLoc, cameraState.compressCurrent);
      gl.uniform1f(uPageModeLoc, cameraState.pageMode);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };
    render();
  }
}
