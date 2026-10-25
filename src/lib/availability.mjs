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

export function itemsForPage(items, later, day) {
  return items.filter(
    (item) => Boolean(item.availableFrom && item.availableFrom > day) === later,
  );
}

export function saleState(item, day) {
  if (item.status !== "available") return item.status;
  return item.availableFrom && item.availableFrom > day
    ? "upcoming"
    : "available";
}
