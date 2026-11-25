import { z } from "zod";
import { PAYMENT_METHODS, type Product } from "@/lib/store";

export const ORDER_STATUSES = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmado",
  preparing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUSES;
export const statusSchema = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]);
export const orderInputSchema = z
  .object({
    key: z.string().uuid(),
    delivery: z
      .object({
        name: z.string().trim().min(2).max(150),
        street: z.string().trim().min(3).max(300),
        district: z.string().trim().min(2).max(150),
        city: z.string().trim().min(2).max(150),
        reference: z.string().trim().max(300),
        payment: z.enum(PAYMENT_METHODS),
        notes: z.string().trim().max(2000),
      })
      .strict(),
    items: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            size: z.string().max(50),
            color: z.string().max(100),
            qty: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderItem = {
  id: string;
  product_id: string | null;
  name: string;
  description: string;
  unit_price: number | null;
  quantity: number;
  size: string;
  color: string;
  image: string;
  needs_size: boolean;
  inventory_quantity: number;
  inventory_restored: boolean;
};
export type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  delivery: OrderInput["delivery"];
  payment_method: string;
  subtotal: number;
  shipping: number | null;
  total: number;
  notes: string;
  sales_order_items: OrderItem[];
};
export type Period = "today" | "7d" | "30d" | "month" | "custom";
export type DateRange = { from: string; to: string };
export const storeDate = (date: Date) =>
  new Date(date.getTime() - 3 * 3600000).toISOString().slice(0, 10);
const shiftDay = (day: string, delta: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);
export function periodRange(period: Period, now: Date, customFrom = "", customTo = ""): DateRange {
  const to = storeDate(now);
  if (
    period === "custom" &&
    /^\d{4}-\d{2}-\d{2}$/.test(customFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(customTo) &&
    customFrom <= customTo
  )
    return { from: customFrom, to: customTo };
  return {
    from:
      period === "today"
        ? to
        : period === "month"
          ? `${to.slice(0, 7)}-01`
          : shiftDay(to, period === "7d" ? -6 : -29),
    to,
  };
}
export function previousRange(range: DateRange): DateRange {
  const days = Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1;
  return { from: shiftDay(range.from, -days), to: shiftDay(range.from, -1) };
}
export const rangeBounds = (range: DateRange) => ({
  start: `${range.from}T00:00:00-03:00`,
  end: `${shiftDay(range.to, 1)}T00:00:00-03:00`,
});
export const inRange = (date: string | null, range: DateRange) =>
  !!date && storeDate(new Date(date)) >= range.from && storeDate(new Date(date)) <= range.to;
export const isSale = (o: Pick<Order, "status" | "confirmed_at">) =>
  o.confirmed_at !== null && ["confirmed", "preparing", "shipped", "delivered"].includes(o.status);
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === "cancelled") return to === "cancelled";
  if (from === "pending") return ["pending", "confirmed", "cancelled"].includes(to);
  return to !== "pending";
}
export function filterOrders(orders: Order[], range: DateRange, status = "all", search = "") {
  const q = search.trim().toLocaleLowerCase("pt-BR");
  return orders.filter(
    (o) =>
      inRange(o.created_at, range) &&
      (status === "all" || o.status === status) &&
      (!q || `${o.number} ${o.id} ${o.delivery.name}`.toLocaleLowerCase("pt-BR").includes(q)),
  );
}
export function metrics(orders: Order[], range: DateRange) {
  const placed = orders.filter((o) => inRange(o.created_at, range));
  const sales = orders.filter((o) => isSale(o) && inRange(o.confirmed_at, range));
  const revenue = Math.round(sales.reduce((sum, o) => sum + o.total, 0) * 100) / 100;
  return {
    orders: placed.length,
    pending: placed.filter((o) => o.status === "pending").length,
    sales: sales.length,
    revenue,
    ticket: sales.length ? revenue / sales.length : 0,
  };
}
export function comparison(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}
export function chartSeries(orders: Order[], range: DateRange, weekly: boolean) {
  const buckets = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let day = range.from; day <= range.to; day = shiftDay(day, weekly ? 7 : 1))
    buckets.set(day, { date: day, revenue: 0, orders: 0 });
  const key = (date: string) => {
    const day = storeDate(new Date(date));
    return weekly
      ? shiftDay(
          range.from,
          Math.floor((Date.parse(day) - Date.parse(range.from)) / (86400000 * 7)) * 7,
        )
      : day;
  };
  for (const o of orders) {
    if (inRange(o.created_at, range)) {
      const bucket = buckets.get(key(o.created_at));
      if (bucket) bucket.orders++;
    }
    if (isSale(o) && inRange(o.confirmed_at, range) && o.confirmed_at) {
      const bucket = buckets.get(key(o.confirmed_at));
      if (bucket) bucket.revenue += o.total;
    }
  }
  return [...buckets.values()].map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }));
}
export function bestSellers(orders: Order[], range: DateRange) {
  const totals = new Map<
    string,
    { name: string; image: string; quantity: number; revenue: number }
  >();
  for (const o of orders.filter((o) => isSale(o) && inRange(o.confirmed_at, range)))
    for (const item of o.sales_order_items) {
      const key = item.product_id ?? item.name;
      const value = totals.get(key) ?? {
        name: item.name,
        image: item.image,
        quantity: 0,
        revenue: 0,
      };
      value.quantity += item.quantity;
      value.revenue += (item.unit_price ?? 0) * item.quantity;
      totals.set(key, value);
    }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}
export function stockAlerts(products: Product[]) {
  return products
    .filter((p) => p.active)
    .flatMap((p) =>
      p.sizes
        .filter((s) => s.qty <= 3)
        .map((s) => ({
          productId: p.id,
          name: p.name,
          image: p.images[0],
          size: s.size,
          quantity: s.qty,
        })),
    );
}
export function inventoryDelta(
  from: OrderStatus,
  to: OrderStatus,
  deducted: number,
  restored: boolean,
  quantity: number,
): number {
  if (!canTransition(from, to)) throw new Error("INVALID_TRANSITION");
  if (from === "pending" && to === "confirmed" && deducted === 0) return -quantity;
  if (to === "cancelled" && deducted > 0 && !restored) return deducted;
  return 0;
}
export const salesError = (message: string) => {
  const map: Record<string, string> = {
    INSUFFICIENT_STOCK: "Estoque insuficiente. Confira as quantidades e os tamanhos.",
    PRODUCT_UNAVAILABLE: "Um produto não está mais disponível.",
    INVALID_COLOR: "Confira a cor escolhida.",
    INVALID_SIZE: "Confira o tamanho escolhido.",
    PRICE_REQUIRED: "Informe o preço dos itens a consultar antes de confirmar.",
    IMMUTABLE_PRICE: "O preço já registrado deve ser preservado.",
    CONFIRM_FIRST: "Confirme o pedido antes de avançar o status.",
    CANNOT_UNCONFIRM: "Um pedido confirmado só pode ser cancelado, não voltar a pendente.",
    CANCELLED_TERMINAL: "Pedidos cancelados não podem ser reabertos.",
    IDEMPOTENCY_CONFLICT: "Esta referência já pertence a outro pedido.",
    RATE_LIMIT: "Muitos pedidos enviados. Aguarde alguns minutos e tente novamente.",
  };
  return (
    Object.entries(map).find(([code]) => message.includes(code))?.[1] ??
    "Não foi possível concluir. Tente novamente com a mesma referência."
  );
};
