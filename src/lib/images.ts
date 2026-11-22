// Shared, browser-safe rules for product and banner photos.

export const IMAGE_BUCKET = "product-images";
/** Same-origin route that streams photos out of the private bucket. */
export const IMAGE_ROUTE = "/api/public/images/";
export type ImageFolder = "products" | "banner";
/** Photos bundled by the Lovable editor; only the Lovable hosting serves this path. */
export const LEGACY_ASSET_PREFIX = "/__l5e/assets-v1/";

const SAFE_PATH = /^(products|banner)\/[A-Za-z0-9_-]{1,100}\.(jpe?g|png|webp)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Only `products/<name>.<jpg|jpeg|png|webp>` and `banner/...` can be served — no traversal, no other folders. */
export function isSafeImagePath(path: string): boolean {
  return SAFE_PATH.test(path);
}

/** Trust the stored type only when it is an allowed image type; otherwise derive it from the extension. */
export function imageContentType(path: string, reported?: string | null): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const stored = reported?.split(";")[0]?.trim().toLowerCase();
  return stored && Object.values(CONTENT_TYPES).includes(stored) ? stored : byExtension;
}

export const imageUrlFor = (path: string) => IMAGE_ROUTE + path;

/** Bucket path for a photo uploaded through the panel, or null for any other URL. */
export function storagePathFromUrl(url: string): string | null {
  if (!url.startsWith(IMAGE_ROUTE)) return null;
  const path = url.slice(IMAGE_ROUTE.length);
  return isSafeImagePath(path) ? path : null;
}

export const isLegacyAssetUrl = (src: string | undefined | null) => !!src && src.startsWith(LEGACY_ASSET_PREFIX);
