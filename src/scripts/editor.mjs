import { request, sessionFlag, show } from "./admin-client.mjs";

const panel = document.querySelector("#catalog-editor");
const message = document.querySelector("#editor-message");
const template = document.querySelector("#item-editor-template");
const grid = document.querySelector(".grid");
function openForm(item, card, trigger) {
  const form = template.content.firstElementChild.cloneNode(true);
  const fields = form.elements;
  const date = fields.namedItem("availableFrom");
  const timing = fields.namedItem("timing");
  const result = form.querySelector("[role=status]");
  const heading = fields.namedItem("name");
  const info = card.querySelector(".item-info");
  if (item) {
    heading.value = item.name;
    fields.namedItem("price").value = item.price;
    fields.namedItem("description").value = item.description;
    timing.value = item.availableFrom ? "later" : "now";
    date.value = item.availableFrom ?? "";
    form.querySelector(".photo-help").hidden = !item.images.length;
  } else {
    timing.value = document.body.dataset.page === "later" ? "later" : "now";
  }
  const syncDate = () => {
    date.required = timing.value === "later";
    date.disabled = !date.required;
    date.closest("label").hidden = date.disabled;
  };
  timing.addEventListener("change", syncDate);
  syncDate();
  trigger.hidden = true;
  if (info) info.hidden = true;
  card.append(form);
  heading.focus();
  form.querySelector("[data-cancel]").addEventListener("click", () => {
    form.remove();
    if (info) info.hidden = false;
    if (!item) card.remove();
    trigger.hidden = false;
    trigger.focus();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const photos = ["camera", "album"]
      .flatMap((key) => data.getAll(key))
      .filter((file) => file.size);
    if (!photos.length && !item?.images.length) {
      show(result, "请至少添加一张照片。");
      return;
    }
    if (
      photos.length > 8 ||
      photos.reduce((sum, file) => sum + file.size, 0) > 32 * 1024 * 1024
    ) {
      show(result, "最多上传 8 张照片，合计不超过 32 MB。");
      return;
    }
    for (const key of ["camera", "album", "timing"]) data.delete(key);
    for (const file of photos) data.append("photos", file);
    if (item) data.set("version", item.version);
    const controls = [...fields].filter((field) => !field.disabled);
    for (const control of controls) control.disabled = true;
    show(result, "正在发布…");
    try {
      const { href } = await request(item ? `items/${item.id}` : "items", {
        method: "POST",
        body: data,
      });
      window.location.assign(href);
    } catch (error) {
      show(result, error.message);
      for (const control of controls) control.disabled = false;
    }
  });
}

function button(label, click) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "item-edit";
  node.textContent = label;
  node.addEventListener("click", click);
  return node;
}

async function editMode() {
  const items = new Map(
    (await request("items")).map((item) => [item.id, item]),
  );
  const logout = button("退出编辑", async () => {
    try {
      await request("logout", { method: "POST" });
      localStorage.removeItem(sessionFlag);
      window.location.reload();
    } catch (error) {
      show(message, error.message);
    }
  });
  for (const card of grid.querySelectorAll("article[data-id]")) {
    const item = items.get(card.dataset.id);
    if (!item) continue;
    const trigger = button("编辑", () => openForm(item, card, trigger));
    const controls = document.createElement("div");
    controls.className = "card-editor-actions";
    controls.append(trigger);
    if (item.status !== "sold") {
      const markSold = button("标记已售出", async () => {
        if (!window.confirm("标记这件商品为已售出？")) return;
        markSold.disabled = true;
        try {
          await request("items/" + item.id + "/mark-sold", {
            method: "POST",
            body: new URLSearchParams({ version: item.version }),
          });
          window.location.reload();
        } catch (error) {
          show(message, error.message);
          markSold.disabled = false;
        }
      });
      controls.append(markSold);
    }
    card.append(controls);
  }
  const add = button("添加商品", () => {
    const card = document.createElement("section");
    card.className = "item new-item";
    grid.before(card);
    openForm(null, card, add);
  });
  panel.prepend(add, logout);
  panel.hidden = false;
}

if (localStorage.getItem(sessionFlag)) {
  editMode().catch(() => localStorage.removeItem(sessionFlag));
}
