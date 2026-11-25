import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildOrderMessage, orderPhotoUrl, type BagLine, type Product } from "@/lib/store";
import { orderInputSchema, rangeBounds, salesError, statusSchema, type Order } from "./rules";

const publicResult = z.object({
  id: z.string().uuid(),
  number: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      product_id: z.string().nullable(),
      name: z.string(),
      description: z.string(),
      unit_price: z.number().nullable(),
      quantity: z.number(),
      size: z.string(),
      color: z.string(),
      image: z.string(),
      needs_size: z.boolean(),
    }),
  ),
});
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderInputSchema.parse(input))
  .handler(async ({ data }) => {
    const digest = async (text: string) =>
      [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    const { key, ...payload } = data;
    const hash = await digest(JSON.stringify(payload));
    const source = await digest(
      getRequestHeader("cf-connecting-ip") ??
        getRequestHeader("x-real-ip") ??
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown",
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("create_sales_order", {
      p_key: key,
      p_hash: hash,
      p_source: source,
      p_delivery: data.delivery,
      p_items: data.items,
    });
    if (error) return { ok: false as const, error: salesError(error.message) };
    const saved = publicResult.parse(result);
    const origin = new URL(getRequestHeader("origin") ?? getRequest().url).origin;
    const lines: BagLine[] = saved.items.map((item) => {
      const product: Product = {
        id: item.product_id ?? item.id,
        name: item.name,
        description: item.description,
        price: item.unit_price,
        promoPrice: null,
        category: "fem",
        subcategory: item.needs_size ? "Calçados" : "Acessórios",
        images: [orderPhotoUrl(item.image, origin) ?? ""],
        sizes: [],
        colors: [],
        tags: [],
        active: true,
        sortOrder: 0,
        createdAt: "",
      };
      return {
        productId: product.id,
        product,
        qty: item.quantity,
        size: item.size,
        color: item.color,
      };
    });
    return {
      ok: true as const,
      id: saved.id,
      number: saved.number,
      message: `${buildOrderMessage(lines, data.delivery, origin)}\n\nPedido #${saved.number} · Aguardando confirmação`,
    };
  });
const rangeSchema = z
  .object({ from: z.string().date(), to: z.string().date() })
  .refine(
    (r) => r.from <= r.to && Date.parse(r.to) - Date.parse(r.from) <= 2 * 366 * 86400000,
    "Período inválido (máximo de um ano por comparação).",
  );
export const getOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rangeSchema.parse(input))
  .handler(async ({ context, data }): Promise<Order[]> => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Sem permissão para acessar pedidos.");
    const { start, end } = rangeBounds(data);
    const orders: Order[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data: rows, error } = await context.supabase
        .from("sales_orders")
        .select(
          "id,number,status,created_at,updated_at,confirmed_at,cancelled_at,delivery,payment_method,subtotal,shipping,total,notes,sales_order_items(*)",
        )
        .or(
          `and(created_at.gte.${start},created_at.lt.${end}),and(confirmed_at.gte.${start},confirmed_at.lt.${end})`,
        )
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Não foi possível carregar os pedidos.");
      for (const row of rows)
        orders.push({
          ...row,
          status: statusSchema.parse(row.status),
          delivery: orderInputSchema.shape.delivery.parse(row.delivery),
        });
      if (rows.length < 500) break;
    }
    return orders;
  });
export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: statusSchema,
        shipping: z.number().min(0).max(1000000).nullable(),
        prices: z.record(z.string().uuid(), z.number().positive().max(1000000)),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("manage_sales_order", {
      p_order: data.id,
      p_status: data.status,
      ...(data.shipping === null ? {} : { p_shipping: data.shipping }),
      p_prices: data.prices,
    });
    if (error) throw new Error(salesError(error.message));
    return { ok: true };
  });
export const getOrderEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.string().uuid().parse(input))
  .handler(async ({ context, data }) => {
    const { data: events, error } = await context.supabase
      .from("sales_order_events")
      .select("id,status,created_at")
      .eq("order_id", data)
      .order("created_at");
    if (error) throw new Error("Não foi possível carregar o histórico.");
    return events;
  });
