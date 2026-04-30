# TwiddleSEED Official Website

TwiddleSEED — World's First Hardware Synthesizer with Natural Language Timbre Control.

- **Frontend**: Static HTML/CSS/JS single-page site (`index.html`, `css/`, `js/`, `images/`)
- **Backend**: Cloudflare Pages Functions (`functions/api/waitlist.js`)
- **Storage**: Cloudflare Workers KV (waitlist entries)

## Features

- Bilingual (EN / ZH) support with language switch
- GSAP + ScrollTrigger scroll-driven animations
- Waitlist form with email / phone input
- Input validation, sanitization, rate limiting, and duplicate detection

## Directory Structure

```
├── index.html               # Main landing page
├── css/
│   └── style.css            # Styles
├── js/
│   └── main.js              # Animations + waitlist form logic
├── images/                  # Product images and logos
├── functions/
│   └── api/
│       └── waitlist.js      # POST / GET waitlist API
└── README.md
```

## Local Development

```bash
npm i -g wrangler

# Start local dev server with KV emulation
wrangler pages dev . --kv WAITLIST
```

Open http://localhost:8788 .

## Deploy to Cloudflare Pages

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "feat: TwiddleSEED website with waitlist"
   git push origin main
   ```

2. **Create KV Namespace**

   Cloudflare Dashboard → Workers & Pages → KV → Create a namespace → name it `waitlist-prod`.

3. **Create Pages Project**

   Workers & Pages → Create → Pages → Connect to Git → select this repository.

   Build settings (no build step):
   - Build command: *(leave empty)*
   - Build output directory: `/` *(or leave empty)*

4. **Bind KV to Pages Project**

   Project → Settings → Functions → **KV namespace bindings** → Add binding
   - Variable name: `WAITLIST` (must match `env.WAITLIST` in the code)
   - KV namespace: `waitlist-prod`

   Add it for both Production and Preview environments.

5. **Redeploy**

   Deployments → Retry deployment so the KV binding takes effect.

## API

- `POST /api/waitlist`  body: `{"contact": "user@example.com"}` → `{ok, id, contact}`
  - Validates email or phone number
  - Sanitizes input (strips HTML tags, trims, max 128 chars)
  - Rate-limits to 5 requests per minute per IP
  - Deduplicates by normalized contact
- `GET /api/waitlist` → `{items: [{id, contact, type, ts}, ...]}` (last 20 entries)
