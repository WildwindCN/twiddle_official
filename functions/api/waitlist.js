// Cloudflare Pages Function: /api/waitlist
// KV binding name: WAITLIST
// Required env var for email auto-reply: RESEND_API_KEY
// Optional env var: MAIL_FROM (default: "Twiddle AI <contact@twiddle-ai.com>")

// 与 /api/lang 保持一致的区域语言判定
const CHINESE_REGIONS = new Set(['CN', 'HK', 'MO', 'TW']);
const pickLangByGeo = (request) => {
    const country = (request.cf && request.cf.country) || 'XX';
    return CHINESE_REGIONS.has(country) ? 'zh' : 'en';
};
const resolveLang = (bodyLang, request) => {
    // 优先用前端传的,未传再用请求 IP 归属地兜底
    if (bodyLang === 'zh' || bodyLang === 'en') return bodyLang;
    return pickLangByGeo(request);
};

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

// ====== Resend integration ======
const MAIL_TEMPLATES = {
    en: {
        subject: 'Welcome to the Twiddle SEED Waitlist',
        text: (addr) =>
`Hi there,

Thanks for joining the Twiddle SEED waitlist — we're glad to have you along for the ride.

Twiddle SEED is the world's first hardware synthesizer with natural language timbre generation. We're hard at work crafting it, and you'll be among the first to hear when we have news worth sharing: prototype milestones, release dates, early-access opportunities.

If you have thoughts, questions, or just want to say hi, reply to this email — it lands directly in our inbox.

— The Twiddle AI team
contact@twiddle-ai.com

(You are receiving this email because ${addr} was submitted to our waitlist at twiddle-official.pages.dev. If this wasn't you, you can safely ignore this message.)
`,
        html: (addr) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.7;color:#222;max-width:560px;">
<p>Hi there,</p>
<p>Thanks for joining the <strong>Twiddle SEED</strong> waitlist — we're glad to have you along for the ride.</p>
<p>Twiddle SEED is the world's first hardware synthesizer with natural language timbre generation. We're hard at work crafting it, and you'll be among the first to hear when we have news worth sharing: prototype milestones, release dates, early-access opportunities.</p>
<p>If you have thoughts, questions, or just want to say hi, reply to this email — it lands directly in our inbox.</p>
<p style="margin-top:2em;">— The Twiddle AI team<br><a href="mailto:contact@twiddle-ai.com" style="color:#0066cc;">contact@twiddle-ai.com</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:2em 0;">
<p style="font-size:12px;color:#888;">You are receiving this email because <strong>${addr}</strong> was submitted to our waitlist at twiddle-official.pages.dev. If this wasn't you, you can safely ignore this message.</p>
</div>`,
    },
    zh: {
        subject: '欢迎加入 Twiddle SEED 等待列表',
        text: (addr) =>
`您好,

感谢您加入 Twiddle SEED 等待列表,我们很高兴能与您同行。

Twiddle SEED 是全球首台支持自然语言音色生成的硬件合成器。我们正在全力打磨它——原型进展、发布时间、早期体验机会等消息,您都将是第一批知晓的人。

如有任何想法或问题,请直接回复本邮件,会发送到我们的收件箱。

— Twiddle AI 团队
contact@twiddle-ai.com

(您收到本邮件是因为 ${addr} 通过 twiddle-official.pages.dev 加入了我们的等待列表。如非本人操作,忽略即可。)
`,
        html: (addr) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;line-height:1.8;color:#222;max-width:560px;">
<p>您好,</p>
<p>感谢您加入 <strong>Twiddle SEED</strong> 等待列表,我们很高兴能与您同行。</p>
<p>Twiddle SEED 是全球首台支持自然语言音色生成的硬件合成器。我们正在全力打磨它——原型进展、发布时间、早期体验机会等消息,您都将是第一批知晓的人。</p>
<p>如有任何想法或问题,请直接回复本邮件,会发送到我们的收件箱。</p>
<p style="margin-top:2em;">— Twiddle AI 团队<br><a href="mailto:contact@twiddle-ai.com" style="color:#0066cc;">contact@twiddle-ai.com</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:2em 0;">
<p style="font-size:12px;color:#888;">您收到本邮件是因为 <strong>${addr}</strong> 通过 twiddle-official.pages.dev 加入了我们的等待列表。如非本人操作,忽略即可。</p>
</div>`,
    },
};

async function sendWelcomeEmail(env, to, lang) {
    if (!env.RESEND_API_KEY) {
        console.log('[waitlist] RESEND_API_KEY not configured, skip sending email to', to);
        return;
    }
    const tpl = MAIL_TEMPLATES[lang] || MAIL_TEMPLATES.en;
    const from = env.MAIL_FROM || 'Twiddle AI <contact@twiddle-ai.com>';
    const payload = {
        from,
        to: [to],
        subject: tpl.subject,
        text: tpl.text(to),
        html: tpl.html(to),
    };
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!r.ok) {
            const t = await r.text();
            console.error('[waitlist] Resend API failed:', r.status, t);
        } else {
            console.log('[waitlist] welcome email sent to', to, 'lang=', lang);
        }
    } catch (e) {
        console.error('[waitlist] Resend fetch error:', e?.message || e);
    }
}

export const onRequestPost = async (context) => {
    const { request, env } = context;
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
      env.WAITLIST.put(dupKey, id), // no expiration: omit expirationTtl entirely (0 is invalid)
    ]);

    // 自动欢迎邮件:仅当 contact 是 email 时触发,异步发送,不阻塞响应
    if (entry.type === 'email') {
      const lang = resolveLang(body?.lang, request);
      const task = sendWelcomeEmail(env, rawContact, lang);
      if (context.waitUntil) {
        context.waitUntil(task);
      }
      // 若运行时不支持 waitUntil(极少数情况),task 仍会继续运行到完成
    }

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
