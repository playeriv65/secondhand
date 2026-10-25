import { readFile } from "node:fs/promises";
import path from "node:path";
import { validate } from "../../scripts/validate.mjs";
import { saleState } from "./availability.mjs";

export const root = path.resolve(process.cwd());
let source;
try {
  source = await readFile(path.join(root, "site.local.json"), "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  source = await readFile(path.join(root, "content/site.example.json"), "utf8");
}
export const catalog = JSON.parse(source);
validate(catalog);

export function priceText(item) {
  return item.price === 0
    ? catalog.labels.free
    : new Intl.NumberFormat(catalog.locale, {
        style: "currency",
        currency: catalog.currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(item.price);
}

export function availability(item, day) {
  if (saleState(item, day) !== "upcoming")
    return catalog.labels[saleState(item, day)];
  const date = new Intl.DateTimeFormat(catalog.locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${item.availableFrom}T12:00:00Z`));
  return `${catalog.labels.datePrefix} ${date} ${catalog.labels.dateSuffix}`;
}
