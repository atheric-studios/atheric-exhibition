export const cursorMouse = { x: 0, y: 0 };

export function initInteractions() {
  const fine = matchMedia('(pointer: fine)').matches;

  // Custom cursor
  const cDot = document.getElementById('cursor-dot');
  const cRing = document.getElementById('cursor-ring');
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;

  if (fine) {
    // translate3d (not translate) so the cursor elements get their own
    // compositor layer — keeps them responsive even when the chrome
    // shader is loading the GPU.
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      cDot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursorMouse.x = (mx / innerWidth) * 2 - 1;
      cursorMouse.y = -((my / innerHeight) * 2 - 1);
    }, { passive: true });

    addEventListener('pointerdown', () => document.body.classList.add('cursor-press'));
    addEventListener('pointerup', () => document.body.classList.remove('cursor-press'));

    const hoverables = 'a,button,[data-magnetic],.card,.panel,.index-row,.specimen,.audio-toggle';
    document.addEventListener('pointerover', e => {
      if (e.target.closest(hoverables)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('pointerout', e => {
      if (e.target.closest(hoverables)) document.body.classList.remove('cursor-hover');
    });

    const ringLoop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      cRing.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(ringLoop);
    };
    ringLoop();
  }

  // Magnetic pull on links/buttons
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });

  // Tilt on panels
  document.querySelectorAll('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', (px * 100) + '%');
      el.style.setProperty('--my', (py * 100) + '%');
      const rx = (py - 0.5) * -6;
      const ry = (px - 0.5) * 6;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  });
}
