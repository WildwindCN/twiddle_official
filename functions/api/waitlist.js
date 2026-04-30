// Cloudflare Pages Function: /api/waitlist
// KV binding name: WAITLIST

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
  });

const ensureKV = (env) => {
  if (!env || !env.WAITLIST || typeof env.WAITLIST.put !== 'function') {
    throw new Error(
      'KV binding "WAITLIST" not found. Please add it in Cloudflare Pages project Settings → Functions → KV namespace bindings.'
    );
  }
};

// Simple sanitization: strip HTML-like tags and trim
const sanitize = (str) =>
  String(str)
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 128);

const isEmail = (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
const isPhone = (v) => /^[\d\s\-+()]{7,20}$/.test(v);

const getClientIP = (request) => {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown'
  );
};

// Simple rate-limit key per IP (1-minute window)
const rateLimitKey = (ip) => `rl:${ip}`;

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

export const onRequestPost = async ({ request, env }) => {
  try {
    ensureKV(env);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const rawContact = sanitize(body?.contact);
    if (!rawContact) {
      return json({ error: 'Contact is required' }, 400);
    }
    if (!isEmail(rawContact) && !isPhone(rawContact)) {
      return json({ error: 'Invalid email or phone number' }, 400);
    }

    const ip = getClientIP(request);
    const now = Date.now();

    // Rate limiting: max 5 submissions per minute per IP
    const rlKey = rateLimitKey(ip);
    let rlData = { count: 0, windowStart: now };
    try {
      const rlRaw = await env.WAITLIST.get(rlKey);
      if (rlRaw) rlData = JSON.parse(rlRaw);
    } catch { /* ignore */ }

    if (now - rlData.windowStart > 60000) {
      rlData = { count: 0, windowStart: now };
    }
    rlData.count += 1;
    if (rlData.count > 5) {
      return json({ error: 'Too many requests. Please try again later.' }, 429);
    }
    await env.WAITLIST.put(rlKey, JSON.stringify(rlData), { expirationTtl: 120 });

    // Normalize contact for dedup key (lowercase email, strip phone spaces)
    const normalized = isEmail(rawContact)
      ? rawContact.toLowerCase()
      : rawContact.replace(/\s/g, '');
    const dupKey = `waitlist:contact:${normalized}`;

    // Duplicate check
    const existing = await env.WAITLIST.get(dupKey);
    if (existing) {
      return json({ ok: true, message: 'Already on the waitlist', duplicate: true });
    }

    const ts = now;
    const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
    const entryKey = `waitlist:${id}`;

    const entry = {
      id,
      contact: rawContact,
      type: isEmail(rawContact) ? 'email' : 'phone',
      ts,
      ip,
    };

    // Store both the entry and the dedup marker
    await Promise.all([
      env.WAITLIST.put(entryKey, JSON.stringify(entry)),
      env.WAITLIST.put(dupKey, id, { expirationTtl: 0 }), // no expiration (or very long)
    ]);

    return json({ ok: true, id, contact: rawContact });
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
};

export const onRequestGet = async ({ env }) => {
  try {
    ensureKV(env);

    const { keys } = await env.WAITLIST.list({ prefix: 'waitlist:', limit: 100 });
    // Filter out rate-limit keys and dedup keys
    const entryKeys = keys.filter((k) =>
      k.name.startsWith('waitlist:') &&
      !k.name.startsWith('waitlist:contact:')
    );

    const recent = entryKeys.slice(-20);
    const items = await Promise.all(
      recent.map(async (k) => {
        const raw = await env.WAITLIST.get(k.name);
        try {
          return JSON.parse(raw);
        } catch {
          return { key: k.name, contact: null, ts: 0 };
        }
      })
    );

    items.sort((a, b) => b.ts - a.ts);
    return json({ items });
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
};

export const onRequest = async () =>
  json({ error: 'Method not allowed' }, 405);
