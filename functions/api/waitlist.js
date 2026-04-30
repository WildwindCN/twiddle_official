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
const LOGO_URL = 'https://www.twiddle-ai.com/images/logo_v2_trans_black.png';
const SITE_URL = 'https://www.twiddle-ai.com';

const MAIL_TEMPLATES = {
    en: {
        subject: "You're on the Twiddle SEED waitlist",
        text: () =>
`Hi,

Thank you for joining the Twiddle SEED waitlist.

We're building a new kind of AI instrument: a natural-language-driven AI synthesizer that turns the sound in your mind into something you can play.

Our goal is to make sound creation feel more natural — describe an idea, a feeling, or a sound, and bring it to your fingertips.

We're glad to have you with us at this early stage.

We'll keep you updated on Twiddle SEED's progress, including product updates, testing opportunities, launch plans, and early access availability.

Thank you for your interest, patience, and support.
Stay tuned.

Twiddle AI Team
www.twiddle-ai.com
`,
        html: () => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 40px 16px;background:#ffffff;text-align:left;">
        <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
          <img src="${LOGO_URL}" alt="Twiddle AI" width="120" style="display:block;border:0;outline:none;max-width:120px;height:auto;">
        </a>
      </td></tr>
      <tr><td style="padding:8px 40px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#222;">
        <h1 style="margin:16px 0 24px;font-size:22px;font-weight:700;color:#111;line-height:1.35;">You're on the Twiddle SEED waitlist</h1>
        <p style="margin:0 0 1em;">Hi,</p>
        <p style="margin:0 0 1em;">Thank you for joining the Twiddle SEED waitlist.</p>
        <p style="margin:0 0 1em;">We're building a new kind of AI instrument: a natural-language-driven AI synthesizer that turns the sound in your mind into something you can play.</p>
        <p style="margin:0 0 1em;">Our goal is to make sound creation feel more natural — describe an idea, a feeling, or a sound, and bring it to your fingertips.</p>
        <p style="margin:0 0 1em;">We're glad to have you with us at this early stage.</p>
        <p style="margin:0 0 1em;">We'll keep you updated on Twiddle SEED's progress, including product updates, testing opportunities, launch plans, and early access availability.</p>
        <p style="margin:0 0 1em;">Thank you for your interest, patience, and support.<br>Stay tuned.</p>
        <p style="margin:2em 0 0;">Twiddle AI Team<br><a href="${SITE_URL}" style="color:#0066cc;text-decoration:none;">www.twiddle-ai.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    },
    zh: {
        subject: '感谢你加入 Twiddle SEED 等待名单',
        text: () =>
`感谢你加入 Twiddle SEED 的等待名单。

我们正在创造一件全新的AI乐器:一台由自然语言驱动的 AI合成器。
它可以让你用一句话描述脑海中的声音,并将这种想象转化为可以被亲手演奏的音色。

我们希望它不仅是一件工具,更是一种新的创作入口,让灵感更快抵达指尖。

很高兴能在这个早期阶段与你相遇。

未来,Twiddle SEED 的每一次重要进展,包括产品更新、测试机会、发布计划和体验资格,我们都会第一时间通过邮件与你分享。

感谢你的关注、耐心与支持。
请持续关注我们的最新进展。

Twiddle AI Team
www.twiddle-ai.com
`,
        html: () => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 40px 16px;background:#ffffff;text-align:left;">
        <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
          <img src="${LOGO_URL}" alt="Twiddle AI" width="120" style="display:block;border:0;outline:none;max-width:120px;height:auto;">
        </a>
      </td></tr>
      <tr><td style="padding:8px 40px 40px;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:15px;line-height:1.85;color:#222;">
        <h1 style="margin:16px 0 24px;font-size:22px;font-weight:700;color:#111;line-height:1.4;">感谢你加入 Twiddle SEED 等待名单</h1>
        <p style="margin:0 0 1em;">感谢你加入 Twiddle SEED 的等待名单。</p>
        <p style="margin:0 0 1em;">我们正在创造一件全新的 AI 乐器:一台由自然语言驱动的 AI 合成器。它可以让你用一句话描述脑海中的声音,并将这种想象转化为可以被亲手演奏的音色。我们希望它不仅是一件工具,更是一种新的创作入口,让灵感更快抵达指尖。</p>
        <p style="margin:0 0 1em;">很高兴能在这个早期阶段与你相遇。</p>
        <p style="margin:0 0 1em;">未来,Twiddle SEED 的每一次重要进展,包括产品更新、测试机会、发布计划和体验资格,我们都会第一时间通过邮件与你分享。</p>
        <p style="margin:0 0 1em;">感谢你的关注、耐心与支持。<br>请持续关注我们的最新进展。</p>
        <p style="margin:2em 0 0;">Twiddle AI Team<br><a href="${SITE_URL}" style="color:#0066cc;text-decoration:none;">www.twiddle-ai.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
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
        text: tpl.text(to),   // 模板目前未使用 addr,保留参数兼容未来扩展
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

    // Cloudflare 在 request.cf 里自带 GeoIP 信息,零延迟
    const cf = request.cf || {};
    const geo = {
      country: cf.country || null,      // ISO alpha-2, e.g. "CN", "US"
      region: cf.region || null,        // 省/州
      city: cf.city || null,
      timezone: cf.timezone || null,
      continent: cf.continent || null,  // "AS", "NA", ...
    };

    const entry = {
      id,
      contact: rawContact,
      type: isEmail(rawContact) ? 'email' : 'phone',
      ts,
      geo,
      // 注:不持久化原始 IP(隐私考虑);IP 仅用于请求内限流,不写入 entry
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
