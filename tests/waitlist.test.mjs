import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";

test("Node API is write-only, validates, deduplicates and persists registrations", async () => {
  const data = await mkdtemp(path.join(tmpdir(), "twiddle-waitlist-"));
  const port = await new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
  const child = spawn(process.execPath, ["ecs-api/server.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATA_DIR: data,
      RESEND_API_KEY: "",
    },
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + "/api/healthz")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 30));
    }
    assert.ok(ready);
    assert.equal((await fetch(base + "/api/waitlist")).status, 405);
    assert.equal((await fetch(base + "/api/waitlist?limit=1000")).status, 405);
    assert.equal((await fetch(base + "/data/waitlist.json")).status, 404);
    const post = (contact) =>
      fetch(base + "/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact, lang: "en" }),
      });
    assert.equal((await post("invalid")).status, 400);
    const first = await post("test@example.com");
    assert.equal(first.status, 200);
    assert.equal((await first.json()).ok, true);
    const duplicate = await post("TEST@example.com");
    assert.equal((await duplicate.json()).duplicate, true);
    const saved = JSON.parse(
      await readFile(path.join(data, "waitlist.json"), "utf8"),
    );
    assert.equal(saved.entries.length, 1);
    assert.equal((await fetch(base + "/api/waitlist")).status, 405);
    const health = await (await fetch(base + "/api/healthz")).json();
    assert.equal("entries" in health, false);
    // Spoofing XFF must not bypass the trusted proxy's client IP.
    for (let i = 0; i < 8; i++)
      await fetch(base + "/api/waitlist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-real-ip": "test-proxy-client",
          "x-forwarded-for": `spoof-${i}`,
        },
        body: JSON.stringify({ contact: `rate${i}@example.com` }),
      });
    const limited = await fetch(base + "/api/waitlist", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "test-proxy-client",
        "x-forwarded-for": "new-spoof",
      },
      body: JSON.stringify({ contact: "rate-final@example.com" }),
    });
    assert.equal(limited.status, 429);
  } finally {
    child.kill();
    await new Promise((r) => child.once("exit", r));
    await rm(data, { recursive: true, force: true });
  }
});

test("Pages handler denies reading even without KV and preserves registration", async () => {
  const source = await readFile("functions/api/waitlist.js", "utf8");
  const api = await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
  assert.equal((await api.onRequestGet({ env: {} })).status, 405);
  assert.equal(
    "onRequest" in api,
    false,
    "generic middleware must not shadow method handlers",
  );
  const values = new Map();
  const env = {
    WAITLIST: {
      get: async (key) => values.get(key) ?? null,
      put: async (key, value) => {
        values.set(key, value);
      },
    },
  };
  const request = new Request("https://example.com/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "127.0.0.1",
    },
    body: JSON.stringify({ contact: "test@example.com", lang: "en" }),
  });
  const response = await api.onRequestPost({ request, env });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});
