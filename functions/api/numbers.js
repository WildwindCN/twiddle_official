// Cloudflare Pages Function: /api/numbers
// KV binding name: NUMBERS  (在 Pages 项目 Settings → Functions → KV bindings 里绑定)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const ensureKV = (env) => {
  if (!env || !env.NUMBERS || typeof env.NUMBERS.put !== 'function') {
    throw new Error(
      'KV binding "NUMBERS" 未找到。请到 Cloudflare Pages 项目 → Settings → Functions → KV namespace bindings，' +
      '添加 Variable name = NUMBERS，并 Retry deployment。'
    );
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    ensureKV(env);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid JSON body' }, 400);
    }

    const value = Number(body?.value);
    if (!Number.isFinite(value)) {
      return json({ error: 'value must be a finite number' }, 400);
    }

    const ts = Date.now();
    const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `num:${id}`;

    await env.NUMBERS.put(key, JSON.stringify({ value, ts }));
    return json({ ok: true, id, value, ts });
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
};

export const onRequestGet = async ({ env }) => {
  try {
    ensureKV(env);

    const { keys } = await env.NUMBERS.list({ prefix: 'num:', limit: 100 });
    const recent = keys.slice(-20);

    const items = await Promise.all(
      recent.map(async (k) => {
        const raw = await env.NUMBERS.get(k.name);
        try {
          const obj = JSON.parse(raw);
          return { key: k.name, ...obj };
        } catch {
          return { key: k.name, value: null, ts: 0 };
        }
      })
    );

    items.sort((a, b) => b.ts - a.ts);
    return json({ items });
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
};

// 兜底：任何其他方法都返回 JSON，而不是空响应
export const onRequest = async () =>
  json({ error: 'method not allowed' }, 405);
