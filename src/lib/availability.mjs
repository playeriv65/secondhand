export function localDay(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function listedItems(items) {
  return items.filter((item) => item.status !== "sold");
}

export function isUpcoming(item, day) {
  return Boolean(item.availableFrom && item.availableFrom > day);
}

export function itemsForPage(items, later, day) {
  return listedItems(items).filter((item) => isUpcoming(item, day) === later);
}
