import { createServerFn } from "@tanstack/react-start";
import { publicSupabase } from "./catalog.server";
import { DEFAULT_SETTINGS, toProduct, toSettings, type Product, type StoreSettings } from "./store";

export const getCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ products: Product[]; settings: StoreSettings }> => {
    const sb = publicSupabase();
    const [products, settings] = await Promise.all([
      sb.from("products").select("*").eq("active", true).order("sort_order").order("created_at", { ascending: false }),
      sb.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (products.error) throw new Error(products.error.message);
    return {
      products: (products.data ?? []).map(toProduct),
      settings: settings.data ? toSettings(settings.data) : DEFAULT_SETTINGS,
    };
  },
);
