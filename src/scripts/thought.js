// thought.js — the ideas sheet's reveals. One IntersectionObserver toggling .is-in on the
// page's drawn rules, blocks and figures (the thesis stones), at the broadsheet's own
// cadence (0.09s stagger inside [data-reveal-group]) so /thought and the body share one
// rhythm. Plus the core-line word-split (the voice pull's technique, body.js §1b): each
// thesis's serif line rises word by word out of per-word masks — spaces stay bare text
// nodes so kerning, line-breaks and the resting render are untouched. No rAF, no state.
// Under prefers-reduced-motion everything presents fully formed (mirrors body.js);
// the split never happens, so the composed paragraphs stand (same for no-JS).

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealables = document.querySelectorAll('[data-reveal], [data-rule], [data-fig]');

if (reduce) {
  revealables.forEach((el) => el.classList.add('is-in'));
} else {
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.09).toFixed(2) + 's';
    });
  });

  // The core lines, set word by word. Split AFTER the group stagger above so each line's
  // group delay is known; the words carry it as their base, keeping the section's cadence
  // (index → display → core words → body) intact. 45ms letterpress stagger per word.
  document.querySelectorAll('.t-core').forEach((core) => {
    const base = parseFloat(core.style.transitionDelay) || 0;
    const words = [];
    const mask = (content) => {
      const w = document.createElement('span');
      w.className = 'w';
      const inner = document.createElement('span');
      inner.className = 'w__in';
      inner.append(content);
      w.append(inner);
      words.push(inner);
      return w;
    };
    [...core.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          frag.append(/^\s+$/.test(tok) ? document.createTextNode(tok) : mask(tok));
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const w = mask('');
        node.replaceWith(w);
        w.firstChild.append(node);
      }
    });
    words.forEach((el, i) => {
      el.style.transitionDelay = (base + i * 0.045).toFixed(3) + 's';
    });
    core.classList.add('t-core--split');
  });

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
  );
  revealables.forEach((el) => io.observe(el));
}
