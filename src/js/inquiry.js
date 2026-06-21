// Inquiry form — the real commission form that replaced the decorative
// "compose" mockup. On submit it POSTs the payload as JSON to the
// serverless function at /api/inquiry (a Cloudflare Pages Function). If
// that endpoint isn't a configured function — local `vite` dev, a host
// without the function, or no email key
// set — the request won't come back as JSON {ok:true}, and we fall back to
// a prefilled mailto so the form is functional with zero backend config.
//
// Success → in-page confirmation, the form is hidden and focus moves to
// the confirmation block. Honours real <label>s, native validation,
// keyboard reach, and prefers-reduced-motion (the rise is CSS-gated).

const TO = 'hello@atheric.eu';

export function initInquiry() {
  const form = document.getElementById('inquiry');
  if (!form) return;

  const done = document.getElementById('inquiry-done');
  const doneLine = done && done.querySelector('[data-done-line]');
  const status = form.querySelector('.inquiry-status');
  const sendBtn = form.querySelector('.inquiry-send');
  const firstField = form.querySelector('#iq-name');

  const setStatus = (msg) => { if (status) status.textContent = msg || ''; };

  // Hero "Start a commission →" — smooth-anchor.js already scrolls the
  // section into view; we add focus so the keyboard lands inside the
  // form. preventScroll keeps the section-top landing the anchor chose.
  document.querySelectorAll('[data-inquiry-focus]').forEach((cta) => {
    cta.addEventListener('click', () => {
      setTimeout(() => firstField && firstField.focus({ preventScroll: true }), 140);
    });
  });

  const mailtoFor = (d) => {
    const subject = `Commission inquiry — ${d.name || 'a small thing'}`;
    const body =
      `Name: ${d.name}\n` +
      `Email: ${d.email}\n` +
      `Project: ${d.project}\n` +
      `Budget: ${d.budget}\n` +
      `Timeline: ${d.timeline || '—'}\n\n` +
      `${d.message}\n`;
    return `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const showDone = (variant, data) => {
    if (doneLine) {
      doneLine.textContent = variant === 'sent'
        ? `Your inquiry is in. We'll reply to ${data.email} — conversations by appointment.`
        : `Your mail client should have opened a message to ${TO}. Send it, and we'll take it from there.`;
    }
    form.hidden = true;
    if (done) {
      done.hidden = false;
      requestAnimationFrame(() => done.classList.add('in'));
      done.focus();
    }
  };

  const reset = () => {
    form.reset();
    setStatus('');
    if (done) { done.hidden = true; done.classList.remove('in'); }
    form.hidden = false;
    if (firstField) firstField.focus({ preventScroll: true });
  };

  if (done) {
    const again = done.querySelector('[data-inquiry-reset]');
    if (again) again.addEventListener('click', reset);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Native validation: real labels, required fields, type=email.
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = Object.fromEntries(new FormData(form).entries());

    sendBtn.disabled = true;
    setStatus('— sending…');

    let sent = false;
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      // Only a real function returning JSON {ok:true} counts as sent.
      // On a host where /api/inquiry isn't a function, the SPA rewrite
      // serves index.html (text/html) — that must NOT read as success,
      // so anything else falls through to the mailto path below.
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('application/json')) {
        const json = await res.json().catch(() => ({}));
        sent = json && json.ok === true;
      }
    } catch (_) {
      sent = false;
    }

    sendBtn.disabled = false;

    if (sent) {
      showDone('sent', data);
    } else {
      // Zero-config fallback — open a prefilled mail to the studio.
      setStatus('');
      window.location.href = mailtoFor(data);
      showDone('mailto', data);
    }
  });
}
