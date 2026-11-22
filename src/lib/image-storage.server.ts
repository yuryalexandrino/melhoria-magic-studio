import { IMAGE_BUCKET } from "./images";
import type { ImageDownload } from "./image-response";

/**
 * Picks how the server reads the private photo bucket:
 * 1. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only secret) — bypasses storage policies.
 * 2. Otherwise the publishable key — works only if a read policy for `anon` exists on the bucket.
 * Returns null when neither is configured.
 */
export async function storageDownloader(): Promise<ImageDownload | null> {
  const url = process.env["SUPABASE_URL"];
  if (url && process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return (path) => supabaseAdmin.storage.from(IMAGE_BUCKET).download(path);
  }
  const publicUrl = url ?? import.meta.env["VITE_SUPABASE_URL"];
  const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!publicUrl || !publicKey) return null;
  const { publicSupabase } = await import("./catalog.server");
  const sb = publicSupabase();
  return (path) => sb.storage.from(IMAGE_BUCKET).download(path);
}
