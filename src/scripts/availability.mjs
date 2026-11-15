import { localDay, isUpcoming } from "../lib/availability.mjs";

const body = document.body;
const cards = [...document.querySelectorAll("article.item")];
const empty = document.querySelector("#empty");
const laterNote = document.querySelector(".later-note");
const links = [...document.querySelectorAll(".pages a[data-view]")];
let previousDay;

function refresh(force = false) {
  const day = localDay(body.dataset.timeZone);
  if (!force && day === previousDay) return;
  previousDay = day;
  const later = body.dataset.page === "later";
  let visible = 0;
  for (const card of cards) {
    const upcoming = isUpcoming(card.dataset, day);
    card.hidden = upcoming !== later;
    if (!card.hidden) visible++;
    const date = card.querySelector("[data-date]");
    if (date) date.hidden = !upcoming;
  }
  empty.hidden = visible > 0;
}

function select(view) {
  body.dataset.page = view;
  const later = view === "later";
  laterNote.hidden = !later;
  for (const link of links) {
    if (link.dataset.view === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  document.title = later
    ? `${body.dataset.title} · 毕业后预计出`
    : body.dataset.title;
  refresh(true);
}

for (const link of links) {
  link.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (link.dataset.view === body.dataset.page) return;
    history.pushState(null, "", link.href);
    select(link.dataset.view);
  });
}

window.addEventListener("popstate", () => {
  select(location.pathname === "/later.html" ? "later" : "now");
});
refresh();
window.addEventListener("focus", () => refresh());
document.addEventListener("visibilitychange", () => refresh());
setInterval(refresh, 60000);
