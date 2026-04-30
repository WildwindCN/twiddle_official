// Cloudflare Pages Function: /api/numbers
// KV binding name: NUMBERS  (在 Pages 项目 Settings → Functions → KV bindings 里绑定)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export const onRequestPost = async ({ request, env }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const value = Number(body?.value);
  if (!Number.isFinite(value)) {
    return json({ error: 'value must be a finite number' }, 400);
  }

  const ts = Date.now();
  // 用时间戳 + 随机后缀作为 key,保证有序且唯一
  const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
  const key = `num:${id}`;

  await env.NUMBERS.put(key, JSON.stringify({ value, ts }));

  return json({ ok: true, id, value, ts });
};

export const onRequestGet = async ({ env }) => {
  // 列出最近 20 条。KV 的 list 按 key 字典序升序,所以时间戳大的在后,
  // 取出后反转即可得到“最近在前”。
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
};
