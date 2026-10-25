import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validate } from "./validate.mjs";
import { localDay, itemsForPage, saleState } from "../public/availability.js";
const config = JSON.parse(
  await readFile(
    new URL("../content/site.example.json", import.meta.url),
    "utf8",
  ),
);
validate(config);
const before = localDay("America/Chicago", new Date("2027-05-20T04:59:59Z"));
const after = localDay("America/Chicago", new Date("2027-05-20T05:00:00Z"));
assert.equal(before, "2027-05-19");
assert.equal(after, "2027-05-20");
const future = config.items.find((item) => item.availableFrom);
assert.equal(itemsForPage([future], true, before).length, 1);
assert.equal(itemsForPage([future], false, before).length, 0);
assert.equal(itemsForPage([future], false, after).length, 1);
assert.equal(itemsForPage([future], true, after).length, 0);
assert.equal(saleState(future, before), "upcoming");
assert.equal(saleState(future, after), "available");
assert.equal(saleState({ ...future, status: "reserved" }, after), "reserved");
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
    value.demo = false;
  },
]) {
  const value = structuredClone(config);
  change(value);
  assert.throws(() => validate(value));
}
console.log(
  "Catalog validation passed, including invalid dates, prices, paths, duplicate IDs and missing live photos.",
);
