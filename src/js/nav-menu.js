// nav-menu — touch / narrow-viewport navigation sheet. mirrors the
// preferences-sheet pattern (slide-out from the right, overlay,
// dismissible by Esc / overlay click / link click). hidden on wide
// desktop with fine pointer; CSS handles the visibility branch.

import { navigateTo } from './page-transitions.js';

let shellEl, panelEl, overlayEl, burgerEl;
let isOpen = false;
let openerEl = null;

function open() {
  if (isOpen) return;
  isOpen = true;
  openerEl = document.activeElement;
  shellEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('nav-menu-open');
  burgerEl?.setAttribute('aria-expanded', 'true');
  setTimeout(() => panelEl.focus(), 60);
}

function close() {
  if (!isOpen) return;
  isOpen = false;
  shellEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('nav-menu-open');
  burgerEl?.setAttribute('aria-expanded', 'false');
  // hand focus back to whatever opened the sheet
  if (openerEl && openerEl.isConnected) openerEl.focus({ preventScroll: true });
  openerEl = null;
}

export function initNavMenu() {
  shellEl = document.getElementById('nav-menu-shell');
  if (!shellEl) return;
  panelEl = shellEl.querySelector('.nav-menu-panel');
  overlayEl = shellEl.querySelector('.nav-menu-overlay');
  burgerEl = document.querySelector('[data-menu-open]');

  burgerEl?.addEventListener('click', () => (isOpen ? close() : open()));
  overlayEl?.addEventListener('click', close);
  shellEl.querySelector('.nav-menu-close')?.addEventListener('click', close);

  // route links — close the sheet, then hand off to the SPA router.
  // page-transitions.js owns the launch animation; we just close first
  // so the sheet doesn't animate over the new view.
  shellEl.querySelectorAll('[data-menu-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      const view = link.dataset.navTo;
      // preferences link has no data-nav-to — it's handled by preferences.js
      // (which already listens for [data-pref-open] globally). it opens a
      // sheet rather than navigating, so modifiers don't apply: just close.
      if (!view) {
        close();
        return;
      }
      // modified clicks fall through to the browser — hrefs are real paths
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      close();
      // small delay so the sheet's translateX has time to ease back before
      // the launch animation kicks in — keeps the gesture readable.
      setTimeout(() => navigateTo(view), 180);
    });
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) close();
  });
}
