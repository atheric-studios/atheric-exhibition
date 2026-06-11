import { cameraState } from './chrome-blob.js';
import { exitInspect } from './inspect.js';

// page-transitions: the chrome blob's grammar for moving between pages.
//
// gestures:
// - hover anticipation: nav-link hover compresses the blob to ~0.3 (a third
//   of the way down), like a button being pre-pressed. release → spring back.
// - launch: click commits the gesture — compress + lift up + clear frame.
//   the email-send swoosh. routing happens during the tail of the launch.
// - settle: returning to home springs the blob back from 0 → 1 → 0 ease-out.
//
// nothing here knows about the router yet. phase 1 wires hover + exposes
// launchBlob() / resetBlob() for testing; phase 2 will hook actual routes.

const HOVER_COMPRESS = 0.30;
const HOVER_EASE = 0.06;     // soft ease for previewing
const LAUNCH_EASE = 0.18;    // faster ease for committing
const SETTLE_EASE = 0.10;    // gentle return

let isLaunching = false;

// --------------------------------------------------------------------------
// public API
// --------------------------------------------------------------------------

/**
 * Compress + lift the blob until it clears the frame. Calls onComplete
 * when the blob is ~85% departed (offscreen but still finishing animation).
 */
export function launchBlob(onComplete) {
  if (isLaunching) return;
  isLaunching = true;
  cameraState.compressTarget = 1.0;
  cameraState.compressEase = LAUNCH_EASE;

  const t0 = performance.now();
  const MAX_WAIT = 1100;
  const ARRIVE_AT = 0.85;
  const check = () => {
    const elapsed = performance.now() - t0;
    if (cameraState.compressCurrent >= ARRIVE_AT || elapsed > MAX_WAIT) {
      isLaunching = false;
      if (typeof onComplete === 'function') onComplete();
      // drain any navigation queued during this launch. navigateTo's own
      // arrival callback drains first; anything still here was stranded by
      // a launch that didn't come through the router.
      if (pendingNav) {
        const next = pendingNav;
        pendingNav = null;
        navigateTo(next.view, next.options);
      }
    } else {
      setTimeout(check, 30);
    }
  };
  setTimeout(check, 30);
}

/** Spring the blob back to its resting state. Used on home arrival. */
export function resetBlob() {
  cameraState.compressTarget = 0;
  cameraState.compressEase = SETTLE_EASE;
}

/** Switch the blob between full home (4 spheres) and page mode (2 marbles). */
export function setPageMode(mode) {
  cameraState.pageMode = mode ? 1 : 0;
}

// --------------------------------------------------------------------------
// view navigation + URL routing. multiple <main data-view> blocks share the
// page; one is visible at a time. clicking a [data-nav-to] link triggers the
// launch animation, swaps views during the offscreen window, flips pageMode
// based on the destination, then springs the blob back from above.
// uses the History API for real URLs (/library) with back/forward support
// and deep-linking. on initial page load, the URL is parsed and the matching
// view is shown directly (no launch — there's nothing to launch from).
// --------------------------------------------------------------------------

const ROUTES = [
  { view: 'home',      path: '/',          title: 'Atheric — a small studio for digital work' },
  { view: 'library',   path: '/library',   title: 'library — Atheric' },
  { view: 'author',    path: '/author',    title: 'author — Atheric' },
  // privacy notice — its own URL so it stays stable when cited in
  // contracts, email footers, or DPA controller-register entries.
  { view: 'privacy',   path: '/privacy',   title: 'privacy — Atheric' },
  // case studies — three "alive" projects under /library
  { view: 'library-1', path: '/library/1', title: 'aevum — Atheric' },     // spa
  { view: 'library-2', path: '/library/2', title: 'forma — Atheric' },     // architecture
  { view: 'library-3', path: '/library/3', title: 'codon — Atheric' },     // genetics
];

// case-study views: the chrome blob is replaced by a project-specific
// scene (its own canvas, its own material). the main blob hides; page
// mode is irrelevant.
const CASE_STUDY_VIEWS = new Set(['library-1', 'library-2', 'library-3']);

function viewFromPath(path) {
  // treat /library/ as /library — hosts serve both spellings
  const clean = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  const r = ROUTES.find(x => x.path === clean);
  return r ? r.view : 'home';
}
function pathFromView(view) {
  const r = ROUTES.find(x => x.view === view);
  return r ? r.path : '/';
}

let currentView = 'home';

function showView(name) {
  document.querySelectorAll('main[data-view]').forEach(m => {
    m.hidden = (m.dataset.view !== name);
  });
  currentView = name;
  document.body.dataset.view = name;
  const route = ROUTES.find(r => r.view === name);
  if (route && route.title) document.title = route.title;
}

// a navigation requested mid-launch (e.g. back/forward pressed during the
// animation) is remembered and replayed on arrival instead of dropped —
// otherwise the URL and the visible view desync until the next click.
let pendingNav = null;

export function navigateTo(view, options = {}) {
  if (isLaunching) {
    pendingNav = { view, options };
    return;
  }
  if (view === currentView) return;

  // an open inspect lab must not survive a view swap — it holds
  // overflow:hidden, scrollOverride, and the inspect-active recede.
  exitInspect();

  const pushHistory = options.pushHistory !== false;
  if (pushHistory) {
    history.pushState({ view }, '', pathFromView(view));
  }

  // 1. launch the current blob (compress + lift)
  launchBlob(() => {
    // 2. while the blob is offscreen, swap views and flip pageMode.
    // case studies replace the blob with their own scene — keep the
    // chrome blob compressed (offscreen) so it doesn't render behind
    // the case-study material.
    showView(view);
    const isCaseStudy = CASE_STUDY_VIEWS.has(view);
    setPageMode(view === 'home' ? 0 : 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
    // 3. for non-case-study views, spring the blob back. for case
    // studies, keep it lifted off-frame.
    if (!isCaseStudy) resetBlob();
    // 4. play the assemble animation on the arriving view
    document.body.classList.add('view-arriving');
    setTimeout(() => document.body.classList.remove('view-arriving'), 600);
    // 5. hand focus to the arriving view's heading so keyboard and
    // screen-reader users land where the page did. preventScroll —
    // we just scrolled to top ourselves.
    const heading = document.querySelector(`main[data-view="${view}"] h1`);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  });
}

function attachNavRoutes() {
  // intercept plain left-clicks on [data-nav-to] links. modified clicks
  // (cmd/ctrl/shift/middle) fall through to the browser — the hrefs are
  // real paths, so open-in-new-tab works. menu-sheet links are owned by
  // nav-menu.js (close the sheet first, then navigate) — skip them here
  // so they don't get a second, immediate handler.
  document.querySelectorAll('[data-nav-to]:not([data-menu-link])').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      navigateTo(el.dataset.navTo);
    });
  });
  // browser back/forward — replay the launch gesture without pushing history
  addEventListener('popstate', (e) => {
    const view = (e.state && e.state.view) || viewFromPath(location.pathname);
    navigateTo(view, { pushHistory: false });
  });
}

// on initial load, parse the URL and jump straight to the matching view.
// no launch — there's nothing to launch from. the loader covers the
// momentary mismatch (chrome blob defaults to home mode for one frame).
function applyInitialRoute() {
  const view = viewFromPath(location.pathname);
  // record current state so back/forward can return to it correctly.
  // keep query + hash — campaign params and #anchors must survive load.
  history.replaceState({ view }, '', location.pathname + location.search + location.hash);
  if (view !== 'home') {
    showView(view);
    setPageMode(1);
    // case studies bring their own scene; pin the studio chrome blob
    // off-frame so it doesn't render through the case-study material.
    if (CASE_STUDY_VIEWS.has(view)) {
      cameraState.compressTarget = 1.0;
      cameraState.compressCurrent = 1.0;
    }
  }
}

// --------------------------------------------------------------------------
// hover anticipation — nav links compress the blob a third of the way as
// the cursor enters. lifts it back on leave. ignored if a launch is active.
// --------------------------------------------------------------------------

function attachHoverAnticipation() {
  // exclude preferences link (opens a sheet, no launch) and the secondary
  // mark (external — different gesture handling)
  const links = document.querySelectorAll(
    '.nav .link:not([data-pref-open]), .nav .mark:not(.mark-secondary)'
  );
  links.forEach(el => {
    el.addEventListener('pointerenter', () => {
      if (isLaunching) return;
      if (cameraState.compressTarget >= 1.0) return;
      cameraState.compressTarget = HOVER_COMPRESS;
      cameraState.compressEase = HOVER_EASE;
    });
    el.addEventListener('pointerleave', () => {
      if (isLaunching) return;
      if (cameraState.compressTarget >= 1.0) return;
      cameraState.compressTarget = 0;
      cameraState.compressEase = HOVER_EASE;
    });
  });
}

// --------------------------------------------------------------------------
// dev triggers — manual ways to feel the gesture before routing exists.
//   - press 'L' to fire a launch + auto-reset after 800ms
//   - press 'P' to toggle page mode (tiny 2-sphere top-left)
//   - window.__atheric_launch() / __atheric_pagemode() in console
// --------------------------------------------------------------------------

function attachDevTriggers() {
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.key === 'l' || e.key === 'L') {
      launchBlob(() => setTimeout(resetBlob, 800));
    } else if (e.key === 'p' || e.key === 'P') {
      setPageMode(cameraState.pageMode === 0 ? 1 : 0);
    }
  });
  // also expose globally for devtools tinkering
  window.__atheric_launch = () => launchBlob(() => setTimeout(resetBlob, 800));
  window.__atheric_pagemode = (mode) => setPageMode(mode);
  window.__atheric_state = cameraState;
}

// --------------------------------------------------------------------------
export function initPageTransitions() {
  document.body.dataset.view = currentView;
  attachHoverAnticipation();
  attachNavRoutes();
  // dev-only — stray 'l'/'p' keypresses must not desync production
  if (import.meta.env.DEV) attachDevTriggers();
  applyInitialRoute();
}
