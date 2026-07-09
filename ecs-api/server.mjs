// ecs-api/server.mjs — TwiddleSEED waitlist backend (stdlib-only Node).
//
// Replaces the Cloudflare Pages Function `functions/api/waitlist.js` for the
// ECS static deploy. Same behavior contract (validate → sanitize → rate limit
// per IP → dedupe → store → Resend welcome email) and a parallel
// `GET /api/waitlist` admin reader, but persistence is a single JSON file
// (no KV) and the runtime is node:http with zero npm dependencies.
//
// Endpoints
//   GET  /api/healthz      → 200 ok
//   GET  /api/lang         → 404 (frontend falls through to navigator.language;
//                                  ECS 没有 CF 的 GeoIP, 装 GeoLite 太重)
//   GET  /api/waitlist     → last 20 entries
//   POST /api/waitlist     → { contact: string, lang?: 'zh'|'en' }
//                           returns { ok, id?, contact, duplicate? }
//   *    anything else     → 405 / 404
//
// Config (env, loaded by systemd EnvironmentFile):
//   PORT             default 8791
//   DATA_DIR         default /opt/twiddle_official/data  (chmod 700, gitignore)
//   RESEND_API_KEY   optional; if missing, log + skip email
//   MAIL_FROM        default "Twiddle AI <contact@twiddle-ai.com>"
//   PUBLIC_BASE      default "https://twiddle-ai.com.cn"  (用于邮件里 logo/SITE 链接)
//
// 启动: `node ecs-api/server.mjs`
// systemd 单元: deploy/twiddle-official-waitlist.service

import http from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ── Config ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 8791);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || '/opt/twiddle_official/data';
const STORE_PATH = path.join(DATA_DIR, 'waitlist.json');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || 'Twiddle AI <contact@twiddle-ai.com>';
const PUBLIC_BASE = (process.env.PUBLIC_BASE || 'https://twiddle-ai.com.cn').replace(/\/$/, '');
const LOGO_URL = `${PUBLIC_BASE}/images/logo_v2_trans_black.png`;
const SITE_URL = PUBLIC_BASE;

// ── Persistence ──────────────────────────────────────────────────────────
// Single JSON file holding entries + dedup map. Read-modify-write is
// serialized by an in-process queue — we only ever have one node process,
// so this is enough for a small waitlist. Use atomic rename for crash-safety.
const store = { entries: /** @type {Entry[]} */ ([]), dedup: /** @type {Record<string,string>} */ ({}) };
let writeChain = Promise.resolve();
let loaded = false;

async function loadOnce() {
    if (loaded) return;
    if (!existsSync(STORE_PATH)) { loaded = true; return; }
    try {
        const raw = await readFile(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        store.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
        store.dedup = (parsed.dedup && typeof parsed.dedup === 'object') ? parsed.dedup : {};
    } catch (e) {
        console.error('[waitlist] failed to read store, starting empty:', e?.message);
        store.entries = [];
        store.dedup = {};
    }
    loaded = true;
}

async function persist() {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
    await rename(tmp, STORE_PATH);
}

function mutate(fn) {
    // Serialize all mutating operations through a single promise chain,
    // and return whatever fn() resolves with (so callers can read back state).
    const next = writeChain.then(async () => {
        await loadOnce();
        const result = await fn();
        await persist();
        return result;
    });
    writeChain = next.catch(() => { /* keep chain alive on errors */ });
    return next;
}

// ── Validation / sanitization (parity with functions/api/waitlist.js) ────
const sanitize = (s) => String(s ?? '').trim().replace(/[<>]/g, '').slice(0, 128);
const isEmail = (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
const isPhone = (v) => /^[\d\s\-+()]{7,20}$/.test(v);
const normalizeKey = (v) => isEmail(v) ? v.toLowerCase() : v.replace(/\s/g, '');

// ── Rate limiting (in-memory, per-IP, 5 req / 60s) ──────────────────────
const rateMap = new Map(); // ip -> { count, windowStart }
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function rateCheck(ip) {
    const now = Date.now();
    const cur = rateMap.get(ip);
    if (!cur || now - cur.windowStart > RATE_WINDOW_MS) {
        rateMap.set(ip, { count: 1, windowStart: now });
        return { ok: true, remaining: RATE_LIMIT - 1 };
    }
    if (cur.count >= RATE_LIMIT) return { ok: false };
    cur.count += 1;
    return { ok: true, remaining: RATE_LIMIT - cur.count };
}

// ── Client IP ───────────────────────────────────────────────────────────
function getClientIP(req) {
    // nginx 把真实客户端 IP 放进 X-Forwarded-For / X-Real-IP
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) {
        return xff.split(',')[0].trim();
    }
    const xr = req.headers['x-real-ip'];
    if (typeof xr === 'string' && xr.length) return xr.trim();
    return req.socket?.remoteAddress || 'unknown';
}

// ── Email templates (parity with functions/api/waitlist.js) ─────────────
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
${SITE_URL}
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
        <p style="margin:2em 0 0;">Twiddle AI Team<br><a href="${SITE_URL}" style="color:#0066cc;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, '')}</a></p>
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
${SITE_URL}
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
        <p style="margin:2em 0 0;">Twiddle AI Team<br><a href="${SITE_URL}" style="color:#0066cc;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, '')}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    },
};

async function sendWelcomeEmail(to, lang) {
    if (!RESEND_API_KEY) {
        console.log('[waitlist] RESEND_API_KEY not set, skip email to', to);
        return;
    }
    const tpl = MAIL_TEMPLATES[lang] || MAIL_TEMPLATES.en;
    const payload = {
        from: MAIL_FROM,
        to: [to],
        subject: tpl.subject,
        text: tpl.text(),
        html: tpl.html(),
    };
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!r.ok) {
            const t = await r.text();
            console.error('[waitlist] Resend failed:', r.status, t);
        } else {
            console.log('[waitlist] welcome email sent to', to, 'lang=', lang);
        }
    } catch (e) {
        console.error('[waitlist] Resend fetch error:', e?.message || e);
    }
}

// ── HTTP helpers ────────────────────────────────────────────────────────
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (res, status, data) => {
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), ...CORS });
    res.end(body);
};

async function readJsonBody(req, maxBytes = 8 * 1024) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > maxBytes) throw new Error('Body too large');
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new Error('Invalid JSON body');
    }
}

// ── Handlers ────────────────────────────────────────────────────────────
async function handleHealth(_req, res) {
    json(res, 200, { ok: true, ts: Date.now(), entries: store.entries.length });
}

async function handleLang(_req, res) {
    // ECS 没有 Cloudflare 的 cf.country 字段;轻量化起见,不接 GeoIP。
    // 返回 404 让前端走 navigator.language 兜底,行为跟 /api/lang 不可用时一致。
    json(res, 404, { error: 'lang detection disabled on ECS deploy' });
}

async function handleGetList(_req, res) {
    await loadOnce();
    const items = store.entries.slice().sort((a, b) => b.ts - a.ts).slice(0, 20);
    json(res, 200, { items });
}

async function handlePostWaitlist(req, res) {
    let body;
    try {
        body = await readJsonBody(req);
    } catch (e) {
        return json(res, 400, { error: e?.message || 'Invalid body' });
    }
    const rawContact = sanitize(body?.contact);
    if (!rawContact) return json(res, 400, { error: 'Contact is required' });
    if (!isEmail(rawContact) && !isPhone(rawContact)) {
        return json(res, 400, { error: 'Invalid email or phone number' });
    }

    const ip = getClientIP(req);
    const rl = rateCheck(ip);
    if (!rl.ok) return json(res, 429, { error: 'Too many requests. Please try again later.' });

    const key = normalizeKey(rawContact);
    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const type = isEmail(rawContact) ? 'email' : 'phone';
    const entry = {
        id,
        contact: rawContact,
        type,
        ts: now,
        ua: req.headers['user-agent'] || null,
    };

    // Dedupe + append atomically through the in-process queue.
    const { duplicate } = await mutate(async () => {
        if (store.dedup[key]) return { duplicate: true };
        store.dedup[key] = id;
        store.entries.push(entry);
        // 保留最近 1000 条,防止 JSON 文件无限增长
        if (store.entries.length > 1000) {
            const drop = store.entries.length - 1000;
            store.entries.splice(0, drop);
        }
        return { duplicate: false };
    });

    if (duplicate) {
        return json(res, 200, { ok: true, message: 'Already on the waitlist', duplicate: true });
    }

    // 异步发邮件,不阻塞响应
    if (type === 'email') {
        const lang = (body?.lang === 'zh' || body?.lang === 'en') ? body.lang : 'en';
        sendWelcomeEmail(rawContact, lang).catch(() => { /* logged inside */ });
    }

    json(res, 200, { ok: true, id, contact: rawContact });
}

// ── Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS);
        return res.end();
    }

    try {
        if (path === '/api/healthz') return await handleHealth(req, res);
        if (path === '/api/lang') return await handleLang(req, res);
        if (path === '/api/waitlist' && req.method === 'GET') return await handleGetList(req, res);
        if (path === '/api/waitlist' && req.method === 'POST') return await handlePostWaitlist(req, res);
        if (path === '/api/waitlist') return json(res, 405, { error: 'Method not allowed' });
        return json(res, 404, { error: 'Not found' });
    } catch (e) {
        console.error('[waitlist] unhandled error:', e?.stack || e);
        json(res, 500, { error: e?.message || 'Internal error' });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`[waitlist] listening on http://${HOST}:${PORT}  data=${STORE_PATH}`);
    loadOnce().catch((e) => console.error('[waitlist] load failed:', e?.message));
});

// Graceful shutdown so systemd can stop cleanly.
for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
        console.log(`[waitlist] ${sig} received, closing`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 5000).unref();
    });
}
