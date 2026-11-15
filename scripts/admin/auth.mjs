import {
  createHmac,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(derive);
const lifetime = 30 * 24 * 60 * 60;
const cookieName = "__Host-secondhand";

export async function passwordConfig(password) {
  if (!password || password.length > 256)
    throw new Error("Invalid password length.");
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return {
    salt,
    hash: hash.toString("hex"),
    key: randomBytes(32).toString("hex"),
  };
}

export function auth(config, secure) {
  const hash = Buffer.from(config.hash, "hex");
  const sign = (value) =>
    createHmac("sha256", Buffer.from(config.key, "hex")).update(value).digest();
  const cookie = (value, age) =>
    `${secure ? cookieName : "secondhand"}=${value}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
  return {
    async verifyPassword(password) {
      return (
        typeof password === "string" &&
        password.length <= 256 &&
        timingSafeEqual(await scrypt(password, config.salt, 64), hash)
      );
    },
    session() {
      const value = `${Math.floor(Date.now() / 1000) + lifetime}.${randomBytes(16).toString("hex")}`;
      return cookie(`${value}.${sign(value).toString("hex")}`, lifetime);
    },
    authenticated(header = "") {
      const name = secure ? cookieName : "secondhand";
      const token = header
        .split(/;\s*/)
        .find((part) => part.startsWith(`${name}=`))
        ?.slice(name.length + 1);
      const parts = /^(\d+)\.([0-9a-f]{32})\.([0-9a-f]{64})$/.exec(token ?? "");
      return Boolean(
        parts &&
        Number(parts[1]) > Date.now() / 1000 &&
        timingSafeEqual(
          sign(`${parts[1]}.${parts[2]}`),
          Buffer.from(parts[3], "hex"),
        ),
      );
    },
    clear: () => cookie("", 0),
  };
}
