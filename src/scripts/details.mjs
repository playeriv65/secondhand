const dialog = document.querySelector("#item-details");
const grid = document.querySelector(".grid");
const photo = dialog.querySelector("img");
const controls = dialog.querySelector(".detail-controls");
const count = dialog.querySelector(".detail-count");
const name = dialog.querySelector("#detail-name");
const description = dialog.querySelector(".item-desc");
const price = dialog.querySelector(".price");
const sold = dialog.querySelector(".item-sold");
const date = dialog.querySelector(".item-date");
const close = dialog.querySelector(".detail-close");
let images = [];
let index = 0;
let opener;
let touchStart;

function showPhoto(offset) {
  index = (index + offset + images.length) % images.length;
  photo.src = images[index];
  photo.alt = name.textContent;
  count.textContent = `${index + 1} / ${images.length}`;
}

grid.addEventListener("click", (event) => {
  const card = event.target.closest("article[data-images]");
  const trigger = card?.querySelector(".item-open");
  if (!trigger || trigger.closest("[hidden]")) return;
  if (
    event.target.closest("button, a, form") &&
    !trigger.contains(event.target)
  )
    return;

  opener = trigger;
  images = JSON.parse(card.dataset.images);
  index = 0;
  name.textContent = trigger.textContent.trim();
  description.textContent = card.querySelector(".item-desc").textContent;
  price.textContent = card.querySelector(".price").textContent;
  sold.textContent = card.querySelector(".item-sold")?.textContent ?? "";
  sold.hidden = !sold.textContent;
  const cardDate = card.querySelector("[data-date]");
  date.hidden = !cardDate || cardDate.hidden;
  date.textContent = date.hidden ? "" : cardDate.textContent;
  controls.hidden = images.length < 2;
  showPhoto(0);
  dialog.showModal();
  close.focus();
});

close.addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => opener?.focus());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog
  .querySelector("[data-previous]")
  .addEventListener("click", () => showPhoto(-1));
dialog
  .querySelector("[data-next]")
  .addEventListener("click", () => showPhoto(1));
dialog.addEventListener("keydown", (event) => {
  if (images.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key))
    return;
  event.preventDefault();
  showPhoto(event.key === "ArrowLeft" ? -1 : 1);
});
photo.addEventListener(
  "touchstart",
  (event) => {
    touchStart = event.touches.length === 1 ? event.touches[0] : undefined;
  },
  { passive: true },
);
photo.addEventListener(
  "touchend",
  (event) => {
    if (!touchStart || images.length < 2 || event.touches.length) return;
    const touch = event.changedTouches[0];
    const x = touch.clientX - touchStart.clientX;
    const y = touch.clientY - touchStart.clientY;
    touchStart = undefined;
    if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y))
      showPhoto(x < 0 ? 1 : -1);
  },
  { passive: true },
);
