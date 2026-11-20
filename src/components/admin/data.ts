import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toProduct, toSettings, type StoreSettings } from "@/lib/store";
import type { ProductDraft } from "./ProductForm";

export const adminProductsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(toProduct);
  },
});

export const adminSettingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return toSettings(data);
  },
});

export const isOwnerQuery = (userId: string) =>
  queryOptions({
    queryKey: ["admin", "is-owner", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
  });

export function draftToRow(d: ProductDraft): TablesInsert<"products"> {
  return {
    name: d.name,
    category: d.category,
    subcategory: d.subcategory,
    price: d.price,
    promo_price: d.promoPrice,
    tags: d.tags,
    sizes: d.sizes,
    colors: d.colors,
    description: d.description,
    images: d.images,
    active: d.active,
  };
}

export function settingsToRow(s: StoreSettings): TablesUpdate<"store_settings"> {
  return {
    whatsapp: s.whatsapp.replace(/\D/g, ""),
    instagram: s.instagram.replace(/^@/, "").trim(),
    hero_title: s.heroTitle,
    hero_subtitle: s.heroSubtitle,
    banner_url: s.bannerUrl,
    announcement: s.announcement,
    about: s.about,
    privacy: s.privacy,
    returns: s.returns,
    delivery: s.delivery,
  };
}
