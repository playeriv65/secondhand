import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { normalizeCatalog } from "../validate.mjs";
import { CatalogError } from "./catalog.mjs";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const astroManifest = require.resolve("astro/package.json");
const astroBin = path.resolve(
  path.dirname(astroManifest),
  require(astroManifest).bin.astro,
);

const maxInputPixels = 50_000_000;

function encodePhoto(source, options = {}) {
  return sharp(source, { limitInputPixels: maxInputPixels, ...options })
    .autoOrient()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}

async function convertHeic(source, pages, primary) {
  let pixels = 0;
  for (let page = 0; page < pages; page++) {
    const { width, height } = await sharp(source, { page }).metadata();
    pixels += width * height;
    if (pixels > maxInputPixels)
      throw new Error("HEIC image dimensions are too large.");
  }

  const directory = await mkdtemp(path.join(tmpdir(), "secondhand-heic-"));
  try {
    const input = path.join(directory, "source.heic");
    const output = path.join(directory, "image.png");
    await writeFile(input, source, { mode: 0o600 });
    await run(
      "heif-convert",
      ["--quiet", "--png-compression-level", "1", input, output],
      {
        timeout: 20_000,
        killSignal: "SIGKILL",
        maxBuffer: 64 * 1024,
      },
    );
    // Libheif applies the container orientation and numbers multi-image results from 1.
    return await encodePhoto(
      pages === 1
        ? output
        : path.join(directory, "image-" + (primary + 1) + ".png"),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function processPhoto(file) {
  const source = Buffer.from(await file.arrayBuffer());
  const {
    format,
    compression,
    pages = 1,
    pagePrimary = 0,
  } = await sharp(source, {
    limitInputPixels: maxInputPixels,
  }).metadata();
  if (!["jpeg", "png", "webp", "heif"].includes(format))
    throw new Error("Unsupported photo format.");
  try {
    return await encodePhoto(source, { page: pagePrimary });
  } catch (error) {
    if (format !== "heif" || compression !== "hevc" || pages > 8) throw error;
    return convertHeic(source, pages, pagePrimary);
  }
}

export function catalogFiles(project, published) {
  const current = path.join(published, "current");
  const releases = path.join(published, "releases");
  const catalogFile = path.join(project, "site.local.json");
  const assets = path.join(project, "assets.local");
  const currentRelease = async () => path.dirname(await realpath(current));
  const read = async () =>
    JSON.parse(
      await readFile(path.join(await currentRelease(), "catalog.json"), "utf8"),
    );

  async function build(catalog) {
    await mkdir(releases, { recursive: true });
    const release = path.join(releases, `${Date.now()}-${randomUUID()}`);
    const link = path.join(published, `.current-${randomUUID()}`);
    await mkdir(release);
    try {
      await writeFile(catalogFile, JSON.stringify(catalog), { mode: 0o600 });
      await run(process.execPath, ["scripts/prepare.mjs"], { cwd: project });
      await run(process.execPath, [astroBin, "build"], {
        cwd: project,
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
      });
      await run(process.execPath, ["scripts/check-build.mjs"], {
        cwd: project,
      });
      await writeFile(
        path.join(release, "catalog.json"),
        JSON.stringify(catalog, null, 2),
        { mode: 0o600 },
      );
      await rename(path.join(project, "dist"), path.join(release, "www"));
      await symlink(
        path.join("releases", path.basename(release), "www"),
        link,
        "dir",
      );
      await rename(link, current);
    } catch (error) {
      await rm(link, { force: true });
      await rm(release, { recursive: true, force: true });
      throw error;
    }
    // Keep the two most recent older releases for rollback.
    try {
      const older = (await readdir(releases))
        .filter(
          (name) =>
            /^\d{13}-[0-9a-f-]{36}$/.test(name) &&
            name !== path.basename(release),
        )
        .sort()
        .reverse()
        .slice(2);
      for (const name of older)
        await rm(path.join(releases, name), { recursive: true, force: true });
    } catch (error) {
      console.error("Could not prune older catalog releases:", error.message);
    }
  }

  return {
    read,
    async bootstrap() {
      try {
        await read();
        return;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await build(
        normalizeCatalog(JSON.parse(await readFile(catalogFile, "utf8"))),
      );
    },
    async rebuild() {
      await this.publish(normalizeCatalog(await read()), []);
    },
    async publish(catalog, uploads) {
      const liveMedia = path.join(await currentRelease(), "www", "media");
      await rm(assets, { recursive: true, force: true });
      try {
        await cp(liveMedia, assets, { recursive: true });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      for (const upload of uploads) {
        const target = path.join(assets, upload.path.slice("/media/".length));
        let image;
        try {
          image = await processPhoto(upload.file);
        } catch {
          throw new CatalogError(
            400,
            "照片无法读取，请用 JPEG、PNG、WebP 或 HEIC 重试。",
          );
        }
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, image);
      }
      await build(catalog);
    },
  };
}
