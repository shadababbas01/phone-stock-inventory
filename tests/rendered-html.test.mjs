import assert from "node:assert/strict";
import test from "node:test";
import { pbkdf2Sync, randomBytes } from "node:crypto";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const runtime = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

test("renders development preview metadata", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    runtime,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("public inventory never exposes private cost fields", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/api/inventory"), runtime, ctx);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.inventory));
  assert.ok(body.inventory.length > 0);
  for (const item of body.inventory) {
    assert.equal("purchasePrice" in item, false);
    assert.equal("minimumSellingPrice" in item, false);
    assert.equal("supplier" in item, false);
    assert.equal("imei1" in item, false);
  }
});

test("admin inventory rejects anonymous access", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/api/admin/inventory"), runtime, ctx);
  assert.equal(response.status, 401);
});

test("valid server-side password creates an HTTP-only admin session", async () => {
  const worker = await loadWorker();
  const password = randomBytes(18).toString("base64url");
  const salt = randomBytes(16);
  const adminRuntime = {
    ...runtime,
    ADMIN_PASSWORD_SALT: salt.toString("base64"),
    ADMIN_PASSWORD_HASH: pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("base64"),
    ADMIN_SESSION_SECRET: randomBytes(32).toString("base64"),
  };
  const login = await worker.fetch(new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  }), adminRuntime, ctx);
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie") ?? "";
  assert.match(cookie, /phonestock_admin=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);

  const authenticated = await worker.fetch(new Request("http://localhost/api/admin/inventory", {
    headers: { cookie: cookie.split(";")[0] },
  }), adminRuntime, ctx);
  assert.equal(authenticated.status, 200);
  const body = await authenticated.json();
  assert.ok(body.inventory.some(item => "purchasePrice" in item));
});
