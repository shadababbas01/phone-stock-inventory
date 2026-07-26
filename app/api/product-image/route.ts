import { lookupUpcImage } from "@/lib/upcitemdb";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { verifyOfficialImageUrl } from "@/lib/tavily-image";

async function proxyImage(remoteImageUrl: string) {
  const image = await fetch(remoteImageUrl, {
    headers: { Accept: "image/avif,image/webp,image/jpeg,image/png" },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  const suppliedType = image.headers.get("content-type") ?? "";
  const extensionType = /\.avif(?:\?|$)/i.test(remoteImageUrl) ? "image/avif"
    : /\.webp(?:\?|$)/i.test(remoteImageUrl) ? "image/webp"
      : /\.png(?:\?|$)/i.test(remoteImageUrl) ? "image/png"
        : /\.jpe?g(?:\?|$)/i.test(remoteImageUrl) ? "image/jpeg"
          : "";
  const contentType = suppliedType.startsWith("image/") ? suppliedType : extensionType;
  if (!image.ok || !contentType) return new Response("Invalid image source", { status: 502 });
  const size = Number(image.headers.get("content-length") ?? 0);
  if (size > 8_000_000) return new Response("Image too large", { status: 413 });
  return new Response(image.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const signedUrl = params.get("url") ?? "";
  const signature = params.get("sig") ?? "";
  if (signedUrl && signature) {
    const secret = getRuntimeEnv().TAVILY_API_KEY;
    if (!secret || !(await verifyOfficialImageUrl(signedUrl, signature, secret))) return new Response("Invalid image signature", { status: 403 });
    try {
      const remote = new URL(signedUrl);
      if (remote.protocol !== "https:" || remote.hostname === "localhost" || /^\d+(?:\.\d+){3}$/.test(remote.hostname)) {
        return new Response("Invalid image URL", { status: 400 });
      }
      return await proxyImage(remote.toString());
    } catch {
      return new Response("Image lookup unavailable", { status: 503 });
    }
  }

  const gtin = params.get("gtin")?.replace(/\D/g, "") ?? "";
  if (![8, 12, 13, 14].includes(gtin.length)) return new Response("Invalid GTIN", { status: 400 });
  try {
    const match = await lookupUpcImage(gtin);
    if (!match) return new Response("Image not found", { status: 404 });
    return await proxyImage(match.remoteImageUrl);
  } catch {
    return new Response("Image lookup unavailable", { status: 503 });
  }
}
