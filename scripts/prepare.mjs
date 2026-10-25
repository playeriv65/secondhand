import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { catalog, root } from "../src/lib/catalog.mjs";

const media = path.join(root, "public/media");
const images = [
  ...new Set(
    [catalog.qrImage, ...catalog.items.flatMap((item) => item.images)].filter(
      Boolean,
    ),
  ),
];
for (const image of images)
  await access(path.join(root, "assets.local", image.slice("/media/".length)));
await rm(media, { recursive: true, force: true });
await mkdir(media, { recursive: true });
for (const image of images) {
  const relative = image.slice("/media/".length);
  const target = path.join(media, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(root, "assets.local", relative), target);
}
console.log(`Prepared ${images.length} referenced media files.`);
