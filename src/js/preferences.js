import { cameraState } from './chrome-blob.js';

// preferences — Apple-style settings sheet, slide-out from the right.
// three toggles (motion / sound / lab) + a quiet studio section with
// GitHub link, inline legal expansion, and copyright. persistence via
// localStorage; first-visit motion default follows OS prefers-reduced-motion.

const STORAGE_KEY = 'atheric.preferences.v1';

// --------------------------------------------------------------------------
// state — single source of truth for all preference values
// --------------------------------------------------------------------------
const defaults = {
  motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'quiet' : 'normal',
  sound: 'off',
  lab: 'visible',
};

let prefs = { ...defaults };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    prefs = { ...defaults, ...parsed };
  } catch (e) { /* ignore corrupt storage */ }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }
  catch (e) { /* quota / disabled — silent */ }
}

// --------------------------------------------------------------------------
// effects — apply each preference to the running site
// --------------------------------------------------------------------------
function applyMotion() {
  document.body.classList.toggle('motion-quiet', prefs.motion === 'quiet');
  cameraState.motionQuiet = (prefs.motion === 'quiet');
}

function applySound() {
  // mirror the existing nav audio toggle
  const navBtn = document.getElementById('audio');
  if (navBtn) navBtn.setAttribute('aria-pressed', prefs.sound === 'on' ? 'true' : 'false');
}

function applyLab() {
  document.body.classList.toggle('lab-hidden', prefs.lab === 'hidden');
}

function applyAll() {
  applyMotion();
  applySound();
  applyLab();
}

// --------------------------------------------------------------------------
// sheet DOM — built once on init, hidden until opened
// --------------------------------------------------------------------------
let shellEl, panelEl, overlayEl;
let isOpen = false;
let openerEl = null;

function buildShell() {
  shellEl = document.createElement('div');
  shellEl.id = 'preferences-shell';
  shellEl.setAttribute('aria-hidden', 'true');
  shellEl.innerHTML = `
    <div class="pref-overlay"></div>
    <aside class="pref-panel" role="dialog" aria-modal="true" aria-label="preferences" tabindex="-1">
      <header class="pref-header">
        <h2 class="pref-title">Preferences</h2>
        <button class="pref-close" type="button" aria-label="close preferences">
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <section class="pref-section">
        <h3 class="pref-section-title">— motion</h3>
        <div class="pref-row" data-pref-row="motion">
          <span class="pref-label">Reduce motion</span>
          <button class="pref-toggle" type="button" data-pref-toggle="motion" aria-pressed="false">
            <span class="pref-state"></span>
          </button>
        </div>
        <p class="pref-hint">Pauses the chrome shader and other ambient animation. Default follows your system setting.</p>
      </section>

      <section class="pref-section">
        <h3 class="pref-section-title">— sound</h3>
        <div class="pref-row" data-pref-row="sound">
          <span class="pref-label">Sound effects</span>
          <button class="pref-toggle" type="button" data-pref-toggle="sound" aria-pressed="false">
            <span class="pref-state"></span>
          </button>
        </div>
        <p class="pref-hint">Soft synth cues in the lab. Off by default.</p>
      </section>

      <section class="pref-section">
        <h3 class="pref-section-title">— lab</h3>
        <div class="pref-row" data-pref-row="lab">
          <span class="pref-label">Show inspect marker</span>
          <button class="pref-toggle" type="button" data-pref-toggle="lab" aria-pressed="true">
            <span class="pref-state"></span>
          </button>
        </div>
        <p class="pref-hint">The small <em>[ inspect chrome ↗ ]</em> label on the hero.</p>
      </section>

      <section class="pref-section">
        <h3 class="pref-section-title">— studio</h3>
        <a class="pref-link" href="https://github.com/atheric-studios/atheric-exhibition" target="_blank" rel="noopener">
          <span>View source on GitHub</span>
          <span class="ext-arrow" aria-hidden="true">↗</span>
        </a>
        <button class="pref-link pref-expandable" type="button" aria-expanded="false">
          <span>Imprint &amp; licence</span>
          <span class="pref-chevron" aria-hidden="true">+</span>
        </button>
        <div class="pref-detail" hidden>
          <p class="pref-detail-block">
            <strong>Operator</strong><br>
            YDT Holdings Oy · Y-tunnus 3608568-3 · Finland<br>
            Atheric is the studio name, planned as an aputoiminimi of YDT Holdings Oy. Atheric is not yet trading. A postal address will be published before any commercial activity begins under this name. Not VAT-registered.<br>
            Contact: <a href="mailto:hello@atheric.eu">hello@atheric.eu</a>
          </p>
          <p class="pref-detail-block">
            <strong>Licence</strong><br>
            © 2026 Atheric. All rights reserved. This source is published for transparency, not for redistribution. Reading is welcome; copying, modifying, and republishing are not.
          </p>
        </div>
        <a class="pref-link" href="/privacy" data-nav-to="privacy">
          <span>Privacy notice</span>
          <span class="ext-arrow" aria-hidden="true">↗</span>
        </a>
        <p class="pref-colophon">Atheric · MMXXVI · liquid chrome edition</p>
      </section>
    </aside>
  `;
  document.body.appendChild(shellEl);
  panelEl = shellEl.querySelector('.pref-panel');
  overlayEl = shellEl.querySelector('.pref-overlay');

  // close affordances
  shellEl.querySelector('.pref-close').addEventListener('click', close);
  overlayEl.addEventListener('click', close);
  // close the panel when an in-app nav link inside it is clicked, so
  // the panel doesn't sit on top of the destination view. The actual
  // navigation is handled by page-transitions (which adds its own
  // listener on every [data-nav-to]); this close fires first because
  // it's registered before page-transitions' listeners are attached.
  shellEl.querySelectorAll('[data-nav-to]').forEach(el => {
    el.addEventListener('click', close);
  });

  // toggle handlers — each button flips its preference
  shellEl.querySelectorAll('[data-pref-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.prefToggle;
      togglePref(key);
    });
  });

  // legal expansion
  const expandBtn = shellEl.querySelector('.pref-expandable');
  const detailEl = shellEl.querySelector('.pref-detail');
  expandBtn.addEventListener('click', () => {
    const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
    expandBtn.setAttribute('aria-expanded', !expanded);
    detailEl.hidden = expanded;
    const chevron = expandBtn.querySelector('.pref-chevron');
    if (chevron) chevron.textContent = expanded ? '+' : '–';
  });
}

// --------------------------------------------------------------------------
// toggle — flip a preference, persist, apply, sync UI
// --------------------------------------------------------------------------
function togglePref(key) {
  if (key === 'motion') prefs.motion = prefs.motion === 'quiet' ? 'normal' : 'quiet';
  else if (key === 'sound') prefs.sound = prefs.sound === 'on' ? 'off' : 'on';
  else if (key === 'lab') prefs.lab = prefs.lab === 'visible' ? 'hidden' : 'visible';
  save();
  applyAll();
  syncToggleUI();
}

function syncToggleUI() {
  const map = {
    motion: prefs.motion === 'quiet',
    sound: prefs.sound === 'on',
    lab: prefs.lab === 'visible',
  };
  Object.entries(map).forEach(([key, on]) => {
    const btn = shellEl.querySelector(`[data-pref-toggle="${key}"]`);
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const state = btn.querySelector('.pref-state');
    if (state) state.textContent = on ? 'on' : 'off';
  });
}

// --------------------------------------------------------------------------
// open / close
// --------------------------------------------------------------------------
function open() {
  if (isOpen) return;
  isOpen = true;
  openerEl = document.activeElement;
  syncToggleUI();
  shellEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('preferences-open');
  // focus the panel for keyboard users
  setTimeout(() => panelEl.focus(), 60);
}

function close() {
  if (!isOpen) return;
  isOpen = false;
  shellEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('preferences-open');
  // hand focus back to whatever opened the sheet
  if (openerEl && openerEl.isConnected) openerEl.focus({ preventScroll: true });
  openerEl = null;
}

// --------------------------------------------------------------------------
// integration with the existing nav sound button — clicking it should also
// update prefs, so the two stay in sync.
// --------------------------------------------------------------------------
function syncWithNavAudio() {
  const navBtn = document.getElementById('audio');
  if (!navBtn) return;
  navBtn.addEventListener('click', () => {
    // existing audio.js toggles aria-pressed; we read the new value and persist
    queueMicrotask(() => {
      const on = navBtn.getAttribute('aria-pressed') === 'true';
      prefs.sound = on ? 'on' : 'off';
      save();
      syncToggleUI();
    });
  });
}

// --------------------------------------------------------------------------
export function initPreferences() {
  load();
  buildShell();
  applyAll();
  syncToggleUI();
  syncWithNavAudio();

  // open trigger — nav link with [data-pref-open]
  document.querySelectorAll('[data-pref-open]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  });

  // global Esc to close
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });
}
