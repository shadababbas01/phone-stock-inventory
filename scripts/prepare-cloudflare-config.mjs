import { readFile, writeFile } from "node:fs/promises";

const databaseId = process.env.D1_DATABASE_ID?.trim();
if (!databaseId) throw new Error("D1_DATABASE_ID is required");

const sourcePath = new URL("../dist/server/wrangler.json", import.meta.url);
const targetPath = new URL("../wrangler.deploy.json", import.meta.url);
const config = JSON.parse(await readFile(sourcePath, "utf8"));

config.name = "phone-stock-inventory";
config.main = "dist/server/index.js";
config.assets = { directory: "dist/client" };
delete config.build;
config.d1_databases = [{
  binding: "DB",
  database_name: "phone-stock-inventory",
  database_id: databaseId,
  migrations_dir: "drizzle",
}];

await writeFile(targetPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared Cloudflare deployment configuration for database ${databaseId.slice(0, 8)}…`);
