import { getRuntimeEnv } from "@/lib/runtime-env";

const SESSION_COOKIE = "phonestock_admin";
// Cloudflare Workers currently caps Web Crypto PBKDF2 at 100,000 iterations.
const ITERATIONS = 100_000;

function bytesFromBase64(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function base64Url(bytes: Uint8Array) {
  let raw = "";
  bytes.forEach(byte => { raw += String.fromCharCode(byte); });
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function hmac(value: string) {
  const secret = getRuntimeEnv().ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", bytesFromBase64(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export function authConfigured() {
  const e = getRuntimeEnv();
  return Boolean(e.ADMIN_PASSWORD_HASH && e.ADMIN_PASSWORD_SALT && e.ADMIN_SESSION_SECRET);
}

export async function verifyPassword(password: string) {
  const e = getRuntimeEnv();
  if (!e.ADMIN_PASSWORD_HASH || !e.ADMIN_PASSWORD_SALT) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytesFromBase64(e.ADMIN_PASSWORD_SALT), iterations: ITERATIONS, hash: "SHA-256" }, key, 256);
  const actual = new Uint8Array(bits);
  const expected = bytesFromBase64(e.ADMIN_PASSWORD_HASH);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i += 1) mismatch |= actual[i] ^ expected[i];
  return mismatch === 0;
}

export async function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + 30 * 60;
  const payload = `admin.${expires}`;
  const signature = await hmac(payload);
  if (!signature) throw new Error("Admin authentication is not configured");
  return { value: `${payload}.${signature}`, expires };
}

export async function isAdminRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`));
  const value = cookie?.slice(SESSION_COOKIE.length + 1);
  if (!value) return false;
  const [role, expiresText, signature] = value.split(".");
  const expires = Number(expiresText);
  if (role !== "admin" || !signature || !Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(`${role}.${expires}`);
  if (!expected || signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export function adminCookie(value: string, maxAge = 1800) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
