import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Product } from "@/lib/store";
import { discountPercent, effectivePrice, formatBRL, hasPromo, isSoldOut } from "@/lib/store";
import { ProductImage } from "./ProductImage";

export function PriceTag({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const eff = formatBRL(effectivePrice(product));
  const big = size === "lg";
  if (!eff) return <span className={big ? "text-lg text-muted-foreground" : "text-sm text-muted-foreground"}>Consulte o preço</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {hasPromo(product) && product.price !== null && (
        <s className={big ? "text-lg text-muted-foreground" : "text-sm text-muted-foreground"}>{formatBRL(product.price)}</s>
      )}
      <span className={`font-semibold ${hasPromo(product) ? "text-sale" : ""} ${big ? "text-3xl" : "text-base"}`}>{eff}</span>
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);
  const soldOut = isSoldOut(product);
  return (
    <Link
      to="/produto/$id"
      params={{ id: product.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className="aspect-[4/5]"
          imgClassName="transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {off ? <span className="rounded-full bg-sale px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">-{off}%</span> : null}
          {product.tags
            .filter((t) => t !== "Oferta" || !off)
            .map((t) => (
              <span key={t} className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-gold">
                {t}
              </span>
            ))}
        </div>
        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-ink-foreground">
            Esgotado
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="eyebrow text-muted-foreground">{product.subcategory}</span>
        <h3 className="text-xl leading-tight group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
          {product.name}
        </h3>
        <div className="mt-auto pt-1">
          <PriceTag product={product} />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-input bg-card px-6 py-12 text-center text-muted-foreground">
      {children}
    </div>
  );
}
