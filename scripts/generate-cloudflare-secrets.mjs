import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error("ADMIN_PASSWORD is required");

const salt = randomBytes(16);
const passwordHash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");

process.stdout.write(JSON.stringify({
  ADMIN_PASSWORD_HASH: passwordHash.toString("base64"),
  ADMIN_PASSWORD_SALT: salt.toString("base64"),
  ADMIN_SESSION_SECRET: randomBytes(32).toString("base64"),
}));
