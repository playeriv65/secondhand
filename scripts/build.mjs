import { readFile, writeFile, mkdir, cp, access, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let contentPath = path.join(root, "site.local.json");
try {
  await access(contentPath);
} catch {
  contentPath = path.join(root, "content/site.example.json");
}
const config = JSON.parse(await readFile(contentPath, "utf8"));
validate(config);
for (const image of [
  config.qrImage,
  ...config.items.flatMap((item) => item.images),
].filter(Boolean)) {
  await access(path.join(root, "assets.local", image.slice("/media/".length)));
}
const dist = path.join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, "public"), dist, { recursive: true });
const index = await readFile(path.join(dist, "index.html"), "utf8");
await writeFile(
  path.join(dist, "later.html"),
  index.replace('data-page="now"', 'data-page="later"'),
);
let assetsExist = false;
try {
  await access(path.join(root, "assets.local"));
  assetsExist = true;
} catch {}
if (assetsExist)
  await cp(path.join(root, "assets.local"), path.join(dist, "media"), {
    recursive: true,
  });
await writeFile(path.join(dist, "site.json"), JSON.stringify(config));
console.log(
  `Built ${config.items.length} items (${config.demo ? "demo" : "live"}) into dist/`,
);
