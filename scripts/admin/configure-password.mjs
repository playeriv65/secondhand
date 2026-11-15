import { readFileSync } from "node:fs";
import { passwordConfig } from "./auth.mjs";

const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
process.stdout.write(JSON.stringify(await passwordConfig(password)) + "\n");
