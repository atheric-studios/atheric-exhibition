// Cloudflare Pages Function — POST /api/inquiry
//
// Receives the inquiry-form payload and emails it to the studio via
// Resend (https://resend.com). The send key is a Pages secret read from
// env.RESEND_API_KEY — nothing secret is committed. If the key is absent
// the function returns { ok: false } (501) so the front-end falls back to
// a prefilled mailto. Lives at functions/api/inquiry.js, which Pages maps
// to the route /api/inquiry.
//
// This is a Pages Function on the Workers runtime — NOT a Vercel handler:
//   - signature is onRequestPost({ request, env })
//   - the key comes from `env` (the binding object), not process.env
//   - it returns a standard Response (no res.status().json())
// Exporting only onRequestPost means Pages answers any non-POST method
// to this route with an automatic 405.
//
// ─── REQUIRED secret ─────────────────────────────────────────────────
// Cloudflare dashboard → Pages project → Settings → Environment variables
// → add as an encrypted Secret, for BOTH Production and Preview:
//
//   RESEND_API_KEY     your Resend API key (looks like "re_...")
//
// ─── OPTIONAL vars (defaults if unset) ───────────────────────────────
//
//   INQUIRY_TO         inbox that receives inquiries   (default: hello@atheric.eu)
//   INQUIRY_FROM       verified Resend sender address  (default: Atheric <onboarding@resend.dev>)
//
// INQUIRY_FROM must be an address on a domain verified in Resend before
// real mail will deliver; the onboarding@resend.dev default only sends to
// your own Resend account for testing.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost({ request, env }) {
  const key = env.RESEND_API_KEY;
  if (!key) {
    // No backend configured yet → the client falls back to mailto.
    return json({ ok: false, error: 'not configured' }, 501);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  body = body || {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const project = String(body.project || '').trim();
  const budget = String(body.budget || '').trim();
  const timeline = String(body.timeline || '').trim();

  if (!name || !email || !message) {
    return json({ ok: false, error: 'name, email and message are required' }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'invalid email' }, 400);
  }

  const to = env.INQUIRY_TO || 'hello@atheric.eu';
  const from = env.INQUIRY_FROM || 'Atheric <onboarding@resend.dev>';

  const text =
    `New commission inquiry\n\n` +
    `Name:     ${name}\n` +
    `Email:    ${email}\n` +
    `Project:  ${project || '—'}\n` +
    `Budget:   ${budget || '—'}\n` +
    `Timeline: ${timeline || '—'}\n\n` +
    `${message}\n`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Commission inquiry — ${name}`,
        text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return json({ ok: false, error: 'send failed', detail: detail.slice(0, 300) }, 502);
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'send failed' }, 502);
  }
}
