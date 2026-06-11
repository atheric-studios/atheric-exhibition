// inquiry-scene.jsx
// Atheric — Inquiry № 04. Code panel left, typed letter right.

const INK = '#0a0a0a';
const BONE = '#efece4';
const BONE_ON_INK = '#f4f1ec';
const SIGNAL = '#ff4d1f';
const RULE_INK = 'rgba(244,241,236,0.12)';
const RULE_INK_STRONG = 'rgba(244,241,236,0.40)';
const FG_DIM = 'rgba(244,241,236,0.55)';
const FG_MUTE = 'rgba(244,241,236,0.45)';

const DISPLAY = '"Archivo", "Helvetica Neue", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

// ── Typing helper ───────────────────────────────────────────────────────────
// Build a sequence of [time, action] events. Action is a string to append, or
// {bs: n} to backspace n chars, or {pause: s} (handled by spacing of times).
function typedAt(events, time) {
  let text = '';
  for (const e of events) {
    if (time < e.t) break;
    if (typeof e.do === 'string') text += e.do;
    else if (e.do.bs) text = text.slice(0, -e.do.bs);
    else if (e.do.set != null) text = e.do.set;
  }
  return text;
}

// Cursor blink
function Cursor({ color = BONE_ON_INK, w = 4, h = '1em', ml = 4, blink = true, opacity = 1 }) {
  const t = useTime();
  const on = blink ? Math.floor(t * 2) % 2 === 0 : true;
  return (
    <span style={{
      display: 'inline-block',
      width: w, height: h,
      background: color,
      marginLeft: ml,
      verticalAlign: '-0.12em',
      opacity: on ? opacity : 0,
    }} />
  );
}

// ── Code panel (left) ───────────────────────────────────────────────────────
// A "macOS" code editor window that scripts a brief commission email being
// typed in mono. Frames a few lines, then sends.
function CodePanel({ x, y, w, h }) {
  const t = useTime();

  // Code typing program — drives lines progressively (per-char)
  // Roughly seconds 1.0 → 8.5
  const prog = (() => {
    const start = 1.0;
    const elapsed = Math.max(0, t - start);
    // ~32 cps
    return Math.floor(elapsed * 34);
  })();

  const fullLines = [
    { tag: 'kw', text: 'compose ' }, // 0
    { tag: 'pl', text: 'inquiry №04', nl: true }, // 1
    { tag: 'sp', text: '' , nl: true},
    { tag: 'cm', text: '// to:   contact@atheric.eu', nl: true },
    { tag: 'cm', text: '// from: a small studio, helsinki', nl: true },
    { tag: 'sp', text: '' , nl: true},
    { tag: 'kw', text: 'subject ' },
    { tag: 'st', text: '"a small thing — well finished"', nl: true },
    { tag: 'sp', text: '' , nl: true},
    { tag: 'kw', text: 'body ' },
    { tag: 'op', text: '{', nl: true },
    { tag: 'in', text: '  greeting:  ' },
    { tag: 'st', text: '"hello,"', nl: true },
    { tag: 'in', text: '  voice:     ' },
    { tag: 'st', text: '"quiet, considered"', nl: true },
    { tag: 'in', text: '  ask:       ' },
    { tag: 'st', text: '"begin a small thing"', nl: true },
    { tag: 'in', text: '  promise:   ' },
    { tag: 'st', text: '"finish it well"', nl: true },
    { tag: 'op', text: '}', nl: true },
    { tag: 'sp', text: '' , nl: true},
    { tag: 'kw', text: 'send ' },
    { tag: 'pl', text: '→' },
  ];

  // Compose flat string with markers, then slice
  const flat = fullLines.map((l, i) => l.text + (l.nl ? '\n' : '')).join('');
  const totalLen = flat.length;
  const shown = Math.min(totalLen, prog);

  // Reconstruct visible tokens
  const visible = [];
  let cursor = 0;
  for (const line of fullLines) {
    const len = line.text.length;
    if (cursor + len <= shown) {
      visible.push({ ...line, text: line.text });
    } else if (cursor < shown) {
      visible.push({ ...line, text: line.text.slice(0, shown - cursor) });
      cursor += len + (line.nl ? 1 : 0);
      // cap with cursor
      break;
    } else {
      break;
    }
    cursor += len + (line.nl ? 1 : 0);
  }

  // Color map
  const color = (tag) => ({
    kw: '#ff4d1f',  // signal — keywords
    pl: BONE_ON_INK,
    cm: 'rgba(244,241,236,0.38)',
    st: '#ffb43c',  // signal-2 — strings (warm secondary)
    in: FG_DIM,
    op: FG_DIM,
    sp: 'transparent',
  }[tag]);

  // Group into lines for rendering
  const lineGroups = [[]];
  for (const tk of visible) {
    lineGroups[lineGroups.length-1].push(tk);
    if (tk.nl) lineGroups.push([]);
  }
  // line numbers count
  const lineCount = Math.max(1, lineGroups.length);

  // Camera-like idle drift
  const drift = Math.sin(t * 0.3) * 2;

  // Panel slide-in
  const slide = animate({ from: -80, to: 0, start: 0.2, end: 1.2, ease: Easing.easeOutQuart })(t);
  const fade  = animate({ from: 0, to: 1, start: 0.2, end: 1.2 })(t);

  // After ~9s, dim & shift slightly left as focus moves to the right
  const dim = animate({ from: 0, to: 0.35, start: 9.0, end: 10.5 })(t);
  const offX = animate({ from: 0, to: -40, start: 9.0, end: 11.0, ease: Easing.easeInOutCubic })(t);

  return (
    <div style={{
      position:'absolute', left: x + slide + offX, top: y + drift, width: w, height: h,
      opacity: fade,
      borderRadius: 14,
      overflow: 'hidden',
      background: '#0e0e0d',
      border: `1px solid ${RULE_INK}`,
      boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02) inset',
      filter: `brightness(${1 - dim})`,
    }}>
      {/* mac titlebar */}
      <div style={{
        height: 36, display:'flex', alignItems:'center',
        padding:'0 14px', gap: 8,
        background:'#161614',
        borderBottom: `1px solid ${RULE_INK}`,
      }}>
        <span style={{width:11,height:11,borderRadius:'50%', background:'#3a3a38'}}/>
        <span style={{width:11,height:11,borderRadius:'50%', background:'#3a3a38'}}/>
        <span style={{width:11,height:11,borderRadius:'50%', background:'#3a3a38'}}/>
        <div style={{flex:1, textAlign:'center', fontFamily: MONO, fontSize: 11, letterSpacing:'0.18em', textTransform:'uppercase', color: FG_MUTE}}>
          atheric · commission.compose
        </div>
        <div style={{fontFamily: MONO, fontSize: 10, color: FG_MUTE, letterSpacing:'0.18em'}}>
          ⌘S
        </div>
      </div>
      {/* body */}
      <div style={{
        display:'grid', gridTemplateColumns:'56px 1fr',
        height: h - 36 - 32, // minus statusbar
      }}>
        {/* line numbers */}
        <div style={{
          padding:'24px 0',
          fontFamily: MONO, fontSize: 13, lineHeight: 1.85,
          color: 'rgba(244,241,236,0.20)',
          textAlign:'right', paddingRight: 14,
          borderRight: `1px solid ${RULE_INK}`,
          background: '#0c0c0b',
        }}>
          {Array.from({length: Math.max(lineCount, 22)}).map((_,i) => (
            <div key={i}>{String(i+1).padStart(2,'0')}</div>
          ))}
        </div>
        {/* code */}
        <div style={{
          padding:'24px 24px',
          fontFamily: MONO, fontSize: 13, lineHeight: 1.85,
          color: BONE_ON_INK,
          whiteSpace:'pre',
          letterSpacing: 0,
        }}>
          {lineGroups.map((line, li) => (
            <div key={li} style={{minHeight: '1.85em'}}>
              {line.map((tk, i) => (
                <span key={i} style={{
                  color: color(tk.tag),
                  fontStyle: tk.tag === 'st' ? 'normal' : 'normal',
                }}>
                  {tk.text}
                </span>
              ))}
              {/* caret on the last visible line, while typing is in progress */}
              {li === lineGroups.length-1 && t < 8.6 && t > 1.0 && (
                <Cursor color={SIGNAL} w={2} h="1.1em" ml={1} />
              )}
            </div>
          ))}
        </div>
      </div>
      {/* status */}
      <div style={{
        height: 32, display:'flex', alignItems:'center',
        padding: '0 14px', gap: 14,
        background:'#0e0e0d',
        borderTop: `1px solid ${RULE_INK}`,
        fontFamily: MONO, fontSize: 10, letterSpacing:'0.18em', textTransform:'uppercase',
        color: FG_MUTE,
      }}>
        <span style={{color: SIGNAL}}>● rec</span>
        <span>commission.txt</span>
        <span style={{flex:1}}/>
        <span>UTF-8</span>
        <span>· ln {lineCount}</span>
        <span>· hel</span>
      </div>
    </div>
  );
}

// ── Letter (right) ──────────────────────────────────────────────────────────
// The big Archivo lowercase letter that gets typed, with the "small/big"
// false-start and the italic-orange period at the end.
//
// Plan (times in seconds, anchored to scene t):
//  9.0  kicker reveals + caret blinks
//  9.6  start typing "let's "
// 10.6  type italic "begin " (instrument serif, signal)
// 11.4  type "a "
// 11.8  type "big " (mistake — Archivo, white)
// 12.7  pause
// 13.0  backspace 4 chars ("big ")
// 14.0  type "small "
// 15.0  type "thing,\n"
// 16.2  type "and finish it well"
// 18.6  type "."  (Archivo white)
// 19.4  pause
// 19.7  backspace 1 (the dot)
// 20.3  type italic "." (serif, signal) — the wordmark ornament
// 21.0  hello@atheric.eu reveal underneath
// 24.0  hairline draws under it
// 25.0  hold

function LetterPanel({ x, y, w, h }) {
  const t = useTime();

  // Build a typed plan as a function of t. We model it as a state machine
  // that produces an array of segments: { kind: 'normal'|'italic', text }.
  const segs = computeLetter(t);

  // Reveal of frame
  const fade = animate({ from: 0, to: 1, start: 7.5, end: 8.6 })(t);
  const slide = animate({ from: 60, to: 0, start: 7.5, end: 8.8, ease: Easing.easeOutQuart })(t);

  // Kicker
  const kickerFade = animate({ from: 0, to: 1, start: 8.4, end: 9.2 })(t);
  const kickerLine = animate({ from: 0, to: 28, start: 8.6, end: 9.4, ease: Easing.easeOutQuart })(t);

  // contact reveal opacity
  const contactFade = animate({ from: 0, to: 1, start: 21.4, end: 22.4 })(t);
  const contactLine = animate({ from: 0, to: 1, start: 23.6, end: 25.0, ease: Easing.easeOutQuart })(t);
  const arrowFade = animate({ from: 0, to: 1, start: 22.6, end: 23.4 })(t);

  const fontSize = 'clamp(96px, 9.4vw, 156px)';

  // Decide whether to render trailing caret on the headline. We hide it after
  // the final italic period is set and contact info has fully come in.
  const showCaret = t < 21.5;

  return (
    <div style={{
      position:'absolute', left: x, top: y + slide, width: w, height: h,
      opacity: fade,
      padding: '52px 60px',
      boxSizing: 'border-box',
      display:'flex', flexDirection:'column',
      gap: 40,
    }}>
      {/* kicker */}
      <div style={{
        display:'inline-flex', alignItems:'center', gap: 14,
        opacity: kickerFade,
        fontFamily: MONO, fontSize: 12, letterSpacing: '0.22em',
        textTransform:'uppercase', color: SIGNAL,
      }}>
        <span style={{display:'inline-block', width: kickerLine, height: 1, background: SIGNAL}} />
        — inquiry № 04 / a small letter
      </div>

      {/* headline */}
      <div style={{
        fontFamily: DISPLAY,
        fontWeight: 800,
        textTransform: 'lowercase',
        fontSize: fontSize,
        letterSpacing: '-0.045em',
        lineHeight: 0.92,
        color: BONE_ON_INK,
        textWrap: 'balance',
      }}>
        {segs.map((s, i) => (
          <span key={i} style={s.italic ? {
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontWeight: 400,
            color: SIGNAL,
            letterSpacing: '-0.02em',
          } : {}}>
            {s.text}
          </span>
        ))}
        {showCaret && (
          <Cursor color={BONE_ON_INK} w={6} h="0.78em" ml={6} />
        )}
      </div>

      {/* contact reveal */}
      <div style={{
        marginTop: 'auto',
        display:'flex', alignItems:'center', gap: 18,
        opacity: contactFade,
      }}>
        <div style={{position:'relative', display:'inline-block'}}>
          <div style={{
            fontFamily: DISPLAY, fontWeight: 700,
            fontSize: 'clamp(28px, 2.4vw, 40px)',
            letterSpacing: '-0.02em',
            color: BONE_ON_INK,
            paddingBottom: 10,
          }}>
            hello@atheric.eu
          </div>
          <div style={{
            position:'absolute', left: 0, bottom: 0,
            width: `${contactLine * 100}%`, height: 1,
            background: BONE_ON_INK,
            transformOrigin:'left',
          }} />
        </div>
        <span style={{
          width: 36, height: 36, borderRadius: '50%',
          background: SIGNAL, display:'inline-flex',
          alignItems:'center', justifyContent:'center',
          opacity: arrowFade,
          transform: `scale(${0.6 + 0.4 * arrowFade})`,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 11L11 3M11 3H5M11 3V9" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </div>
  );
}

// Letter timeline — returns array of { text, italic } segments for current t.
function computeLetter(t) {
  // We define an ordered list of "events" with time + segment-level mutation.
  // Each event has either {add: {text, italic}} appended to last segment when
  // italic flag matches, otherwise opens a new segment; or {bs: n} which
  // backspaces n chars across segments from the end.
  //
  // We derive the visible text by walking time-ordered events; for "typing"
  // strings we expand them per-char with even spacing.

  const program = [];
  // helper to push char-by-char
  let now = 9.6;
  const type = (text, italic, cps = 16) => {
    for (const ch of text) {
      program.push({ t: now, op: 'add', ch, italic });
      now += 1 / cps;
    }
  };
  const wait = (s) => { now += s; };
  const bs = (n, cps = 24) => {
    for (let i = 0; i < n; i++) {
      program.push({ t: now, op: 'bs' });
      now += 1 / cps;
    }
  };

  type("let's ", false, 18);
  wait(0.15);
  type("begin ", true, 14);    // italic serif signal
  wait(0.15);
  type("a ", false, 18);
  wait(0.18);
  type("big ", false, 14);     // false start — Archivo white
  wait(0.95);                  // hesitation
  bs(4, 18);                   // delete "big "
  wait(0.35);
  type("small ", false, 16);
  wait(0.15);
  type("thing, ", false, 17);
  wait(0.20);
  type("and finish it well", false, 18);
  wait(0.30);
  type(".", false, 12);        // Archivo period
  wait(0.85);                  // pause to consider
  bs(1, 20);                   // delete the period
  wait(0.45);
  type(".", true, 10);         // italic-serif signal period — the ornament

  // Walk events up to current time; build segments
  const segs = [];
  const lastSeg = () => segs[segs.length - 1];
  const append = (ch, italic) => {
    if (!lastSeg() || lastSeg().italic !== italic) {
      segs.push({ text: '', italic });
    }
    lastSeg().text += ch;
  };
  const back = () => {
    if (!segs.length) return;
    const s = lastSeg();
    s.text = s.text.slice(0, -1);
    if (s.text === '') segs.pop();
  };

  for (const ev of program) {
    if (t < ev.t) break;
    if (ev.op === 'add') append(ev.ch, ev.italic);
    else if (ev.op === 'bs') back();
  }
  return segs;
}

// ── Top chrome (kicker + clock) ─────────────────────────────────────────────
function Chrome() {
  const t = useTime();
  const fade = animate({ from: 0, to: 1, start: 0.0, end: 0.8 })(t);
  // clock ticks
  const clockSecs = Math.floor(t);
  const hh = '14';
  const mm = String(3 + Math.floor(clockSecs / 60)).padStart(2,'0');
  const ss = String((5 + clockSecs) % 60).padStart(2,'0');
  return (
    <div style={{
      position:'absolute', top: 0, left: 0, right: 0, height: 64,
      display:'flex', alignItems:'center', padding:'0 48px',
      borderBottom: `1px solid ${RULE_INK}`,
      opacity: fade,
      zIndex: 4,
    }}>
      <div style={{
        fontFamily: DISPLAY, fontWeight: 800, fontSize: 18,
        letterSpacing: '-0.015em',
        display:'inline-flex', alignItems:'center', gap: 10,
        color: BONE_ON_INK,
      }}>
        <span style={{
          width: 14, height: 14, borderRadius:'50%',
          background: 'radial-gradient(circle at 30% 30%, #fff 0%, #d4cdbe 30%, #4a4640 70%, #0a0a0a 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}/>
        Atheric<em style={{
          fontFamily: SERIF, fontStyle:'italic', fontWeight: 400,
          color: SIGNAL, marginLeft: 2,
        }}>.</em>
      </div>
      <div style={{flex:1}}/>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing:'0.22em',
        textTransform:'uppercase', color: FG_DIM,
      }}>
        hel · {hh}.{mm}.{ss}
      </div>
    </div>
  );
}

// ── Bottom chrome (caption + seal) ──────────────────────────────────────────
function Footer() {
  const t = useTime();
  const fade = animate({ from: 0, to: 1, start: 0.6, end: 1.4 })(t);
  return (
    <div style={{
      position:'absolute', left: 0, right: 0, bottom: 0, height: 56,
      display:'flex', alignItems:'center', padding:'0 48px',
      borderTop: `1px solid ${RULE_INK}`,
      opacity: fade,
      zIndex: 4,
      fontFamily: MONO, fontSize: 10, letterSpacing:'0.22em',
      textTransform:'uppercase', color: FG_MUTE,
    }}>
      <span>fig. 04 — the inquiry · how a letter is set</span>
      <div style={{flex:1}}/>
      <span style={{display:'inline-flex', alignItems:'center', gap: 8}}>
        <span style={{
          width: 7, height: 7, borderRadius:'50%',
          background: SIGNAL,
          boxShadow: `0 0 12px ${SIGNAL}`,
          animation: 'none',
        }}/>
        live · mmxxvi
      </span>
    </div>
  );
}

// ── Establishing rule that draws across, then becomes the divider ───────────
function CenterRule() {
  const t = useTime();
  // Vertical hairline between code and letter
  const reveal = animate({ from: 0, to: 1, start: 1.2, end: 2.2, ease: Easing.easeOutQuart })(t);
  return (
    <div style={{
      position:'absolute', left: '50%', top: 96, bottom: 88,
      width: 1,
      background: RULE_INK_STRONG,
      transform: `scaleY(${reveal})`,
      transformOrigin: 'top',
      opacity: 0.6,
    }}/>
  );
}

// ── Final stamp (specimen mark) ─────────────────────────────────────────────
function Stamp() {
  const t = useTime();
  const fade = animate({ from: 0, to: 1, start: 24.5, end: 25.4 })(t);
  const rot = animate({ from: -8, to: 0, start: 24.5, end: 25.6, ease: Easing.easeOutBack })(t);
  return (
    <div style={{
      position:'absolute', right: 80, bottom: 110,
      opacity: fade,
      transform: `rotate(${rot}deg)`,
      border: `1px solid ${SIGNAL}`,
      color: SIGNAL,
      borderRadius: 4,
      padding: '8px 14px',
      fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em',
      textTransform: 'uppercase',
      background: 'rgba(255,77,31,0.04)',
      zIndex: 5,
    }}>
      received · № 04 · mmxxvi
    </div>
  );
}

// ── Scene root ──────────────────────────────────────────────────────────────
function InquiryScene() {
  return (
    <div style={{position:'absolute', inset: 0, background: INK, color: BONE_ON_INK, overflow:'hidden'}}>
      <Chrome />
      <CenterRule />
      <CodePanel  x={64}  y={96}  w={820} h={864} />
      <LetterPanel x={896} y={96}  w={960} h={864} />
      <Footer />
      <Stamp />
    </div>
  );
}

Object.assign(window, { InquiryScene, CodePanel, LetterPanel, Chrome, Footer, CenterRule, Stamp, Cursor, computeLetter });
