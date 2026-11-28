import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { ChartContainer } from "@/components/ui/chart";
import { ProductImage } from "@/components/store/ProductImage";
import { Button } from "@/components/ui/button";
import { getOrders, updateOrder } from "@/lib/orders/orders.functions";
import {
  ORDER_STATUSES,
  bestSellers,
  canTransition,
  chartSeries,
  comparison,
  filterOrders,
  metrics,
  periodRange,
  previousRange,
  stockAlerts,
  type Order,
  type OrderStatus,
  type Period,
} from "@/lib/orders/rules";
import { formatBRL } from "@/lib/store";
import { adminProductsQuery } from "./data";

const PERIODS: [Period, string][] = [
  ["today", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
  ["month", "Este mês"],
  ["custom", "Personalizado"],
];
const money = (v: number) => formatBRL(v) ?? "R$ 0,00";

export function SalesTab() {
  const [period, setPeriod] = useState<Period>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const range = useMemo(() => periodRange(period, new Date(), from, to), [period, from, to]);
  const prev = previousRange(range);
  const fetchOrders = useServerFn(getOrders);
  const { data: all, isLoading, error } = useQuery({
    queryKey: ["admin", "orders", prev.from, range.to],
    queryFn: () => fetchOrders({ data: { from: prev.from, to: range.to } }),
  });
  const { data: products } = useSuspenseQuery(adminProductsQuery);

  const orders = all ?? [];
  const m = metrics(orders, range);
  const pm = metrics(orders, prev);
  const days = (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;
  const series = chartSeries(orders, range, days > 45);
  const top = bestSellers(orders, range).slice(0, 5);
  const alerts = stockAlerts(products);
  const list = filterOrders(orders, range, status, search);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-4xl">Dashboard</h1>
        {PERIODS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            aria-pressed={period === k}
            className={`rounded-full border px-4 py-2 text-sm ${period === k ? "border-ink bg-ink text-ink-foreground" : "border-input bg-background hover:border-ink"}`}
          >
            {label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex gap-2">
            <input type="date" aria-label="Data inicial" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-2" />
            <input type="date" aria-label="Data final" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-2" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p className="rounded-2xl border border-sale p-4 text-sale">{error.message}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Faturamento" value={money(m.revenue)} delta={comparison(m.revenue, pm.revenue)} />
            <Kpi label="Vendas confirmadas" value={String(m.sales)} delta={comparison(m.sales, pm.sales)} />
            <Kpi label="Ticket médio" value={money(m.ticket)} delta={comparison(m.ticket, pm.ticket)} />
            <Kpi label="Pedidos recebidos" value={String(m.orders)} delta={comparison(m.orders, pm.orders)} />
            <Kpi label="Aguardando" value={String(m.pending)} delta={null} />
          </div>

          <section className="rounded-3xl border border-border bg-card p-4">
            <h2 className="mb-3 text-2xl">Faturamento {days > 45 ? "por semana" : "por dia"}</h2>
            <ChartContainer config={{ revenue: { label: "Faturamento", color: "var(--gold)" } }} className="h-64 w-full">
              <BarChart data={series}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(8, 10) + "/" + v.slice(5, 7)} />
                <YAxis width={60} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
              </BarChart>
            </ChartContainer>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card p-4">
              <h2 className="mb-3 text-2xl">Mais vendidos</h2>
              {top.length ? (
                <ul className="space-y-2">
                  {top.map((t) => (
                    <li key={t.name} className="flex items-center gap-3">
                      <ProductImage src={t.image} alt="" className="size-10 rounded-lg" />
                      <span className="flex-1 truncate">{t.name}</span>
                      <span className="text-sm text-muted-foreground">{t.quantity} un · {money(t.revenue)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Nenhuma venda confirmada no período.</p>}
            </section>
            <section className="rounded-3xl border border-border bg-card p-4">
              <h2 className="mb-3 text-2xl">Estoque baixo</h2>
              {alerts.length ? (
                <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                  {alerts.map((a) => (
                    <li key={a.productId + a.size} className="flex justify-between gap-2">
                      <span className="truncate">{a.name} · nº {a.size}</span>
                      <span className={a.quantity === 0 ? "text-sale" : "text-muted-foreground"}>{a.quantity === 0 ? "Esgotado" : `${a.quantity} un`}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Nenhum alerta.</p>}
            </section>
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-2xl">Pedidos ({list.length})</h2>
              <input placeholder="Buscar nº ou cliente" aria-label="Buscar pedidos" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3" />
              <select aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-2">
                <option value="all">Todos</option>
                {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <ul className="space-y-3">
              {list.map((o) => <OrderRow key={o.id} order={o} />)}
              {!list.length && <p className="text-sm text-muted-foreground">Nenhum pedido no período.</p>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {delta !== null && (
        <p className={`text-xs ${delta >= 0 ? "text-gold" : "text-sale"}`}>{delta >= 0 ? "+" : ""}{delta.toFixed(0)}% vs. período anterior</p>
      )}
    </div>
  );
}

function OrderRow({ order: o }: { order: Order }) {
  const qc = useQueryClient();
  const save = useServerFn(updateOrder);
  const [next, setNext] = useState<OrderStatus>(o.status);
  const [shipping, setShipping] = useState(o.shipping === null ? "" : String(o.shipping));
  const [prices, setPrices] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: o.id,
          status: next,
          shipping: shipping.trim() === "" ? null : Number(shipping.replace(",", ".")),
          prices: Object.fromEntries(
            Object.entries(prices).filter(([, v]) => v.trim()).map(([k, v]) => [k, Number(v.replace(",", "."))]),
          ),
        },
      }),
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."),
  });
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <strong>#{o.number}</strong>
        <span>{o.delivery.name}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{ORDER_STATUSES[o.status]}</span>
        <span className="ml-auto text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {o.delivery.street}, {o.delivery.district} – {o.delivery.city} · {o.payment_method}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {o.sales_order_items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-2">
            <span>{i.quantity}× {i.name}{i.size ? ` nº ${i.size}` : ""}{i.color ? ` · ${i.color}` : ""}</span>
            {i.unit_price === null ? (
              <input aria-label={`Preço de ${i.name}`} placeholder="Preço" inputMode="decimal" value={prices[i.id] ?? ""} onChange={(e) => setPrices((p) => ({ ...p, [i.id]: e.target.value }))} className="h-8 w-24 rounded-lg border border-input bg-background px-2" />
            ) : <span className="text-muted-foreground">{money(i.unit_price)}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Total {money(o.total)}</span>
        <input aria-label="Frete" placeholder="Frete" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} className="h-9 w-24 rounded-lg border border-input bg-background px-2 text-sm" />
        <select aria-label="Novo status" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
          {(Object.keys(ORDER_STATUSES) as OrderStatus[]).filter((s) => canTransition(o.status, s)).map((s) => (
            <option key={s} value={s}>{ORDER_STATUSES[s]}</option>
          ))}
        </select>
        <Button size="sm" variant="ink" disabled={m.isPending} onClick={() => {
          if (next === "cancelled" && o.status !== "cancelled" && !window.confirm("Cancelar este pedido? O estoque será devolvido.")) return;
          m.mutate();
        }}>
          {m.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
        </Button>
      </div>
    </li>
  );
}
