import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "./auth.mjs";
import { CatalogError, catalogService, maxUpload } from "./catalog.mjs";
import { catalogFiles } from "./files.mjs";

const origin = new URL(process.env.SECONDHAND_ORIGIN).origin;
const port = Number(process.env.SECONDHAND_PORT ?? 4174);
const files = catalogFiles(
  process.cwd(),
  path.resolve(process.env.SECONDHAND_PUBLISHED),
);
await files.bootstrap();
if (process.argv.includes("--bootstrap")) process.exit(0);

const credentials = JSON.parse(
  await readFile(process.env.SECONDHAND_AUTH_FILE, "utf8"),
);
const sessions = auth(credentials, origin.startsWith("https:"));
const catalog = catalogService(files);
const prefix = "/api/catalog";
const reply = (res, status, data, headers) =>
  res
    .writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    })
    .end(JSON.stringify(data));

async function body(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      throw new CatalogError(413, "上传内容太大。");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, origin).pathname;
    if (req.method === "POST" && req.headers.origin !== origin)
      throw new CatalogError(403, "请求来源无效。");

    if (pathname === `${prefix}/login` && req.method === "POST") {
      const fields = new URLSearchParams((await body(req, 4096)).toString());
      if (!(await sessions.verifyPassword(fields.get("password"))))
        throw new CatalogError(401, "密码不对。");
      return reply(res, 200, {}, { "Set-Cookie": sessions.session() });
    }

    if (!sessions.authenticated(req.headers.cookie))
      throw new CatalogError(401, "请先登录。");
    if (pathname === `${prefix}/logout` && req.method === "POST")
      return reply(res, 200, {}, { "Set-Cookie": sessions.clear() });
    if (pathname === `${prefix}/items` && req.method === "GET")
      return reply(res, 200, await catalog.list());

    const route = /^\/api\/catalog\/items(?:\/([a-z0-9][a-z0-9-]*))?$/.exec(
      pathname,
    );
    if (route && req.method === "POST") {
      const contentType = req.headers["content-type"] ?? "";
      if (!contentType.startsWith("multipart/form-data;"))
        throw new CatalogError(400, "请使用商品上传表单。");
      let form;
      const uploaded = await body(req, maxUpload + 128 * 1024);
      try {
        form = await new Response(uploaded, {
          headers: { "Content-Type": contentType },
        }).formData();
      } catch {
        throw new CatalogError(400, "上传表单无法读取。");
      }
      const photos = form
        .getAll("photos")
        .filter((file) => file instanceof File && file.size);
      const result = await catalog.save(
        route[1],
        Object.fromEntries(form),
        photos,
      );
      return reply(res, route[1] ? 200 : 201, result);
    }
    throw new CatalogError(404, "找不到这个操作。");
  } catch (error) {
    if (error instanceof CatalogError)
      return reply(res, error.status, { error: error.message });
    console.error(error);
    return reply(res, 500, { error: "发布失败，请重试。" });
  }
});

server.listen(port, "127.0.0.1", () =>
  console.log(`Catalog editor listening on 127.0.0.1:${port}`),
);
