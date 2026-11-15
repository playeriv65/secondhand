import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { CatalogError } from "./catalog.mjs";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const astroManifest = require.resolve("astro/package.json");
const astroBin = path.resolve(
  path.dirname(astroManifest),
  require(astroManifest).bin.astro,
);

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
      await build(JSON.parse(await readFile(catalogFile, "utf8")));
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
          const input = sharp(Buffer.from(await upload.file.arrayBuffer()), {
            limitInputPixels: 50_000_000,
          });
          const { format } = await input.metadata();
          if (!["jpeg", "png", "webp", "heif"].includes(format))
            throw new Error("Unsupported photo format.");
          image = await input
            .autoOrient()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 82 })
            .toBuffer();
        } catch {
          throw new CatalogError(
            400,
            "照片无法读取，请用 JPEG、PNG 或 WebP 重试。",
          );
        }
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, image);
      }
      await build(catalog);
    },
  };
}
