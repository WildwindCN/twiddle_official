// Explicit public allowlist: never deploy repository roots or customer data.
import { cp, mkdir, rm, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "dist");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of ["index.html", "_headers", "404.html"])
  await cp(path.join(root, file), path.join(out, file));
for (const directory of ["css", "js", "fonts", "favicon"])
  await cp(path.join(root, directory), path.join(out, directory), {
    recursive: true,
  });
await mkdir(path.join(out, "images"));
for (const file of [
  "logo_v2_trans_black.webp",
  "logo_v2_trans_white.webp",
  "logo_v2_trans_black.png",
  "seed_new.webp",
  "seed_ui.webp",
  "seed_ui.png",
  "turnaround-poster.jpg",
  "logo_v2_trans_white.png",
  "seed_new.png",
  "turnaround.webm",
  "turnaround.mp4",
  "wechat-channel-qr.jpeg",
])
  await cp(path.join(root, "images", file), path.join(out, "images", file));
console.log("Built public-only dist:", (await readdir(out)).join(", "));
