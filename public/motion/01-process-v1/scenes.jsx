// scenes.jsx — Atheric "code to site" 10s loop
// Composition: 16:9 stage (1920x1080), letterboxed black background, paper grain.
// Beats:
//   0.0 – 0.6   ink hold (grain only)
//   0.6 – 1.4   code window slides in from right
//   1.0 – 4.6   code types in (3 bursts)
//   2.6 – 3.6   site window slides in from left
//   3.4 – 6.6   site builds: meta → kicker → headline (per-char) → rule → wordmark + CTAs
//   6.4 – 7.6   "shipped" — code window eases off-right, site expands toward fullscreen
//   7.6 – 9.0   held fullscreen site, subtle drift, build-bar wipes at top
//   9.0 – 10.0  graceful exit: site eases down + scales, ink swallows it

const { Easing, interpolate, animate, clamp, useTime, Sprite } = window;

const C = {
  ink:    '#0a0a0a',
  bone:   '#efece4',
  signal: '#ff4d1f',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const ease = Easing.easeOutCubic;
const easeIO = Easing.easeInOutCubic;

// Paper grain layer covering whole stage (always on).
function StageGrain() {
  const t = useTime();
  // tiny shift so grain feels alive
  const tx = Math.sin(t * 4.0) * 1.2;
  const ty = Math.cos(t * 3.3) * 1.2;
  return (
    <div style={{
      position:'absolute', inset:-4,
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.42 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
      mixBlendMode:'screen',
      opacity: 0.07,
      transform: `translate(${tx}px, ${ty}px)`,
      pointerEvents:'none',
      zIndex: 100,
    }}/>
  );
}

// Subtle vignette so windows feel set in a room
function Vignette() {
  return (
    <div style={{
      position:'absolute', inset:0,
      background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.6) 100%)',
      pointerEvents:'none', zIndex: 50,
    }}/>
  );
}

// ── Window chrome (mac-style traffic lights) ────────────────────────────────

function TrafficLights({ dark = true }) {
  return (
    <div className="mw-dots">
      <span className="mw-dot mw-dot--r"/>
      <span className="mw-dot mw-dot--y"/>
      <span className="mw-dot mw-dot--g"/>
    </div>
  );
}

// ── Code typing logic ──────────────────────────────────────────────────────
// We type the hero source from the real Atheric site, abridged.
// Each "line" is an array of {cls, text} runs. We reveal characters by
// computing a global character cursor, then slicing accordingly.

// Source (real Atheric hero markup, slightly trimmed for legibility at 1920×1080)
const CODE_LINES = [
  [{cls:'tok-com', text:'<!-- hero -->'}],
  [{cls:'tok-tag', text:'<section'}, {cls:'tok-pun', text:' '}, {cls:'tok-attr', text:'class'}, {cls:'tok-pun', text:'='}, {cls:'tok-str', text:'"hero"'}, {cls:'tok-tag', text:'>'}],
  [{cls:'tok-tag', text:'  <span'}, {cls:'tok-pun', text:' '}, {cls:'tok-attr', text:'class'}, {cls:'tok-pun', text:'='}, {cls:'tok-str', text:'"kicker"'}, {cls:'tok-tag', text:'>'}, {cls:'code-text', text:'— a small studio for digital matter'}, {cls:'tok-tag', text:'</span>'}],
  [{cls:'tok-tag', text:'  <h1'}, {cls:'tok-tag', text:'>'}, {cls:'code-text', text:'we sculpt '}, {cls:'tok-tag', text:'<em>'}, {cls:'tok-em', text:'weightless'}, {cls:'tok-tag', text:'</em>'}, {cls:'code-text', text:' objects,'}],
  [{cls:'code-text', text:'     in code, in light, in the small hours.'}, {cls:'tok-tag', text:'</h1>'}],
  [{cls:'tok-tag', text:'  <a'}, {cls:'tok-pun', text:' '}, {cls:'tok-attr', text:'class'}, {cls:'tok-pun', text:'='}, {cls:'tok-str', text:'"cta"'}, {cls:'tok-tag', text:'>'}, {cls:'code-text', text:'Start a commission'}, {cls:'tok-tag', text:'</a>'}],
  [{cls:'tok-tag', text:'</section>'}],
];

// Compute total chars for the typing budget
const totalChars = CODE_LINES.reduce((s, line) => s + line.reduce((a, r) => a + r.text.length, 0), 0);

function CodeBody({ progress }) {
  // progress 0..1 across the typing window
  const charsToShow = Math.floor(progress * totalChars);
  let remaining = charsToShow;

  const renderedLines = [];
  let lineIdx = 0;
  let caretPlaced = false;

  for (const line of CODE_LINES) {
    const lineLen = line.reduce((a, r) => a + r.text.length, 0);
    const visible = Math.min(lineLen, Math.max(0, remaining));
    if (visible <= 0 && remaining < 0) break;

    let used = 0;
    const runs = [];
    for (const run of line) {
      if (used >= visible) break;
      const sliceLen = Math.min(run.text.length, visible - used);
      const slice = run.text.slice(0, sliceLen);
      if (slice.length > 0) runs.push(<span key={runs.length} className={run.cls}>{slice}</span>);
      used += sliceLen;
    }

    const isCaretLine = !caretPlaced && remaining > 0 && remaining <= lineLen && progress < 1;
    if (isCaretLine) caretPlaced = true;

    renderedLines.push(
      <div key={lineIdx} className="code-line">
        <span className="code-gutter">{String(lineIdx + 1).padStart(2,' ')}</span>
        <span className="code-text">
          {runs.length === 0 ? <span>&nbsp;</span> : runs}
          {isCaretLine && <span className="code-caret"/>}
        </span>
      </div>
    );

    remaining -= lineLen;
    lineIdx += 1;
    if (remaining < 0) {
      // pad blank lines for layout stability
      // (don't render past the typed line — keeps things minimal)
    }
  }

  // If progress is 0, also place caret at line 1
  if (renderedLines.length === 0) {
    renderedLines.push(
      <div key={0} className="code-line">
        <span className="code-gutter">{' 1'}</span>
        <span className="code-text"><span className="code-caret"/></span>
      </div>
    );
  }

  return (
    <div className="code-body">
      {renderedLines}
    </div>
  );
}

// ── Site preview content (the assembled page fragment) ──────────────────────

const HEADLINE_PARTS = [
  { text: 'we sculpt ', em: false },
  { text: 'weightless', em: true },
  { text: ' objects.', em: false },
];

function SiteHeadline({ progress, fontSize }) {
  // per-char reveal
  const fullText = HEADLINE_PARTS.map(p => p.text).join('');
  const total = fullText.length;
  const visibleChars = Math.floor(progress * total);
  let cursor = 0;

  return (
    <h1 className="site-headline" style={{
      fontSize, margin: 0, letterSpacing: '-0.045em',
    }}>
      {HEADLINE_PARTS.map((p, i) => {
        const start = cursor;
        cursor += p.text.length;
        const localVisible = clamp(visibleChars - start, 0, p.text.length);
        const shown = p.text.slice(0, localVisible);
        if (shown.length === 0) return null;
        if (p.em) return <em key={i}>{shown}</em>;
        return <span key={i}>{shown}</span>;
      })}
    </h1>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────────────

function Scene() {
  const t = useTime();
  const W = 1920, H = 1080;

  // ── Window geometry ──
  // Side-by-side phase: code right, site left.
  // Code window
  const codeW = 820, codeH = 720;
  const codeFinalX = W - codeW - 80; // right side, inset 80
  const codeY = 180;

  // Site window (initial side-by-side)
  const siteW = 820, siteH = 720;
  const siteSideX = 80;
  const siteSideY = 180;

  // Site window (fullscreen-ish at the end)
  const siteFsW = 1620;
  const siteFsH = 880;
  const siteFsX = (W - siteFsW) / 2;
  const siteFsY = (H - siteFsH) / 2;

  // ── Code window motion ──
  // slide in 0.6 → 1.4
  // exit 6.6 → 7.6 (off-right + slight scale-down)
  let codeX = codeFinalX;
  let codeOpacity = 1;
  let codeScale = 1;
  if (t < 0.6) {
    codeOpacity = 0;
    codeX = codeFinalX + 200;
  } else if (t < 1.4) {
    const p = clamp((t - 0.6) / 0.8, 0, 1);
    codeOpacity = Easing.easeOutCubic(p);
    const pe = Easing.easeOutBack(p);
    codeX = codeFinalX + (1 - pe) * 200;
    codeScale = 0.94 + 0.06 * pe;
  } else if (t < 6.6) {
    codeOpacity = 1;
    codeX = codeFinalX;
  } else if (t < 7.6) {
    const p = easeIO(clamp((t - 6.6) / 1.0, 0, 1));
    codeOpacity = 1 - p;
    codeX = codeFinalX + p * 280;
    codeScale = 1 - p * 0.05;
  } else {
    codeOpacity = 0;
  }

  // ── Code typing progress ──
  // Type 1.0 → 4.6, with eased ramp (3 bursts via segmented easing)
  let typingProgress = 0;
  if (t < 1.0) typingProgress = 0;
  else if (t < 4.6) {
    typingProgress = interpolate(
      [1.0, 1.9, 2.1, 3.1, 3.3, 4.6],
      [0,   0.38, 0.40, 0.72, 0.74, 1.0],
      Easing.easeOutQuad
    )(t);
  } else typingProgress = 1;

  // ── Site window motion ──
  // appear 2.6 → 3.6 from left, then morph to fullscreen 6.6 → 7.6, exit 9.0 → 10.0
  let siteX = siteSideX, siteY = siteSideY, siteWw = siteW, siteHh = siteH;
  let siteOpacity = 0;
  let siteScale = 1;

  if (t < 2.6) {
    siteOpacity = 0;
    siteX = siteSideX - 200;
  } else if (t < 3.6) {
    const p = clamp((t - 2.6) / 1.0, 0, 1);
    siteOpacity = Easing.easeOutCubic(p);
    const pe = Easing.easeOutBack(p);
    siteX = siteSideX - (1 - pe) * 200;
    siteScale = 0.94 + 0.06 * pe;
  } else if (t < 6.6) {
    siteOpacity = 1;
    siteX = siteSideX;
  } else if (t < 7.6) {
    // morph to fullscreen with a slight overshoot bounce on size
    const p = clamp((t - 6.6) / 1.0, 0, 1);
    const pe = Easing.easeOutBack(p);
    siteOpacity = 1;
    siteX = siteSideX + (siteFsX - siteSideX) * pe;
    siteY = siteSideY + (siteFsY - siteSideY) * pe;
    siteWw = siteW + (siteFsW - siteW) * pe;
    siteHh = siteH + (siteFsH - siteH) * pe;
  } else if (t < 8.4) {
    // brief held beat — site shipped, ready to scroll
    siteX = siteFsX;
    siteY = siteFsY;
    siteWw = siteFsW;
    siteHh = siteFsH;
    siteOpacity = 1;
  } else if (t < 9.2) {
    // content scrolls inside the window (no window movement yet)
    siteX = siteFsX;
    siteY = siteFsY;
    siteWw = siteFsW;
    siteHh = siteFsH;
    siteOpacity = 1;
  } else {
    // whole window slides down off frame, seamlessly continuing the scroll motion
    const p = Easing.easeInCubic(clamp((t - 9.2) / 0.8, 0, 1));
    siteX = siteFsX;
    siteY = siteFsY + p * (H - siteFsY + 60);
    siteWw = siteFsW;
    siteHh = siteFsH;
    siteOpacity = 1;
    siteScale = 1;
  }

  // Internal content scroll inside site window — accelerates from 8.4, peaks
  // through 9.2, and continues at the same velocity as the window slides off
  // (so the motion reads as one continuous downward sweep).
  let contentScroll = 0;
  if (t > 8.4) {
    contentScroll = interpolate(
      [8.4, 9.2, 10.0],
      [0,   520, 900],
      [Easing.easeInQuad, Easing.linear]
    )(t);
  }

  // ── Site assembly progress ──
  // Different parts arrive at different times.
  // meta row: 3.4 → 4.0
  // kicker:   3.8 → 4.4
  // headline: 4.2 → 5.6
  // rule:     5.4 → 6.0
  // wordmark: 5.6 → 6.0
  // CTAs:     5.9 → 6.4
  const fade = (a, b) => clamp((t - a) / (b - a), 0, 1);

  const opMeta     = ease(fade(3.4, 4.0));
  const opKicker   = ease(fade(3.8, 4.4));
  const headlineP  = Easing.easeOutCubic(fade(4.2, 5.6));
  const ruleP      = ease(fade(5.4, 6.0));
  const opWordmark = ease(fade(5.6, 6.0));
  const opCtas     = ease(fade(5.9, 6.4));

  // build bar (top of site window): fills 3.4 → 6.4, fades 6.6 → 7.4
  const buildP = clamp((t - 3.4) / 3.0, 0, 1);
  let buildOpacity = 1;
  if (t > 6.4) buildOpacity = clamp(1 - (t - 6.4) / 1.0, 0, 1);
  if (t < 3.0) buildOpacity = 0;

  // ── Filename ticker on code titlebar ──
  const ms = (t * 1000).toFixed(0).padStart(4, '0');

  // Scale-driven headline size: bigger when fullscreen
  const inFullscreen = siteWw > 1100;
  const hSize = inFullscreen ? 168 : 88;
  const padX = inFullscreen ? 100 : 56;

  // ── Composition ──
  return (
    <React.Fragment>
      {/* Black background fill */}
      <div style={{position:'absolute', inset:0, background:'#0a0a0a'}}/>

      {/* very subtle ground gradient — a "desk" feel */}
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height: 360,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(255,77,31,0.04) 0%, transparent 70%)',
        pointerEvents:'none',
      }}/>

      {/* ============ CODE WINDOW ============ */}
      <div
        className="mw-window"
        style={{
          left: 0, top: 0,
          width: codeW, height: codeH,
          opacity: codeOpacity,
          transform: `translate3d(${codeX}px, ${codeY}px, 0) scale(${codeScale})`,
          transformOrigin: 'center',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.06)',
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden',
        }}
      >
        <div className="mw-titlebar dark" style={{background:'#141414'}}>
          <TrafficLights dark/>
          <span className="mw-fname">hero<em>.</em>html</span>
          <span className="mw-spacer"/>
          <span className="mw-meta">{ms} ms</span>
        </div>
        <div style={{height: 'calc(100% - 36px)', position:'relative'}}>
          <CodeBody progress={typingProgress}/>
        </div>
      </div>

      {/* ============ SITE WINDOW ============ */}
      <div
        className="mw-window"
        style={{
          left: 0, top: 0,
          width: siteWw, height: siteHh,
          opacity: siteOpacity,
          transform: `translate3d(${siteX}px, ${siteY}px, 0) scale(${siteScale})`,
          transformOrigin: 'center',
          background: 'var(--bone)',
          border: '1px solid rgba(10,10,10,0.10)',
          willChange: 'transform, opacity, filter',
          backfaceVisibility: 'hidden',
          filter: t > 9.2 ? `blur(${clamp((t - 9.2) / 0.8, 0, 1) * 2.5}px)` : 'none',
        }}
      >
        <div className="mw-titlebar light" style={{background:'#e7e3d8'}}>
          <TrafficLights/>
          <span className="mw-fname" style={{color:'rgba(10,10,10,0.55)'}}>atheric.eu</span>
          <span className="mw-spacer"/>
          <span className="mw-meta" style={{color:'rgba(10,10,10,0.4)'}}>HEL · live</span>
        </div>

        <div className="site-body" style={{height: 'calc(100% - 36px)'}}>
          <div className="site-grid-bg"/>

          {/* build progress bar */}
          <div className="build-bar" style={{
            top: 0, left: 0, right: 0,
            opacity: buildOpacity,
          }}>
            <div className="build-bar-fill" style={{
              width: '100%',
              transform: `scaleX(${buildP})`,
            }}/>
          </div>

         {/* scrollable content wrapper */}
         <div style={{
           position:'absolute', inset:0,
           transform:`translateY(${-contentScroll}px)`,
           willChange:'transform',
         }}>

          {/* meta row top */}
          <div className="site-meta-row" style={{
            opacity: opMeta,
            transform: `translateY(${(1 - opMeta) * -6}px)`,
            top: inFullscreen ? 56 : 38,
            left: padX, right: padX,
          }}>
            <span><span className="arrow">↳</span>STUDIO ATHERIC · HEL</span>
            <span>EDITION № 1</span>
            <span><span className="arrow">→</span>WRITE TO US</span>
          </div>

          {/* main hero composition */}
          <div style={{
            position:'absolute',
            left: padX,
            right: padX,
            top: inFullscreen ? 220 : 150,
            display:'flex', flexDirection:'column',
            gap: inFullscreen ? 28 : 18,
          }}>
            <div className="site-kicker" style={{
              opacity: opKicker,
              transform: `translateY(${(1 - opKicker) * 12}px)`,
              fontSize: inFullscreen ? 14 : 12,
            }}>
              — a small studio for digital matter
            </div>

            <div style={{minHeight: hSize * 1.1}}>
              <SiteHeadline progress={headlineP} fontSize={hSize}/>
            </div>

            <div style={{
              transform: `scaleX(${ruleP})`,
              transformOrigin: 'left center',
              opacity: ruleP,
            }}>
              <div className="site-rule"/>
            </div>

            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              opacity: opWordmark,
              transform: `translateY(${(1 - opWordmark) * 8}px)`,
            }}>
              <div style={{display:'flex', alignItems:'center', gap: 14}}>
                <div className="site-mark" style={{
                  width: inFullscreen ? 36 : 28,
                  height: inFullscreen ? 36 : 28,
                }}/>
                <span className="site-wordmark" style={{fontSize: inFullscreen ? 22 : 18}}>
                  Atheric<em>.</em>
                </span>
              </div>

              <div style={{
                display:'flex', alignItems:'center', gap: 28,
                opacity: opCtas,
                transform: `translateY(${(1 - opCtas) * 8}px)`,
              }}>
                <span className="site-cta-ghost" style={{fontSize: inFullscreen ? 12 : 11}}>VIEW THE CABINET</span>
                <span className="site-cta" style={{
                  height: inFullscreen ? 52 : 44,
                  fontSize: inFullscreen ? 16 : 14,
                  padding: inFullscreen ? '0 28px' : '0 22px',
                }}>
                  Start a commission
                  <span className="arrow">→</span>
                </span>
              </div>
            </div>
          </div>

          {/* footer ground line */}
          <div style={{
            position:'absolute',
            left: padX, right: padX, top: inFullscreen ? 800 : 660,
            display:'flex', justifyContent:'space-between',
            fontFamily:'var(--mono)', fontSize: inFullscreen ? 11 : 10,
            letterSpacing:'0.22em', textTransform:'uppercase',
            color:'rgba(10,10,10,0.45)',
            opacity: opWordmark,
          }}>
            <span><span style={{
              display:'inline-block', width:6, height:6, borderRadius:'50%',
              background: C.signal, marginRight: 8,
              boxShadow: `0 0 10px ${C.signal}`,
            }}/>OPEN · ACCEPTING FIRST COMMISSIONS</span>
            <span>SCROLL ↓</span>
          </div>

          {/* ── Next section (revealed by scroll) ── */}
          <div style={{
            position:'absolute',
            left: 0, right: 0,
            top: inFullscreen ? 880 : 720,
            borderTop: '1px solid rgba(10,10,10,0.14)',
            background: 'var(--bone-2, #e7e3d8)',
            padding: `${inFullscreen ? 80 : 56}px ${padX}px`,
          }}>
            <div style={{
              fontFamily:'var(--mono)', fontSize: inFullscreen ? 13 : 11,
              letterSpacing:'0.22em', textTransform:'uppercase',
              color: C.signal, marginBottom: inFullscreen ? 28 : 18,
            }}>— index № 01 / how we work</div>
            <h2 style={{
              fontFamily:'var(--display)', fontWeight:500,
              textTransform:'lowercase', letterSpacing:'-0.045em',
              fontSize: inFullscreen ? 132 : 72, margin:0, lineHeight: 0.92,
              color: 'var(--ink)',
            }}>
              three movements; <em style={{
                fontFamily:'var(--serif)', fontStyle:'italic',
                color: C.signal, fontWeight:400,
              }}>one</em> object.
            </h2>
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
              gap: inFullscreen ? 36 : 24,
              marginTop: inFullscreen ? 64 : 44,
            }}>
              {[
                ['— I / sculpt', 'we listen, then we draw the silhouette.'],
                ['— II / forge', 'we make one version, well, before another.'],
                ['— III / polish', 'we refuse to ship until it feels still.'],
              ].map(([step, body], i) => (
                <div key={i} style={{
                  border:'1px solid rgba(10,10,10,0.14)',
                  borderRadius: 14,
                  padding: inFullscreen ? '32px 28px' : '24px 20px',
                  background:'var(--bone)',
                }}>
                  <div style={{
                    fontFamily:'var(--mono)', fontSize: inFullscreen ? 12 : 10,
                    letterSpacing:'0.22em', textTransform:'uppercase',
                    color: 'rgba(10,10,10,0.62)', marginBottom: 14,
                  }}>{step}</div>
                  <div style={{
                    fontFamily:'var(--display)',
                    fontSize: inFullscreen ? 26 : 18,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    color:'var(--ink)',
                  }}>{body}</div>
                </div>
              ))}
            </div>
          </div>

         </div>{/* /scroll wrapper */}

          <div className="site-paper-grain"/>
        </div>
      </div>

      <Vignette/>
      <StageGrain/>

      {/* Tiny footer mark — atelier signature, only during shipped beat */}
      <div style={{
        position:'absolute', left: 0, right: 0, bottom: 30,
        textAlign:'center',
        fontFamily:'var(--mono)', fontSize: 11, letterSpacing:'0.22em',
        textTransform:'uppercase',
        color:'rgba(244,241,236,0.32)',
        opacity: clamp((t - 7.6) / 0.6, 0, 1) - clamp((t - 9.0) / 0.6, 0, 1),
      }}>
        <span style={{color:'rgba(244,241,236,0.5)'}}>Atheric</span>
        <span style={{
          fontFamily:'var(--serif)', fontStyle:'italic', color: C.signal,
          textTransform:'none', letterSpacing:0, margin:'0 4px',
        }}>·</span>
        <span>liquid chrome edition · MMXXVI</span>
      </div>
    </React.Fragment>
  );
}

window.Scene = Scene;
