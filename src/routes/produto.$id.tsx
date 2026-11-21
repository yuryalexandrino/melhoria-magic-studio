import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronRight, Minus, Plus, RotateCcw, Share2, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PriceTag, ProductGrid } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { StoreShell } from "@/components/store/StoreShell";
import { WhatsAppIcon } from "@/components/store/icons";
import { useBag } from "@/lib/bag";
import { catalogQuery, useCatalog } from "@/lib/queries";
import {
  CATEGORIES,
  discountPercent,
  effectivePrice,
  formatBRL,
  isSoldOut,
  sizeOptions,
  stockFor,
  whatsappLink,
} from "@/lib/store";

export const Route = createFileRoute("/produto/$id")({
  loader: async ({ context, params }) => {
    const { products } = await context.queryClient.ensureQueryData(catalogQuery);
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { name: product.name, price: formatBRL(effectivePrice(product)), category: CATEGORIES[product.category].name };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} | Rafaela Shoes` : "Produto | Rafaela Shoes";
    const desc = loaderData
      ? `${loaderData.name}${loaderData.price ? ` por ${loaderData.price}` : ""}. ${loaderData.category} na Rafaela Shoes, com entrega em casa.`
      : "Produto da Rafaela Shoes.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  return <ProductView key={id} id={id} />;
}

function ProductView({ id }: { id: string }) {
  const { products, settings } = useCatalog();
  const product = products.find((p) => p.id === id)!;
  const { add, setOpen, setCheckoutOpen } = useBag();
  const [img, setImg] = useState(0);
  const [size, setSize] = useState("");
  const [color, setColor] = useState(product.colors.length === 1 ? (product.colors[0] ?? "") : "");
  const [qty, setQty] = useState(1);
  const [warn, setWarn] = useState(false);

  const options = sizeOptions(product);
  const soldOut = isSoldOut(product);
  const confirmSizes = options.some((o) => o.confirmOnWhatsApp);
  const max = size ? stockFor(product, size) : null;
  const off = discountPercent(product);
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const cat = CATEGORIES[product.category];

  const ready = () => {
    if ((options.length && !size) || (product.colors.length && !color)) {
      setWarn(true);
      toast.error(options.length && !size ? "Escolha a numeração." : "Escolha a cor.");
      return false;
    }
    return true;
  };
  const addToBag = (checkout: boolean) => {
    if (!ready()) return;
    add({ productId: product.id, size, color }, qty);
    if (checkout) setCheckoutOpen(true);
    else {
      setOpen(true);
      toast.success("Adicionado à sacola");
    }
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
    } catch {
      /* cancelled */
    }
  };
  const notifyLink = whatsappLink(
    settings.whatsapp,
    `Olá! Vi o produto ${product.name} no site da Rafaela Shoes e ele está esgotado. Pode me avisar quando chegar?`,
  );

  return (
    <StoreShell>
      <div className="container-store py-6">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Você está em">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="size-3.5" />
          <Link to="/categoria/$cat" params={{ cat: product.category }} className="hover:text-foreground">
            {cat.name}
          </Link>
          <ChevronRight className="size-3.5" />
          <Link
            to="/categoria/$cat"
            params={{ cat: product.category }}
            search={{ linha: product.subcategory }}
            className="hover:text-foreground"
          >
            {product.subcategory}
          </Link>
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-2 lg:gap-16">
          <div>
            <div className="relative">
              <ProductImage src={product.images[img]} alt={product.name} eager className="aspect-[4/5] rounded-3xl" />
              {off ? (
                <span className="absolute left-4 top-4 rounded-full bg-sale px-3 py-1 text-sm font-semibold text-destructive-foreground">
                  -{off}%
                </span>
              ) : null}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {product.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setImg(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={`size-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === img ? "border-ink" : "border-transparent"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((t) => (
                <span key={t} className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-gold">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="mt-3 text-5xl italic">{product.name}</h1>
            <div className="mt-4">
              <PriceTag product={product} size="lg" />
            </div>
            {product.description && <p className="mt-5 whitespace-pre-line text-muted-foreground">{product.description}</p>}

            {options.length > 0 && (
              <div className="mt-7">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">Numeração</span>
                  {confirmSizes && <span className="text-xs text-muted-foreground">Disponibilidade confirmada no WhatsApp</span>}
                </div>
                <div className={`mt-2.5 flex flex-wrap gap-2 rounded-2xl ${warn && !size ? "ring-2 ring-sale ring-offset-4" : ""}`}>
                  {options.map((o) => (
                    <button
                      key={o.size}
                      type="button"
                      disabled={!o.available}
                      onClick={() => {
                        setSize(o.size);
                        setQty(1);
                      }}
                      aria-pressed={size === o.size}
                      className={`grid h-12 min-w-12 place-items-center rounded-xl border px-3 font-medium transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground disabled:line-through disabled:opacity-50 ${
                        size === o.size ? "border-ink bg-ink text-ink-foreground" : "border-input bg-background hover:border-ink"
                      }`}
                    >
                      {o.size}
                    </button>
                  ))}
                </div>
                {max !== null && max > 0 && max <= 3 && (
                  <p className="mt-2 text-sm font-medium text-sale">
                    {max === 1 ? "Último par nesse número!" : `Só restam ${max} pares nesse número`}
                  </p>
                )}
              </div>
            )}

            {product.colors.length > 0 && (
              <div className="mt-6">
                <span className="font-medium">Cor</span>
                <div className={`mt-2.5 flex flex-wrap gap-2 rounded-2xl ${warn && !color ? "ring-2 ring-sale ring-offset-4" : ""}`}>
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-pressed={color === c}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        color === c ? "border-ink bg-ink text-ink-foreground" : "border-input bg-background hover:border-ink"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {soldOut ? (
              <div className="mt-8 rounded-2xl bg-muted p-5">
                <p className="font-medium">Este modelo está esgotado.</p>
                <Button asChild variant="whatsapp" size="xl" className="mt-3 w-full">
                  <a href={notifyLink} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="size-5" /> Avise-me quando chegar
                  </a>
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex items-center rounded-full border border-input">
                    <button className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center">{qty}</span>
                    <button
                      className="p-3 disabled:opacity-30"
                      onClick={() => setQty((q) => q + 1)}
                      disabled={max !== null && qty >= max}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <Button variant="whatsapp" size="xl" className="flex-1" onClick={() => addToBag(true)}>
                    <WhatsAppIcon className="size-5" /> Comprar agora
                  </Button>
                </div>
                <Button variant="pill" size="xl" onClick={() => addToBag(false)}>
                  <ShoppingBag /> Adicionar à sacola
                </Button>
              </div>
            )}

            <ul className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
              <li className="flex items-center gap-3">
                <Truck className="size-5 text-gold" />
                <span>
                  Entrega na sua casa, frete combinado no WhatsApp.{" "}
                  <Link to="/info/$page" params={{ page: "entrega" }} className="underline underline-offset-2">
                    Saiba mais
                  </Link>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <RotateCcw className="size-5 text-gold" />
                <Link to="/info/$page" params={{ page: "trocas" }} className="underline underline-offset-2">
                  Política de trocas
                </Link>
              </li>
              <li>
                <button onClick={share} className="flex items-center gap-3 hover:text-gold">
                  <Share2 className="size-5 text-gold" /> Compartilhar este produto
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="bg-blush py-16">
          <div className="container-store">
            <h2 className="mb-8 text-4xl">Você também pode gostar</h2>
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </StoreShell>
  );
}
