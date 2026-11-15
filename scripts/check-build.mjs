import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { catalog, root } from "../src/lib/catalog.mjs";
import {
  isUpcoming,
  itemsForPage,
  listedItems,
  localDay,
} from "../src/lib/availability.mjs";

const dist = path.join(root, "dist");
const day = localDay(catalog.timeZone);
const listings = listedItems(catalog.items);
const escape = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const hasHidden = (attributes) => /\bhidden(?:\s|=|$)/.test(attributes);

async function checkAssets(html) {
  assert.ok(!html.includes("/site.json"));
  assert.ok(!/name="generator"/.test(html));
  assert.ok(
    !/<script\b(?![^>]*\bsrc=)[^>]*>/.test(html),
    "Scripts must remain external for the production CSP",
  );
  for (const match of html.matchAll(
    /(?:src|href)="(\/(?:_astro|media)\/[^"?#]+)"/g,
  )) {
    await access(path.join(dist, match[1]));
  }
}

for (const [file, later] of [
  ["index.html", false],
  ["later.html", true],
]) {
  const html = await readFile(path.join(dist, file), "utf8");
  const cards = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)];
  const visible = cards.filter((match) => !hasHidden(match[1]));
  assert.equal(cards.length, listings.length);
  assert.equal(visible.length, itemsForPage(catalog.items, later, day).length);

  for (const item of listings) {
    const card = cards.find((match) =>
      match[1].includes('data-id="' + item.id + '"'),
    );
    assert.ok(card, "Listing missing from generated HTML");
    const [, attributes, body] = card;
    assert.equal(hasHidden(attributes), isUpcoming(item, day) !== later);
    assert.ok(body.includes(escape(item.name)));
    assert.ok(body.includes(escape(item.description)));
    assert.ok(body.includes('aria-haspopup="dialog"'));
    const date = /<p\b([^>]*\bdata-date(?:\s[^>]*)?)>/.exec(body);
    assert.equal(Boolean(date && !hasHidden(date[1])), isUpcoming(item, day));
    for (const photo of item.images) {
      assert.ok(attributes.includes(photo), "Gallery photo missing");
      await access(path.join(dist, photo));
    }
  }

  assert.ok(
    !/<h1\b|demo-notice|data-badge|item-meta|item-negotiable/.test(html),
  );
  assert.ok(!/id="editor-login"/.test(html));
  assert.ok(/<dialog\b[^>]*id="item-details"/.test(html));
  assert.ok(/<div\b(?=[^>]*id="catalog-editor")(?=[^>]*\bhidden\b)/.test(html));
  await checkAssets(html);
}

const admin = await readFile(path.join(dist, "admin.html"), "utf8");
assert.ok(/<form\b[^>]*id="editor-login"/.test(admin));
await checkAssets(admin);
console.log(
  "Public catalog pages and the separate administrator login passed build checks.",
);
