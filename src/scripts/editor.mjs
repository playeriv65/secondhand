const panel = document.querySelector("#catalog-editor");
const toggle = document.querySelector("#editor-toggle");
const login = document.querySelector("#editor-login");
const message = document.querySelector("#editor-message");
const template = document.querySelector("#item-editor-template");
const grid = document.querySelector(".grid");
const sessionFlag = "secondhand-editor";

function show(status, text) {
  status.textContent = text;
  status.hidden = !text;
}

async function request(path, options) {
  const res = await fetch(`/api/catalog/${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error ??
        (res.status === 429
          ? "尝试次数过多，请稍后再试。"
          : "操作失败，请稍后再试。"),
    );
  }
  return data;
}

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
  login.hidden = true;
  show(message, "");
  toggle.textContent = "退出编辑";
  toggle.onclick = async () => {
    try {
      await request("logout", { method: "POST" });
      localStorage.removeItem(sessionFlag);
      window.location.reload();
    } catch (error) {
      show(message, error.message);
    }
  };
  for (const card of grid.querySelectorAll("article[data-id]")) {
    const item = items.get(card.dataset.id);
    if (!item) continue;
    const trigger = button("编辑", () => openForm(item, card, trigger));
    card.append(trigger);
  }
  const add = button("添加商品", () => {
    const card = document.createElement("section");
    card.className = "item new-item";
    add.after(card);
    openForm(null, card, add);
  });
  grid.before(add);
}

panel.hidden = false;
toggle.onclick = () => {
  login.hidden = !login.hidden;
  if (!login.hidden) login.elements.namedItem("password").focus();
};
login.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = login.querySelector("button");
  submit.disabled = true;
  try {
    await request("login", {
      method: "POST",
      body: new URLSearchParams(new FormData(login)),
    });
    login.reset();
    localStorage.setItem(sessionFlag, "1");
    await editMode();
    document
      .querySelector(".grid")
      .previousElementSibling.scrollIntoView({ block: "nearest" });
  } catch (error) {
    show(message, error.message);
  } finally {
    submit.disabled = false;
  }
});
if (localStorage.getItem(sessionFlag)) {
  editMode().catch(() => localStorage.removeItem(sessionFlag));
}
