import type { ReactNode } from "react";
import type { Product, SortKey } from "@/lib/store";
import { EmptyState, ProductGrid } from "./ProductCard";

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "destaques", label: "Destaques" },
  { value: "novidades", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
];

export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <section className="bg-blush">
      <div className="container-store py-12 sm:py-16">
        {eyebrow && <p className="eyebrow mb-3 text-gold">{eyebrow}</p>}
        <h1 className="text-5xl italic sm:text-6xl">{title}</h1>
        {children}
      </div>
    </section>
  );
}

export function Listing({
  products,
  sort,
  onSort,
  toolbar,
  empty,
}: {
  products: Product[];
  sort: SortKey;
  onSort: (s: SortKey) => void;
  toolbar?: ReactNode;
  empty: ReactNode;
}) {
  return (
    <div className="container-store py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-2">{toolbar}</div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Ordenar
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="h-9 rounded-full border border-input bg-background px-3 text-sm text-foreground"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {products.length} {products.length === 1 ? "produto" : "produtos"}
      </p>
      {products.length ? <ProductGrid products={products} /> : <EmptyState>{empty}</EmptyState>}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active ? "border-ink bg-ink text-ink-foreground" : "border-input bg-background hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

export const parseSort = (v: unknown): SortKey =>
  SORTS.some((s) => s.value === v) ? (v as SortKey) : "destaques";
