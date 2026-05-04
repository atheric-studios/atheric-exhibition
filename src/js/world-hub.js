// the studio's window onto the world.
// four cells: helsinki (home), london, new york, tokyo.
// - clocks: real, ticking every second (Intl.DateTimeFormat per timezone).
// - weather: simulated. each city has its own state machine + temp drift.
// the ticker beneath the cells (coordinates + studio fragments) is pure
// CSS — no JS needed. seamless loop via duplicated track + translateX.

const CITIES = [
  {
    id: 'helsinki',
    timezone: 'Europe/Helsinki',
    weather: { tempBase: 2,  tempRange: 7,  allowSnow: true  },
  },
  {
    id: 'london',
    timezone: 'Europe/London',
    weather: { tempBase: 12, tempRange: 6,  allowSnow: false },
  },
  {
    id: 'newyork',
    timezone: 'America/New_York',
    weather: { tempBase: 11, tempRange: 11, allowSnow: true  },
  },
  {
    id: 'tokyo',
    timezone: 'Asia/Tokyo',
    weather: { tempBase: 18, tempRange: 7,  allowSnow: false },
  },
];

// ---------------------------------------------------------------------------
// weather simulation
// state machine — each transition has a weighted probability. transitions
// fire every 2–5 minutes per city. temperature drifts on a smooth random
// walk toward a state-biased target, with tiny per-tick noise.
// ---------------------------------------------------------------------------
const WEATHER_STATES = ['clear', 'partly', 'overcast', 'rain', 'snow'];

const TRANSITIONS = {
  clear:    { clear: 0.50, partly: 0.40, overcast: 0.05, rain: 0.00, snow: 0.00 },
  partly:   { clear: 0.30, partly: 0.35, overcast: 0.30, rain: 0.05, snow: 0.00 },
  overcast: { clear: 0.05, partly: 0.25, overcast: 0.40, rain: 0.30, snow: 0.00 },
  rain:     { clear: 0.00, partly: 0.10, overcast: 0.40, rain: 0.50, snow: 0.05 },
  snow:     { clear: 0.05, partly: 0.15, overcast: 0.40, rain: 0.00, snow: 0.40 },
};

const TEMP_BIAS = { clear: 1.0, partly: 0.0, overcast: -0.6, rain: -1.5, snow: -3.0 };

function pickTransition(state, allowSnow) {
  const t = TRANSITIONS[state];
  let r = Math.random();
  if (!allowSnow) {
    // redistribute snow's weight evenly across other options
    const snowW = t.snow || 0;
    if (snowW > 0) r = r * (1 - snowW);
  }
  let acc = 0;
  for (const next of WEATHER_STATES) {
    if (next === 'snow' && !allowSnow) continue;
    acc += t[next] || 0;
    if (r < acc) return next;
  }
  return state;
}

// ---------------------------------------------------------------------------
// time + market — both real, both per-timezone via Intl.DateTimeFormat.
// ---------------------------------------------------------------------------
function getCityNow(timezone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type) => parts.find(p => p.type === type)?.value;
  // some browsers render midnight as "24" in en-US 24h mode; normalize.
  let hh = get('hour') || '00';
  if (hh === '24') hh = '00';
  return {
    weekday: get('weekday'),
    hh,
    mm: get('minute') || '00',
    ss: get('second') || '00',
  };
}

// ---------------------------------------------------------------------------
// hand-drawn weather glyphs — minimal SVG, single stroke weight, in studio
// voice. stroke uses currentColor so they pick up the bone-tinted parent.
// ---------------------------------------------------------------------------
const GLYPHS = {
  clear: `<svg viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="2.8"/>
    <line x1="9" y1="2.8" x2="9" y2="4.2"/>
    <line x1="9" y1="13.8" x2="9" y2="15.2"/>
    <line x1="2.8" y1="9" x2="4.2" y2="9"/>
    <line x1="13.8" y1="9" x2="15.2" y2="9"/>
    <line x1="4.6" y1="4.6" x2="5.6" y2="5.6"/>
    <line x1="12.4" y1="12.4" x2="13.4" y2="13.4"/>
    <line x1="13.4" y1="4.6" x2="12.4" y2="5.6"/>
    <line x1="5.6" y1="12.4" x2="4.6" y2="13.4"/>
  </svg>`,
  partly: `<svg viewBox="0 0 18 18">
    <circle cx="6.2" cy="6.5" r="2"/>
    <line x1="6.2" y1="2.6" x2="6.2" y2="3.6"/>
    <line x1="6.2" y1="9.4" x2="6.2" y2="10.2"/>
    <line x1="2.4" y1="6.5" x2="3.4" y2="6.5"/>
    <line x1="9" y1="6.5" x2="10" y2="6.5"/>
    <path d="M 4 13.2 Q 4 10.5 6.8 10.5 Q 7.4 8.6 9.6 9.2 Q 12.5 8.6 12.7 11.4 Q 15 11.4 15 13.2 Z"/>
  </svg>`,
  overcast: `<svg viewBox="0 0 18 18">
    <path d="M 2.8 12 Q 2.8 9 5.6 9 Q 6.2 6.4 8.6 7 Q 12 6.4 12.4 9.6 Q 15.4 9.6 15.4 12 Z"/>
    <path d="M 4.6 14.5 Q 4.6 13 6.4 13 Q 7 11.4 9 11.8 Q 11.6 11.4 11.8 13.4 Q 13.6 13.4 13.6 14.5 Z" opacity="0.55"/>
  </svg>`,
  rain: `<svg viewBox="0 0 18 18">
    <path d="M 2.8 10 Q 2.8 7 5.6 7 Q 6.2 4.4 8.6 5 Q 12 4.4 12.4 7.6 Q 15.4 7.6 15.4 10 Z"/>
    <line x1="5.6" y1="12" x2="4.6" y2="14.6"/>
    <line x1="9" y1="12" x2="8" y2="14.6"/>
    <line x1="12.4" y1="12" x2="11.4" y2="14.6"/>
  </svg>`,
  snow: `<svg viewBox="0 0 18 18">
    <path d="M 2.8 10 Q 2.8 7 5.6 7 Q 6.2 4.4 8.6 5 Q 12 4.4 12.4 7.6 Q 15.4 7.6 15.4 10 Z"/>
    <line x1="5.4" y1="12.4" x2="5.4" y2="14.6"/>
    <line x1="4.4" y1="13.5" x2="6.4" y2="13.5"/>
    <line x1="9" y1="12.4" x2="9" y2="14.6"/>
    <line x1="8" y1="13.5" x2="10" y2="13.5"/>
    <line x1="12.6" y1="12.4" x2="12.6" y2="14.6"/>
    <line x1="11.6" y1="13.5" x2="13.6" y2="13.5"/>
  </svg>`,
};

// ---------------------------------------------------------------------------
// per-city runtime state. note: the rolling track is duplicated in the DOM
// for seamless loop, so each city has TWO instances on the page. all
// renders use querySelectorAll and update both copies.
// ---------------------------------------------------------------------------
const cityState = {};

function initCity(city) {
  cityState[city.id] = {
    weather: 'partly',
    temp: city.weather.tempBase + (Math.random() - 0.5) * 2,
    tempTarget: city.weather.tempBase,
    nextTransition: performance.now() + 60_000 + Math.random() * 90_000,
  };
}

function tickWeather(city, nowMs) {
  const s = cityState[city.id];
  if (nowMs >= s.nextTransition) {
    s.weather = pickTransition(s.weather, city.weather.allowSnow);
    s.nextTransition = nowMs + 120_000 + Math.random() * 180_000; // 2–5 min
    s.tempTarget = city.weather.tempBase
                 + (Math.random() - 0.5) * city.weather.tempRange
                 + (TEMP_BIAS[s.weather] || 0);
  }
  s.temp += (s.tempTarget - s.temp) * 0.018;
  s.temp += (Math.random() - 0.5) * 0.06;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
function fmtTemp(t) {
  const r = Math.round(t);
  if (r > 0) return `+${r}°`;
  if (r < 0) return `−${Math.abs(r)}°`;
  return `0°`;
}

function renderTime(city) {
  const now = getCityNow(city.timezone);
  const text = `${now.hh}:${now.mm}`;
  document.querySelectorAll(`[data-city="${city.id}"] .hs-time`).forEach(el => {
    el.textContent = text;
  });
}

function renderWeather(city) {
  const s = cityState[city.id];
  const text = fmtTemp(s.temp);
  document.querySelectorAll(`[data-city="${city.id}"] .hs-glyph`).forEach(el => {
    if (el.dataset.state !== s.weather) {
      el.innerHTML = GLYPHS[s.weather] || '';
      el.dataset.state = s.weather;
    }
  });
  document.querySelectorAll(`[data-city="${city.id}"] .hs-temp`).forEach(el => {
    el.textContent = text;
  });
}

// ---------------------------------------------------------------------------
export function initWorldHub() {
  const hub = document.querySelector('.hub');
  if (!hub) return;
  CITIES.forEach(initCity);
  // initial paint
  CITIES.forEach(c => { renderTime(c); renderWeather(c); });
  // clocks tick every minute (no seconds shown — ambient, not declarative)
  setInterval(() => CITIES.forEach(renderTime), 1000);
  // weather drifts every 8 seconds (state transitions every 2–5 min internally)
  setInterval(() => {
    const t = performance.now();
    CITIES.forEach(c => { tickWeather(c, t); renderWeather(c); });
  }, 8000);
}
