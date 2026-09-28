# Twiddle official website

Bilingual brand site, SEED prototype presentation, regional store entry points and a write-only waitlist.

## Develop and verify

Requires Node.js 18+ and Python 3 for the optional static preview.

```sh
node scripts/build.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
node --test tests/waitlist.test.mjs
```

The static preview has no registration API. Use mocked browser responses for UI tests; never send test registrations to production.

- `index.html`: accessible, bilingual content (`data-zh` / `data-en`).
- `css/style.css`: responsive layout, locally hosted Space Mono, reduced-motion support.
- `js/main.js`: locale, region, form and dialog behavior.
- `js/site-config.js`: public store and official filing settings; no secrets.
- `scripts/build.mjs`: public asset allowlist, producing ignored `dist/`.
- `ecs-api/server.mjs`: mainland Node API, existing private JSON storage preserved.
- `functions/api/`: Cloudflare Pages API with existing KV integration.

Production must serve/upload `dist/`, never the repository root. Keep `functions/` at the project root when deploying Pages.

## Commerce

Both regional store links are disabled until real storefronts and checkout are verified. They lead to the waitlist while disabled. Before enabling a region in `js/site-config.js`, also update launch status, product copy and FAQ to match real pricing, availability, shipping and returns. This repository is the brand frontend, not a transaction or inventory system.

Populate filing numbers and official query links only after checking actual records. Mainland filing display is hostname-scoped. Default language is Chinese on mainland and local hosts, English internationally; a saved language preference takes precedence.

## Waitlist

- `POST /api/waitlist`: `{contact, lang}`; validates, rate-limits, deduplicates and registers.
- `GET /api/waitlist`: always 405; no public customer-list endpoint.
- Mainland `GET /api/healthz`: service status, no customer counts.

Email provider secrets stay in existing server/Pages environment settings. The frontend requires explicit privacy consent. An actual shop, payments and filing submission remain separate rollout steps.

See [DEPLOY.md](DEPLOY.md) for publishing and recovery.
