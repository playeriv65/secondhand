import { openAsBlob } from "node:fs";
import { parseArgs } from "node:util";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    origin: { type: "string" },
    name: { type: "string" },
    price: { type: "string" },
    description: { type: "string" },
    date: { type: "string" },
    photo: { type: "string", multiple: true },
    "password-stdin": { type: "boolean" },
    help: { type: "boolean" },
  },
});

async function password() {
  if (!values["password-stdin"] && process.stdin.isTTY) {
    process.stderr.write("Password: ");
    process.stdin.setRawMode(true);
    let input = "";
    try {
      for await (const chunk of process.stdin
        .setEncoding("utf8")
        .iterator({ destroyOnReturn: false })) {
        for (const char of chunk) {
          if (char === "\u0003") throw new Error("Canceled.");
          if (char === "\r" || char === "\n") return input;
          if (char === "\u007f" || char === "\b") input = input.slice(0, -1);
          else input += char;
        }
      }
    } finally {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write("\n");
    }
    return input;
  }
  if (!values["password-stdin"])
    throw new Error("Use --password-stdin for non-interactive input.");
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks)
    .toString()
    .replace(/\r?\n$/, "");
}

async function main() {
  const [action, id, ...extra] = positionals;
  if (values.help || !action) {
    console.log(
      [
        "node scripts/admin/cli.mjs list --origin https://your-site",
        "node scripts/admin/cli.mjs add --origin https://your-site --name NAME --price USD --description TEXT [--date YYYY-MM-DD] --photo PATH",
        "node scripts/admin/cli.mjs edit ID --origin https://your-site [--name NAME] [--price USD] [--description TEXT] [--date YYYY-MM-DD|now] [--photo PATH]",
      ].join("\n"),
    );
    return;
  }
  if (
    !["list", "add", "edit"].includes(action) ||
    Boolean(id) !== (action === "edit") ||
    extra.length
  )
    throw new Error("Use list, add, or edit ID. See --help.");

  const origin = new URL(values.origin ?? process.env.SECONDHAND_ORIGIN).origin;
  let cookie = "";
  async function call(route, method, body) {
    const res = await fetch(`${origin}/api/catalog/${route}`, {
      method,
      body,
      redirect: "error",
      headers: { Origin: origin, Cookie: cookie },
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(result.error ?? `Request failed: HTTP ${res.status}`);
    if (route === "login") cookie = res.headers.get("set-cookie").split(";")[0];
    return result;
  }

  await call(
    "login",
    "POST",
    new URLSearchParams({ password: await password() }),
  );
  const items = action === "add" ? [] : await call("items", "GET");
  if (action === "list") return console.log(JSON.stringify(items, null, 2));

  const item = id && items.find((entry) => entry.id === id);
  if (id && !item) throw new Error("Item not found.");
  const data = new FormData();
  for (const field of ["name", "price", "description"])
    data.set(field, values[field] ?? item?.[field] ?? "");
  data.set(
    "availableFrom",
    values.date === "now" ? "" : (values.date ?? item?.availableFrom ?? ""),
  );
  if (item) data.set("version", item.version);
  for (const photo of values.photo ?? [])
    data.append("photos", await openAsBlob(photo), "photo");
  const result = await call(item ? `items/${item.id}` : "items", "POST", data);
  console.log(`${result.id} ${origin}${result.href}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
