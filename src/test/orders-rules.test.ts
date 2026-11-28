import { describe, expect, it } from "vitest";
import { canTransition, filterOrders, inventoryDelta, metrics, periodRange, stockAlerts, type Order } from "@/lib/orders/rules";

const order = (p: Partial<Order>): Order => ({
  id: "1", number: 1, status: "pending", created_at: "2026-11-10T15:00:00Z", updated_at: "", confirmed_at: null, cancelled_at: null,
  delivery: { name: "Ana", street: "Rua A 1", district: "Centro", city: "JP", reference: "", payment: "Pix", notes: "" },
  payment_method: "Pix", subtotal: 100, shipping: null, total: 100, notes: "", sales_order_items: [], ...p,
} as Order);
const range = { from: "2026-11-01", to: "2026-11-30" };

describe("regras de vendas", () => {
  it("só pedidos confirmados contam como faturamento", () => {
    const m = metrics([
      order({ status: "pending" }),
      order({ id: "2", status: "confirmed", confirmed_at: "2026-11-11T12:00:00Z", total: 150 }),
      order({ id: "3", status: "cancelled", confirmed_at: "2026-11-11T12:00:00Z", total: 999 }),
    ], range);
    expect(m).toMatchObject({ orders: 3, pending: 1, sales: 1, revenue: 150, ticket: 150 });
  });
  it("usa o dia da loja (UTC-3)", () => {
    expect(periodRange("today", new Date("2026-11-28T02:40:00Z")).to).toBe("2026-11-27");
  });
  it("filtra por status e busca", () => {
    const list = [order({}), order({ id: "2", number: 2, status: "confirmed", delivery: { ...order({}).delivery, name: "Bia" } })];
    expect(filterOrders(list, range, "confirmed").map((o) => o.number)).toEqual([2]);
    expect(filterOrders(list, range, "all", "bia").map((o) => o.number)).toEqual([2]);
  });
  it("transições de status", () => {
    expect(canTransition("pending", "shipped")).toBe(false);
    expect(canTransition("confirmed", "pending")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });
  it("estoque baixa uma vez e devolve uma vez", () => {
    expect(inventoryDelta("pending", "confirmed", 0, false, 2)).toBe(-2);
    expect(inventoryDelta("confirmed", "shipped", 2, false, 2)).toBe(0);
    expect(inventoryDelta("shipped", "cancelled", 2, false, 2)).toBe(2);
    expect(inventoryDelta("cancelled", "cancelled", 2, true, 2)).toBe(0);
  });
  it("alerta de estoque com 3 ou menos", () => {
    const a = stockAlerts([{ id: "p", name: "X", active: true, images: [], sizes: [{ size: "36", qty: 3 }, { size: "37", qty: 4 }] } as never]);
    expect(a.map((x) => x.size)).toEqual(["36"]);
  });
});
