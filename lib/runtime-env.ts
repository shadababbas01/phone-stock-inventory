export type PhoneStockRuntimeEnv = {
  DB?: D1Database;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_PASSWORD_SALT?: string;
  ADMIN_SESSION_SECRET?: string;
  MOBILE_API_KEY?: string;
  ICECAT_SHOPNAME?: string;
};

declare global {
  // Set by the Worker entry at the start of every request.
  var __PHONE_STOCK_ENV__: PhoneStockRuntimeEnv | undefined;
}

export function getRuntimeEnv() {
  return globalThis.__PHONE_STOCK_ENV__ ?? {};
}
