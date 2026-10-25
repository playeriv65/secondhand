export function validate(config) {
  const require = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  for (const key of [
    "title",
    "laterDescription",
    "pickup",
    "currency",
    "locale",
    "timeZone",
  ])
    require(typeof config[key] === "string" &&
      config[key].length > 0, `Invalid ${key}`);
  new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
  });
  new Intl.DateTimeFormat(config.locale, { timeZone: config.timeZone });
  require(typeof config.demo === "boolean", "demo must be a boolean");
  require(config.labels && typeof config.labels === "object", "Missing labels");
  const requiredLabels = [
    "available",
    "upcoming",
    "reserved",
    "sold",
    "empty",
    "demo",
    "photo",
    "free",
    "negotiable",
    "qrPending",
    "qrAlt",
    "datePrefix",
    "dateSuffix",
  ];
  for (const key of requiredLabels)
    require(typeof config.labels[key] === "string" &&
      config.labels[key].length > 0, `Missing label: ${key}`);
  require(typeof config.qrImage === "string", "Invalid QR image field");
  const imagePath = (value) =>
    /^\/media\/[A-Za-z0-9_/-]+\.(jpg|jpeg|png|webp)$/i.test(value) &&
    !value.includes("..") &&
    !value.includes("//");
  require(!config.qrImage ||
    imagePath(config.qrImage), "QR image must be a local /media/ image");
  require(Array.isArray(config.items), "items must be an array");
  const ids = new Set();
  for (const item of config.items) {
    require(/^[a-z0-9][a-z0-9-]*$/.test(item.id) &&
      !ids.has(item.id), `Invalid or duplicate item ID: ${item.id}`);
    ids.add(item.id);
    for (const key of ["name", "description", "condition"])
      require(typeof item[key] === "string" &&
        item[key].length > 0, `Invalid ${key}: ${item.id}`);
    require(Number.isFinite(item.price) &&
      item.price >= 0, `Invalid price: ${item.id}`);
    require(["available", "reserved", "sold"].includes(
      item.status,
    ), `Invalid status: ${item.id}`);
    require(item.availableFrom === null ||
      (/^\d{4}-\d{2}-\d{2}$/.test(item.availableFrom) &&
        !Number.isNaN(Date.parse(item.availableFrom)) &&
        new Date(item.availableFrom).toISOString().slice(0, 10) ===
          item.availableFrom), `Invalid availability date: ${item.id}`);
    require(Array.isArray(item.images) &&
      item.images.every(imagePath), `Invalid images: ${item.id}`);
    require(typeof item.negotiable ===
      "boolean", `Invalid negotiable flag: ${item.id}`);
    require(!item.color ||
      /^#[0-9a-f]{6}$/i.test(item.color), `Invalid color: ${item.id}`);
    if (!config.demo)
      require(item.images.length >
        0, `Live item needs a real photo: ${item.id}`);
  }
}
