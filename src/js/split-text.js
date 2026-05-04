function splitText(el) {
  const text = el.innerHTML;
  // Carefully wrap each character, preserving inline tags by walking nodes.
  // Simpler: split by whitespace into words, then by chars per word, keeping <em></em>.
  // We'll do a regex-based split that preserves <em>..</em> blocks.
  const tokens = [];
  let buf = '';
  let i = 0;
  let inTag = false;
  let openEm = false;
  while (i < text.length) {
    const c = text[i];
    if (c === '<') {
      if (buf) { tokens.push({ type: 'text', value: buf, em: openEm }); buf = ''; }
      const close = text.indexOf('>', i);
      const tag = text.slice(i, close + 1);
      if (/<em\b/i.test(tag)) openEm = true;
      else if (/<\/em>/i.test(tag)) openEm = false;
      i = close + 1;
      continue;
    }
    buf += c;
    i++;
  }
  if (buf) tokens.push({ type: 'text', value: buf, em: openEm });

  el.innerHTML = '';
  let charIdx = 0;
  tokens.forEach(tok => {
    const words = tok.value.split(/(\s+)/);
    words.forEach(w => {
      if (!w) return;
      if (/^\s+$/.test(w)) {
        el.appendChild(document.createTextNode(w));
        return;
      }
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      for (const ch of w) {
        const charSpan = document.createElement(tok.em ? 'em' : 'span');
        charSpan.className = 'char';
        charSpan.textContent = ch;
        charSpan.style.animationDelay = (charIdx * 0.018) + 's';
        // expose index + parity for CSS-driven exit animations (e.g. inspect-mode)
        charSpan.style.setProperty('--ci', charIdx);
        charSpan.style.setProperty('--cm', charIdx % 2);
        wordSpan.appendChild(charSpan);
        charIdx++;
      }
      el.appendChild(wordSpan);
    });
  });
}

export function initSplitText() {
  document.querySelectorAll('[data-split]').forEach(splitText);
}
