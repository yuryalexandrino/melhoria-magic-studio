import { imageContentType, isSafeImagePath } from "./images";

export type StorageError = { message: string; status?: number | undefined; statusCode?: string | undefined };
export type ImageDownload = (path: string) => Promise<{ data: Blob | null; error: StorageError | null }>;

const IMMUTABLE = "public, max-age=31536000, immutable";

function text(body: string, status: number, cache: string) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": cache, "x-content-type-options": "nosniff" },
  });
}

function isNotFound(e: StorageError) {
  return e.status === 404 || e.statusCode === "404" || /not.?found/i.test(e.message);
}

/**
 * Builds the HTTP response for a stored photo. `download` is null when the server
 * has no storage credentials configured.
 */
export async function imageResponse(path: string, download: ImageDownload | null, method = "GET"): Promise<Response> {
  if (!isSafeImagePath(path)) return text("Not found", 404, "public, max-age=60");
  if (!download) {
    console.error("[images] Storage is not configured on the server (missing SUPABASE_URL or key).");
    return text("Image service unavailable", 503, "no-store");
  }
  let result: Awaited<ReturnType<ImageDownload>>;
  try {
    result = await download(path);
  } catch (err) {
    console.error("[images] Download failed:", err instanceof Error ? err.message : "unknown error");
    return text("Image temporarily unavailable", 502, "no-store");
  }
  const { data, error } = result;
  if (error || !data) {
    if (!error || isNotFound(error)) return text("Not found", 404, "public, max-age=60");
    console.error("[images] Storage error:", error.message);
    return text("Image temporarily unavailable", 502, "no-store");
  }
  return new Response(method === "HEAD" ? null : data, {
    status: 200,
    headers: {
      "content-type": imageContentType(path, data.type),
      "content-length": String(data.size),
      "cache-control": IMMUTABLE,
      "x-content-type-options": "nosniff",
    },
  });
}
