import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, CATEGORY_KEYS, DEFAULT_SIZES, TAGS, type CategoryKey, type Product, type SizeStock } from "@/lib/store";
import { uploadPhoto } from "./upload";

export type ProductDraft = Omit<Product, "id" | "createdAt" | "sortOrder"> & { id?: string };

export const emptyDraft = (): ProductDraft => ({
  name: "",
  category: "fem",
  subcategory: CATEGORIES.fem.lines[0] ?? "",
  price: null,
  promoPrice: null,
  tags: [],
  sizes: [],
  colors: [],
  description: "",
  images: [],
  active: true,
});

const input =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base focus:border-gold focus:outline-none";

function F({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

const toNum = (v: string): number | null => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

export function ProductForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: ProductDraft;
  saving: boolean;
  onSave: (d: ProductDraft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<ProductDraft>(initial);
  const [priceText, setPriceText] = useState(initial.price?.toString().replace(".", ",") ?? "");
  const [promoText, setPromoText] = useState(initial.promoPrice?.toString().replace(".", ",") ?? "");
  const [colorsText, setColorsText] = useState(initial.colors.join(", "));
  const [uploading, setUploading] = useState(false);
  const up = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const setSize = (i: number, patch: Partial<SizeStock>) =>
    up("sizes", d.sizes.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadPhoto(f, "products"));
      setD((p) => ({ ...p, images: [...p.images, ...urls] }));
    } catch {
      toast.error("Não foi possível enviar a foto. Tente uma imagem menor.");
    } finally {
      setUploading(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...d.images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    up("images", arr);
  };

  const submit = () => {
    if (!d.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const price = toNum(priceText);
    const promo = toNum(promoText);
    if (price !== null && price < 0) {
      toast.error("Preço inválido.");
      return;
    }
    if (promo !== null && price !== null && promo >= price) {
      toast.error("O preço promocional precisa ser menor que o preço normal.");
      return;
    }
    const seen = new Set<string>();
    const sizes = d.sizes
      .map((s) => ({ size: s.size.trim(), qty: Math.max(0, Math.floor(s.qty || 0)) }))
      .filter((s) => s.size && !seen.has(s.size) && seen.add(s.size));
    onSave({
      ...d,
      name: d.name.trim(),
      price,
      promoPrice: promo,
      sizes,
      colors: colorsText.split(",").map((c) => c.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <F label="Nome do produto" wide>
          <input className={input} value={d.name} onChange={(e) => up("name", e.target.value)} />
        </F>
        <F label="Categoria">
          <select
            className={input}
            value={d.category}
            onChange={(e) => {
              const c = e.target.value as CategoryKey;
              setD((p) => ({ ...p, category: c, subcategory: CATEGORIES[c].lines[0] ?? "" }));
            }}
          >
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORIES[k].name}
              </option>
            ))}
          </select>
        </F>
        <F label="Linha">
          <select className={input} value={d.subcategory} onChange={(e) => up("subcategory", e.target.value)}>
            {CATEGORIES[d.category].lines.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </F>
        <F label="Preço (R$)" hint="Deixe vazio para mostrar “Consulte o preço”.">
          <input className={input} inputMode="decimal" placeholder="129,90" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
        </F>
        <F label="Preço promocional (R$)" hint="Opcional. Aparece riscando o preço normal.">
          <input className={input} inputMode="decimal" placeholder="99,90" value={promoText} onChange={(e) => setPromoText(e.target.value)} />
        </F>
      </section>

      <section>
        <h3 className="font-sans text-base font-semibold">Fotos</h3>
        <p className="text-xs text-muted-foreground">A primeira foto é a capa. Use as setas para mudar a ordem.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {d.images.map((src, i) => (
            <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-gold">
                  <Star className="size-3" /> Capa
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 p-1 text-ink-foreground">
                <button type="button" onClick={() => move(i, -1)} aria-label="Mover para a esquerda" className="p-1">
                  <ArrowLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => up("images", d.images.filter((_, k) => k !== i))}
                  aria-label="Remover foto"
                  className="p-1"
                >
                  <X className="size-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Mover para a direita" className="p-1">
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          ))}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-input text-center text-xs text-muted-foreground hover:border-gold">
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <span className="flex flex-col items-center gap-1">
                <ImagePlus className="size-6" /> Adicionar fotos
              </span>
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={uploading} />
          </label>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-sans text-base font-semibold">Numeração e estoque</h3>
            <p className="text-xs text-muted-foreground">
              Sem numeração cadastrada, o site mostra a numeração padrão e a cliente confirma no WhatsApp. Estoque 0 = esgotado.
            </p>
          </div>
          <Button
            type="button"
            variant="pill"
            size="sm"
            onClick={() => up("sizes", DEFAULT_SIZES[d.category].map((size) => ({ size, qty: 1 })))}
          >
            Preencher numeração padrão
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {d.sizes.map((s, i) => (
            <div key={i} className="flex items-center gap-1 rounded-xl border border-border p-1.5">
              <input
                aria-label="Número"
                className="h-9 w-14 rounded-lg border border-input bg-background px-2 text-center"
                value={s.size}
                onChange={(e) => setSize(i, { size: e.target.value })}
              />
              <input
                aria-label="Quantidade"
                type="number"
                min={0}
                className="h-9 w-16 rounded-lg border border-input bg-background px-2 text-center"
                value={s.qty}
                onChange={(e) => setSize(i, { qty: Number(e.target.value) })}
              />
              <button
                type="button"
                className="ml-auto p-1 text-muted-foreground hover:text-sale"
                onClick={() => up("sizes", d.sizes.filter((_, k) => k !== i))}
                aria-label="Remover número"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => up("sizes", [...d.sizes, { size: "", qty: 1 }])}
            className="flex h-12 items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-sm text-muted-foreground hover:border-gold"
          >
            <Plus className="size-4" /> Número
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <F label="Cores" hint="Separe por vírgula. Ex.: Preto, Branco, Nude" wide>
          <input className={input} value={colorsText} onChange={(e) => setColorsText(e.target.value)} />
        </F>
        <F label="Descrição" wide>
          <textarea
            rows={4}
            className="rounded-xl border border-input bg-background p-3 text-base focus:border-gold focus:outline-none"
            value={d.description}
            onChange={(e) => up("description", e.target.value)}
          />
        </F>
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Etiquetas e destaque na página inicial</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = d.tags.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  aria-pressed={on}
                  onClick={() => up("tags", on ? d.tags.filter((x) => x !== t) : [...d.tags, t])}
                  className={`rounded-full border px-4 py-1.5 text-sm ${on ? "border-ink bg-ink text-ink-foreground" : "border-input hover:border-ink"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
          <Switch checked={d.active} onCheckedChange={(v) => up("active", v)} />
          {d.active ? "Visível no site" : "Oculto do site"}
        </label>
      </section>

      <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-border bg-background px-6 py-4">
        <Button variant="ink" size="xl" className="flex-1" onClick={submit} disabled={saving || uploading}>
          {saving ? "Salvando…" : "Salvar produto"}
        </Button>
        <Button variant="pill" size="xl" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
