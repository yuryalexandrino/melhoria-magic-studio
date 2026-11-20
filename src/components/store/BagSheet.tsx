import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBag } from "@/lib/bag";
import { bagLines, bagTotals, effectivePrice, formatBRL, needsSize, stockFor, type Product } from "@/lib/store";
import { ProductImage } from "./ProductImage";

export function BagSheet({ products }: { products: Product[] }) {
  const { items, open, setOpen, setQty, remove, setCheckoutOpen } = useBag();
  const lines = bagLines(items, products);
  const { total, unpriced, count } = bagTotals(lines);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="font-display text-3xl">Sua sacola</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <ShoppingBag className="size-10 text-rose" />
              <p>Sua sacola está vazia.</p>
              <Button variant="pill" onClick={() => setOpen(false)}>
                Continuar comprando
              </Button>
            </div>
          ) : (
            lines.map((l) => {
              const idx = items.findIndex(
                (i) => i.productId === l.productId && i.size === l.size && i.color === l.color,
              );
              const max = l.size ? stockFor(l.product, l.size) : null;
              return (
                <div key={`${l.productId}-${l.size}-${l.color}`} className="flex gap-4 border-b border-border py-4">
                  <ProductImage src={l.product.images[0]} alt="" className="size-20 shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium leading-tight">{l.product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {needsSize(l.product) ? `Nº ${l.size || "a confirmar"}` : "Tamanho único"}
                      {l.color ? ` · ${l.color}` : ""}
                    </span>
                    <span className="text-sm font-semibold">{formatBRL(effectivePrice(l.product)) ?? "Consulte o preço"}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center rounded-full border border-input">
                        <button className="p-1.5" onClick={() => setQty(idx, l.qty - 1)} aria-label="Diminuir quantidade">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm">{l.qty}</span>
                        <button
                          className="p-1.5 disabled:opacity-30"
                          onClick={() => setQty(idx, l.qty + 1)}
                          disabled={max !== null && l.qty >= max}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        className="ml-auto p-1.5 text-muted-foreground hover:text-sale"
                        onClick={() => remove(idx)}
                        aria-label="Remover da sacola"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {lines.length > 0 && (
          <div className="space-y-2 border-t border-border bg-muted px-6 py-5">
            <div className="flex justify-between text-sm">
              <span>
                {count} {count === 1 ? "item" : "itens"}
              </span>
              <span>Frete combinado no WhatsApp</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-semibold">{formatBRL(total)}</span>
            </div>
            {unpriced > 0 && (
              <p className="text-xs text-muted-foreground">Itens sem preço têm o valor confirmado no WhatsApp.</p>
            )}
            <Button
              variant="whatsapp"
              size="xl"
              className="w-full"
              onClick={() => {
                setOpen(false);
                setCheckoutOpen(true);
              }}
            >
              Finalizar pedido
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
