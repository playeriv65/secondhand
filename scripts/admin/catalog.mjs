import { randomUUID, createHash } from "node:crypto";
import { localDay } from "../../src/lib/availability.mjs";
import { validate } from "../validate.mjs";

export const maxPhotos = 8;
export const maxUpload = 32 * 1024 * 1024;

export class CatalogError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const versionOf = (item) =>
  createHash("sha256").update(JSON.stringify(item)).digest("hex");

function required(value, max, message) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new CatalogError(400, message);
  return value.trim();
}

export function catalogService({ read, publish }) {
  let publishing = false;
  return {
    async list() {
      const catalog = await read();
      return catalog.items.map((item) => ({
        ...item,
        version: versionOf(item),
      }));
    },
    async save(id, fields, photos) {
      if (publishing)
        throw new CatalogError(409, "正在发布另一件商品，请稍后重试。");
      publishing = true;
      try {
        const catalog = await read();
        const previous = id && catalog.items.find((item) => item.id === id);
        if (id && !previous)
          throw new CatalogError(404, "找不到这件商品，请刷新。");
        if (previous && fields.version !== versionOf(previous))
          throw new CatalogError(409, "这件商品已更新，请刷新后再编辑。");
        const name = required(
          fields.name,
          100,
          "请输入商品名（最多 100 字）。",
        );
        const description = required(
          fields.description,
          3000,
          "请输入描述（最多 3000 字）。",
        );
        const price = String(fields.price ?? "");
        if (!/^\d{1,8}(\.\d{1,2})?$/.test(price))
          throw new CatalogError(400, "请输入有效的美元价格，最多两位小数。");
        const availableFrom = fields.availableFrom || null;
        if (
          availableFrom &&
          (typeof availableFrom !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(availableFrom) ||
            Number.isNaN(Date.parse(availableFrom)) ||
            new Date(availableFrom).toISOString().slice(0, 10) !==
              availableFrom)
        )
          throw new CatalogError(400, "请输入有效的出售日期。");
        if (
          availableFrom &&
          availableFrom <= localDay(catalog.timeZone) &&
          availableFrom !== previous?.availableFrom
        )
          throw new CatalogError(400, "预计出售日期请选择今天之后的日期。");
        if (
          photos.length > maxPhotos ||
          photos.reduce((sum, photo) => sum + photo.size, 0) > maxUpload
        )
          throw new CatalogError(413, "最多上传 8 张照片，合计不超过 32 MB。");
        if (!photos.length && !previous?.images.length)
          throw new CatalogError(400, "请至少添加一张商品照片。");

        const itemId = previous?.id ?? randomUUID();
        const batch = randomUUID();
        const uploads = photos.map((file, index) => ({
          file,
          path: `/media/items/${itemId}/${batch}-${index + 1}.webp`,
        }));
        const item = {
          ...previous,
          id: itemId,
          name,
          description,
          price: Number(price),
          condition: previous?.condition ?? "",
          status: previous?.status ?? "available",
          negotiable: previous?.negotiable ?? false,
          availableFrom,
          images: uploads.length
            ? uploads.map((photo) => photo.path)
            : previous.images,
        };
        const items = catalog.demo ? [] : catalog.items;
        const next = {
          ...catalog,
          demo: false,
          items:
            id && !catalog.demo
              ? items.map((entry) => (entry.id === id ? item : entry))
              : [item, ...items],
        };
        validate(next);
        await publish(next, uploads);
        return {
          id: itemId,
          href:
            availableFrom && availableFrom > localDay(catalog.timeZone)
              ? "/later.html"
              : "/",
        };
      } finally {
        publishing = false;
      }
    },
  };
}
