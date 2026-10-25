import { localDay, saleState } from "../lib/availability.mjs";

const body = document.body;
const later = body.dataset.page === "later";
const labels = JSON.parse(body.dataset.labels);
let previousDay;

function refresh() {
  const day = localDay(body.dataset.timeZone);
  if (day === previousDay) return;
  previousDay = day;
  let visible = 0;
  for (const card of document.querySelectorAll("article.item")) {
    const item = {
      status: card.dataset.status,
      availableFrom: card.dataset.availableFrom,
    };
    card.hidden =
      Boolean(item.availableFrom && item.availableFrom > day) !== later;
    if (!card.hidden) visible++;
    const state = saleState(item, day);
    card.className = `item ${state}`;
    const badge = card.querySelector("[data-badge]");
    badge.className = `badge ${state}`;
    badge.textContent = labels[state];
    if (state !== "upcoming")
      card.querySelector("[data-availability]").textContent = labels[state];
  }
  document.querySelector("#empty").hidden = visible > 0;
}

refresh();
window.addEventListener("focus", refresh);
document.addEventListener("visibilitychange", refresh);
setInterval(refresh, 60000);
