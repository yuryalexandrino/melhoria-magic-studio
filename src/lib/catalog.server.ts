import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Read-only client with the public key, for shop pages rendered on the server. */
export function publicSupabase() {
  // Em hospedagens como a Vercel, SUPABASE_* pode não existir em runtime;
  // as variáveis VITE_* são embutidas no build e servem de alternativa.
  const url = (process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"]) as string;
  const key = (process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
