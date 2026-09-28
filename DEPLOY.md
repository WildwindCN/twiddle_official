# Deployment — Twiddle brand site

## Mainland

- Origin: `https://github.com/WildwindCN/twiddle_official`
- Local: `/Users/zhangjiangnan/Developer/deployed-services/ecs-volce-14.103.86.179/twiddle_official`
- Server: SSH alias `gilmour`, `/opt/twiddle_official` (pull only).
- Public root: `/opt/twiddle_official/dist`.
- Nginx site: `/etc/nginx/sites-enabled/twiddle-ai.com.cn.conf`.
- API: `twiddle-official-waitlist.service`, localhost:8791.
- Private runtime data: `/opt/twiddle_official/data`; keep out of public root.

Publish after local checks and pushing the intended commit:

```sh
git pull --ff-only
node scripts/build.mjs
node --test tests/waitlist.test.mjs
# Back up the active Nginx config before replacing it.
cp nginx/twiddle-ai.com.cn.conf /etc/nginx/sites-enabled/twiddle-ai.com.cn.conf
nginx -t
systemctl restart twiddle-official-waitlist
systemctl reload nginx
```

Perform those server commands from `/opt/twiddle_official`. Do not copy any Flock or unrelated Nginx configuration. Verify public homepage, assets, language switch, API GET 405, and private paths 404. Do not POST test contacts to production.

For routine future frontend changes, build to a staged release directory and switch the Nginx root/symlink atomically where feasible. This initial migration changes the old repository root to `dist` after the new files exist.

## International

`www.twiddle-ai.com` points to `twiddle-official.pages.dev`.
The old project cache references account `0f5dbbfffc7b283e85b922257f530398`. The currently authenticated JohnGoner account has no `twiddle-official` project; do not create a duplicate or overwrite other sites.

Once access to the actual project is available:

1. Confirm source repo, production branch and latest deployment; the historical local JohnGoner checkout does not match the served frontend.
2. Preserve existing WAITLIST KV and RESEND_API_KEY / MAIL_FROM bindings. Never print secret values.
3. Build `dist/` and deploy a preview of this source, with `functions/` from the repository root.
4. Test method routing, privacy behavior, registration via an isolated preview KV, both locales and mobile view.
5. Publish production and verify the www endpoint plus apex redirect.

Use the same frontend source for both regions; no DNS changes are needed for this visual update.

## Rollback

Before rollout record the server commit, back up the current public files and Nginx config under `/opt/twiddle-official-backups/<timestamp>`. For this rollout the previous server commit was `5690d2b`.

Prefer rolling back frontend assets only; retain the new public-only root and write-only waitlist API. Restore the backed-up old public assets into a separate directory and point Nginx at that directory, then `nginx -t` and reload. Do not restore public contact-list access. Data and `.env` must never be overwritten by frontend recovery.

## Pending business configuration

Regional real stores, payment merchant accounts, SKUs, pricing, stock/preorder and shipping dates, actual filing records and responsible entity details are not invented by this rollout. Update content and `js/site-config.js` after verification.
