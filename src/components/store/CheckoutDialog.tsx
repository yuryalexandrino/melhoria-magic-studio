import { Check, Copy, Truck } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBag } from "@/lib/bag";
import {
  EMPTY_DELIVERY,
  PAYMENT_METHODS,
  bagLines,
  bagTotals,
  buildOrderMessage,
  deliveryErrors,
  formatBRL,
  whatsappLink,
  validateBagStock,
  type DeliveryInfo,
  type Product,
} from "@/lib/store";
import { WhatsAppIcon } from "./icons";

const ADDRESS_KEY = "rs_delivery_v1";

function Field({
  label,
  error,
  ...props
}: { label: string; error?: string | undefined } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        {...props}
        className="h-11 rounded-xl border border-input bg-background px-3 text-base font-normal focus:border-gold focus:outline-none"
      />
      {error && <span className="text-xs font-normal text-sale">{error}</span>}
    </label>
  );
}

export function CheckoutDialog({ products, whatsapp }: { products: Product[]; whatsapp: string }) {
  const { items, checkoutOpen, setCheckoutOpen, clear } = useBag();
  const [d, setD] = useState<DeliveryInfo>(EMPTY_DELIVERY);
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<{ message: string; url: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDRESS_KEY);
      if (raw) setD({ ...EMPTY_DELIVERY, ...JSON.parse(raw), notes: "" });
    } catch {
      /* ignore */
    }
  }, []);

  const lines = bagLines(items, products);
  const stockIssues = validateBagStock(lines);
  const { total } = bagTotals(lines);
  const errors = deliveryErrors(d);
  const valid = Object.keys(errors).length === 0;
  const message = buildOrderMessage(lines, d);
  const url = whatsappLink(whatsapp, message);
  const set = (k: keyof DeliveryInfo) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((p) => ({ ...p, [k]: e.target.value }));

  const onOpenChange = (v: boolean) => {
    setCheckoutOpen(v);
    if (!v) {
      setSent(null);
      setTried(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada. Cole no WhatsApp da loja.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Dialog open={checkoutOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground">
              <Check className="size-7" />
            </div>
            <DialogTitle className="font-display text-3xl">Pedido enviado!</DialogTitle>
            <DialogDescription>
              Finalize a conversa no WhatsApp. Se ele não abriu, use os botões abaixo.
            </DialogDescription>
            <Button asChild variant="whatsapp" size="xl" className="w-full">
              <a href={sent.url} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-5" /> Abrir WhatsApp de novo
              </a>
            </Button>
            <Button variant="pill" className="w-full" onClick={() => copy(sent.message)}>
              <Copy /> Copiar mensagem
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-3xl">Dados para entrega</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Truck className="size-4 text-gold" /> Entregamos no seu endereço. O frete é combinado no WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Field label="Seu nome" value={d.name} onChange={set("name")} autoComplete="name" error={tried ? errors.name : undefined} />
              <Field
                label="Rua e número"
                value={d.street}
                onChange={set("street")}
                autoComplete="street-address"
                error={tried ? errors.street : undefined}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro" value={d.district} onChange={set("district")} error={tried ? errors.district : undefined} />
                <Field
                  label="Cidade"
                  value={d.city}
                  onChange={set("city")}
                  autoComplete="address-level2"
                  error={tried ? errors.city : undefined}
                />
              </div>
              <Field label="Complemento ou ponto de referência (opcional)" value={d.reference} onChange={set("reference")} />
              <fieldset className="flex flex-col gap-1.5 text-sm font-medium">
                <legend className="mb-1.5">Forma de pagamento</legend>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setD((p) => ({ ...p, payment: m }))}
                      aria-pressed={d.payment === m}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        d.payment === m ? "border-ink bg-ink text-ink-foreground" : "border-input bg-background hover:border-ink"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Observações (opcional)
                <textarea
                  value={d.notes}
                  onChange={set("notes")}
                  rows={2}
                  className="rounded-xl border border-input bg-background p-3 text-base font-normal focus:border-gold focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">
                {lines.length} {lines.length === 1 ? "produto" : "produtos"} + frete
              </span>
              <span className="text-xl font-semibold">{formatBRL(total)}</span>
            </div>
            <Button asChild variant="whatsapp" size="xl" className="w-full">
              <a
                href={valid && lines.length ? url : "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (stockIssues.length) {
                    e.preventDefault();
                    toast.error(stockIssues[0]);
                    return;
                  }
                  if (!valid || !lines.length) {
                    e.preventDefault();
                    setTried(true);
                    toast.error("Preencha os dados de entrega.");
                    return;
                  }
                  try {
                    const { notes: _n, ...keep } = d;
                    localStorage.setItem(ADDRESS_KEY, JSON.stringify(keep));
                  } catch {
                    /* ignore */
                  }
                  setSent({ message, url });
                  clear();
                }}
              >
                <WhatsAppIcon className="size-5" /> Enviar pedido pelo WhatsApp
              </a>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
