import { localDay, itemsForPage, saleState } from "/availability.js";
const $ = (selector) => document.querySelector(selector);
let config;
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const today = () => localDay(config.timeZone);
const itemState = (item) => saleState(item, today());
const isLaterPage = document.body.dataset.page === "later";
const dateText = (value) =>
  new Intl.DateTimeFormat(config.locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
const availability = (item) =>
  itemState(item) === "upcoming"
    ? `${config.labels.datePrefix} ${dateText(item.availableFrom)} ${config.labels.dateSuffix}`
    : config.labels[itemState(item)];
const priceText = (item) =>
  item.price === 0
    ? config.labels.free
    : new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(item.price);

function illustration(item) {
  const shapes = {
    lamp: '<path d="M112 176h90l-9-12h-70z" fill="#727a64"/><path d="m152 162 12-76-51-39" fill="none" stroke="#6d775e" stroke-width="9" stroke-linecap="round"/><path d="m104 35 31 28-52 28-3-31z" fill="#8e9b78"/><ellipse cx="104" cy="75" rx="28" ry="7" transform="rotate(-28 104 75)" fill="#faf1cc"/><circle cx="163" cy="85" r="8" fill="#4f5c46"/>',
    coffee:
      '<rect x="101" y="35" width="104" height="140" rx="12" fill="#5a6257"/><rect x="98" y="42" width="110" height="30" rx="6" fill="#747e6c"/><rect x="112" y="86" width="80" height="73" rx="4" fill="#383d36"/><path d="M123 102h52l7 50h-65z" fill="#c3b89c"/><path d="M179 112h9q17 0 12 21l-17 7" fill="none" stroke="#c3b89c" stroke-width="7"/><rect x="110" y="163" width="87" height="7" rx="3" fill="#8e9581"/><circle cx="189" cy="57" r="4" fill="#d5dfae"/>',
    chair:
      '<path d="M145 126v44m0 0-44 17m44-17 43 17m-43-17v24" stroke="#686956" stroke-width="7" stroke-linecap="round"/><path d="M106 45q42-20 83 0l-8 62h-68z" fill="#8c977a"/><path d="M101 110h90l11 17q-48 14-109 0z" fill="#6f7e5c"/><path d="m105 112-10-24m94 24 11-24" stroke="#687459" stroke-width="6" stroke-linecap="round"/>',
    mugs: '<path d="M74 91h65v64q-30 20-60-1z" fill="#b4b697"/><path d="M138 101q35-4 26 27-7 14-25 10" fill="none" stroke="#b4b697" stroke-width="9"/><ellipse cx="106" cy="91" rx="32" ry="9" fill="#e8e1c6"/><ellipse cx="106" cy="92" rx="25" ry="6" fill="#8a8468"/><path d="M162 63h65v64q-30 20-60-1z" fill="#e4d3ac"/><path d="M225 73q35-4 26 27-7 14-25 10" fill="none" stroke="#e4d3ac" stroke-width="9"/><ellipse cx="194" cy="63" rx="32" ry="9" fill="#f6edd7"/><ellipse cx="194" cy="64" rx="25" ry="6" fill="#a79578"/>',
    books:
      '<path d="M77 146h152v24H77z" fill="#9b7868"/><path d="M85 150h144v16H85z" fill="#e8e2cf"/><path d="m91 120 135-6 1 26-135 6z" fill="#9aab89"/><path d="m99 125 126-5 1 15-126 6z" fill="#f6f0dd"/><path d="m86 94 125-9 2 25-125 9z" fill="#b5a16c"/><path d="m94 98 117-8 1 15-117 9z" fill="#e9e4d3"/><path d="m126 66 86-7 2 21-86 7z" fill="#6f7f68"/>',
    storage:
      '<path d="m83 88 119-18 35 30-117 21z" fill="#b3b9a3"/><path d="m83 88 37 33v61l-37-35z" fill="#8a967b"/><path d="m120 121 117-21v60l-117 22z" fill="#a4ae95"/><path d="m163 130 32-6v10l-32 6z" fill="#737e67"/>',
  };
  const wrapper = el("div");
  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" aria-hidden="true"><ellipse cx="160" cy="189" rx="90" ry="9" fill="#4c584a" opacity=".08"/>${shapes[item.illustration] || shapes.storage}</svg>`;
  return wrapper.firstElementChild;
}

function makePrice(item) {
  return el("span", "price", priceText(item));
}
function makeCard(item) {
  const status = itemState(item);
  const card = el("article", `item ${status}`);
  card.setAttribute(
    "aria-label",
    `${item.name}，${priceText(item)}，${availability(item)}`,
  );
  const photo = el("div", "item-photo");
  photo.style.backgroundColor = item.color || "#e7e8de";
  if (item.images.length) {
    const img = el("img");
    img.src = item.images[0];
    img.alt = item.name;
    img.loading = "lazy";
    photo.append(img);
  } else {
    photo.append(
      illustration(item),
      el(
        "span",
        "photo-label",
        config.demo ? "ILLUSTRATION / 示例插画" : config.labels.photo,
      ),
    );
  }
  photo.append(
    el(
      "span",
      `badge ${status}`,
      status === "upcoming" ? config.labels.upcoming : config.labels[status],
    ),
  );
  const info = el("div", "item-info");
  const meta = el("div", "item-meta");
  meta.append(el("span", "", item.condition));
  const title = el("div", "item-title-row");
  title.append(el("h3", "", item.name), makePrice(item));
  const bottom = el("div", "item-bottom");
  bottom.append(el("span", "", availability(item)));
  info.append(meta, title, el("p", "item-desc", item.description), bottom);
  if (item.negotiable)
    info.append(el("p", "item-negotiable", config.labels.negotiable));
  card.append(photo, info);
  if (item.images.length > 1) {
    const photos = el("div", "extra-photos");
    for (const source of item.images.slice(1)) {
      const image = el("img");
      image.src = source;
      image.alt = item.name;
      image.loading = "lazy";
      photos.append(image);
    }
    card.append(photos);
  }
  return card;
}

function render() {
  const items = itemsForPage(config.items, isLaterPage, today());
  $("#items").replaceChildren(...items.map(makeCard));
  $("#empty").hidden = items.length > 0;
}

async function init() {
  const response = await fetch("/site.json");
  if (!response.ok)
    throw new Error(`Catalog request failed: ${response.status}`);
  config = await response.json();
  document.title = isLaterPage
    ? `${config.title} · 毕业后预计出`
    : config.title;
  document
    .querySelector(`[data-page-link="${isLaterPage ? "later" : "now"}"]`)
    .setAttribute("aria-current", "page");
  $("#later-note").hidden = !isLaterPage;
  $("#later-note").textContent = config.laterDescription;
  $("#description").textContent = config.description;
  $("#pickup").textContent = config.pickup;
  $("#demo-notice").hidden = !config.demo;
  $("#demo-notice").textContent = config.labels.demo;
  $("#empty").textContent = config.labels.empty;
  if (config.qrImage) {
    const img = el("img");
    img.src = config.qrImage;
    img.alt = config.labels.qrAlt;
    img.width = 180;
    img.height = 180;
    $("#intro-qr").append(img);
  } else {
    const placeholder = el("div", "qr-placeholder");
    placeholder.append(
      el("span", "", "⌘"),
      document.createTextNode(config.labels.qrPending),
    );
    $("#intro-qr").append(placeholder);
  }
  window.addEventListener("focus", render);
  render();
}
init().catch((error) => {
  console.error(error);
  $("#items").textContent = "商品清单暂时无法加载，请刷新重试。";
});
