import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { catalog, root } from "../src/lib/catalog.mjs";
import { localDay, itemsForPage } from "../src/lib/availability.mjs";

const day = localDay(catalog.timeZone);
for (const [file, later] of [
  ["index.html", false],
  ["later.html", true],
]) {
  const html = await readFile(path.join(root, "dist", file), "utf8");
  const cards = [...html.matchAll(/<article\b([^>]*)>/g)];
  assert.equal(cards.length, catalog.items.length);
  const visible = cards.filter((match) => !/\bhidden(?:\s|=|$)/.test(match[1]));
  assert.equal(visible.length, itemsForPage(catalog.items, later, day).length);
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  for (const item of catalog.items) {
    assert.ok(
      html.includes(escape(item.name)),
      "Item name missing from generated HTML",
    );
    assert.ok(
      html.includes(escape(item.description)),
      "Description missing from generated HTML",
    );
  }
  assert.ok(!/<(?:button|dialog|h1)\b/.test(html));
  assert.ok(!html.includes("/site.json"));
  assert.ok(!/name="generator"/.test(html));
  assert.ok(
    !/<script\b(?![^>]*\bsrc=)[^>]*>/.test(html),
    "Scripts must remain external for the production CSP",
  );
  for (const match of html.matchAll(
    /(?:src|href)="(\/(?:_astro|media|illustrations)\/[^"?#]+)"/g,
  ))
    await access(path.join(root, "dist", match[1]));
}
console.log(
  "Both pages contain complete static cards, correct initial partitions, valid assets and no detail controls.",
);
