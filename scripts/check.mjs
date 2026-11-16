import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeCatalog, validate } from "./validate.mjs";
import {
  isUpcoming,
  itemsForPage,
  localDay,
} from "../src/lib/availability.mjs";

const example = JSON.parse(
  await readFile(
    new URL("../content/site.example.json", import.meta.url),
    "utf8",
  ),
);
validate(example);
assert.deepEqual(example.items, []);

const current = {
  id: "lamp",
  name: "Lamp",
  description: "Works well.",
  price: 12,
  status: "available",
  availableFrom: null,
  images: ["/media/lamp.webp"],
};
const future = {
  ...current,
  id: "chair",
  name: "Chair",
  availableFrom: "2027-05-20",
  images: ["/media/chair-front.webp", "/media/chair-back.webp"],
};
const sold = { ...current, id: "desk", status: "sold" };
const config = { ...example, items: [sold, current, future] };
validate(config);
assert.deepEqual(normalizeCatalog({ ...config, demo: true }), example);
assert.deepEqual(normalizeCatalog({ ...config, demo: false }), config);

const before = localDay("America/Chicago", new Date("2027-05-20T04:59:59Z"));
const after = localDay("America/Chicago", new Date("2027-05-20T05:00:00Z"));
assert.equal(before, "2027-05-19");
assert.equal(after, "2027-05-20");
assert.equal(isUpcoming(future, before), true);
assert.equal(isUpcoming(future, after), false);
assert.deepEqual(itemsForPage(config.items, false, before), [current, sold]);
assert.deepEqual(itemsForPage(config.items, true, before), [future]);
assert.deepEqual(itemsForPage(config.items, false, after), [
  current,
  future,
  sold,
]);
assert.deepEqual(itemsForPage(config.items, true, after), []);

for (const change of [
  (value) => {
    value.items[0].price = -1;
  },
  (value) => {
    value.items[0].availableFrom = "2027-02-30";
  },
  (value) => {
    value.items[0].images = ["/media/../secret.png"];
  },
  (value) => {
    value.items[1].id = value.items[0].id;
  },
  (value) => {
    value.items[0].images = [];
  },
]) {
  const value = structuredClone(config);
  change(value);
  assert.throws(() => validate(value));
}
console.log("Catalog validation and listing visibility checks passed.");
