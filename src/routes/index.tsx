import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Instagram, MessageCircle, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/ProductCard";
import { ProductImage } from "@/components/store/ProductImage";
import { Section, SectionTitle } from "@/components/store/Section";
import { StoreShell } from "@/components/store/StoreShell";
import { ShoeMark } from "@/components/store/icons";
import { catalogQuery, useCatalog } from "@/lib/queries";
import { CATEGORIES, CATEGORY_KEYS, isOnSale } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rafaela Shoes | Tênis, sandálias e bolsas com entrega em casa" },
      {
        name: "description",
        content:
          "Calçados femininos, masculinos e infantis com novidades toda semana. Escolha sua numeração e peça pelo WhatsApp com entrega em casa.",
      },
      { property: "og:title", content: "Rafaela Shoes | Seu estilo começa pelos pés" },
      {
        property: "og:description",
        content: "Tênis, sandálias, chinelos e bolsas para toda a família. Peça pelo WhatsApp e receba em casa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Home,
});

const PERKS = [
  { icon: Truck, text: "Entrega na sua casa" },
  { icon: MessageCircle, text: "Atendimento pelo WhatsApp" },
  { icon: Sparkles, text: "Novidades toda semana" },
  { icon: ShoppingBag, text: "Pix, cartão ou dinheiro" },
];

function Home() {
  const { products, settings } = useCatalog();
  const withImg = products.filter((p) => p.images[0]);
  const news = products.filter((p) => p.tags.includes("Novidade"));
  const best = products.filter((p) => p.tags.includes("Mais vendido"));
  const sale = products.filter(isOnSale);
  const collage = withImg.slice(0, 3);

  return (
    <StoreShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-ink text-ink-foreground">
        <div className="container-store grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="animate-rise">
            <p className="eyebrow mb-5 text-gold">Coleção da semana</p>
            <h1 className="text-[clamp(3rem,8vw,6rem)] italic">{settings.heroTitle}</h1>
            <p className="mt-5 max-w-md text-lg text-ink-muted">{settings.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="xl">
                <Link to="/categoria/$cat" params={{ cat: "fem" }}>
                  Compre agora <ArrowRight />
                </Link>
              </Button>
              {sale.length > 0 && (
                <Button asChild variant="onInk" size="xl">
                  <Link to="/ofertas">Ver ofertas</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            {settings.bannerUrl ? (
              <ProductImage src={settings.bannerUrl} alt="Destaque da Rafaela Shoes" eager className="arch aspect-[4/5] shadow-lift" />
            ) : collage.length >= 3 ? (
              <div className="grid grid-cols-2 gap-3">
                <ProductImage src={collage[0]!.images[0]} alt={collage[0]!.name} eager className="arch row-span-2 aspect-[1/2] shadow-lift" />
                <ProductImage src={collage[1]!.images[0]} alt={collage[1]!.name} eager className="aspect-square rounded-3xl" />
                <ProductImage src={collage[2]!.images[0]} alt={collage[2]!.name} eager className="aspect-square rounded-[999px_999px_1.5rem_999px]" />
              </div>
            ) : (
              <div className="arch grid aspect-[4/5] place-items-center bg-blush">
                <ShoeMark className="w-2/3 text-ink" />
              </div>
            )}
          </div>
        </div>
        {/* Perks marquee */}
        <div className="overflow-hidden border-t border-ink-foreground/10 py-3.5">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...PERKS, ...PERKS, ...PERKS, ...PERKS].map((p, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm text-ink-muted">
                <p.icon className="size-4 text-gold" /> {p.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section>
        <SectionTitle eyebrow="Para toda a família" title="Compre por categoria" />
        <div className="grid gap-4 sm:grid-cols-3">
          {CATEGORY_KEYS.map((k) => {
            const list = products.filter((p) => p.category === k);
            const cover = list.find((p) => p.images[0]);
            return (
              <Link
                key={k}
                to="/categoria/$cat"
                params={{ cat: k }}
                className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-3xl bg-blush sm:aspect-[3/4]"
              >
                {cover ? (
                  <img
                    src={cover.images[0]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <ShoeMark className="absolute -right-6 top-10 w-3/4 text-rose" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <div className="relative w-full p-6 text-ink-foreground">
                  <h3 className="text-4xl italic">{CATEGORIES[k].name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                    {list.length ? `${list.length} ${list.length === 1 ? "modelo" : "modelos"}` : "Novidades em breve"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section tone="blush">
        <SectionTitle
          eyebrow="Acabou de chegar"
          title="Novidades da semana"
          action={{ label: "Ver tudo", to: "/categoria/$cat", params: { cat: "fem" } }}
        />
        <ProductGrid products={(news.length ? news : products).slice(0, 8)} />
      </Section>

      {best.length > 0 && (
        <Section>
          <SectionTitle eyebrow="As queridinhas" title="Mais vendidos" />
          <ProductGrid products={best.slice(0, 8)} />
        </Section>
      )}

      {sale.length > 0 && (
        <Section tone="blush">
          <SectionTitle eyebrow="Preço especial" title="Ofertas" action={{ label: "Todas as ofertas", to: "/ofertas" }} />
          <ProductGrid products={sale.slice(0, 4)} />
        </Section>
      )}

      {/* How to buy */}
      <Section>
        <SectionTitle eyebrow="Simples assim" title="Como comprar" />
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ["Escolha", "Encontre o modelo, escolha a numeração e coloque na sacola."],
            ["Envie pelo WhatsApp", "Preencha o endereço de entrega e mande o pedido com um toque."],
            ["Receba em casa", "Combinamos o frete e o pagamento, e levamos até você."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-3xl border border-border bg-card p-7">
              <span className="font-display text-5xl italic text-gold">0{i + 1}</span>
              <h3 className="mt-3 text-2xl">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* About */}
      <section id="sobre" className="scroll-mt-28 bg-ink py-20 text-ink-foreground">
        <div className="container-store grid gap-8 md:grid-cols-[0.35fr_0.65fr]">
          <p className="eyebrow text-gold">Sobre a loja</p>
          <p className="font-display text-[clamp(1.6rem,3vw,2.4rem)] italic leading-snug">{settings.about}</p>
        </div>
      </section>

      {/* Instagram */}
      <Section tone="blush">
        <SectionTitle eyebrow="Siga a gente" title={`@${settings.instagram}`} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {withImg.slice(0, 6).map((p) => (
            <a
              key={p.id}
              href={`https://instagram.com/${settings.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-2xl"
              aria-label="Abrir Instagram da loja"
            >
              <img src={p.images[0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <span className="absolute inset-0 grid place-items-center bg-ink/0 text-ink-foreground opacity-0 transition group-hover:bg-ink/40 group-hover:opacity-100">
                <Instagram className="size-6" />
              </span>
            </a>
          ))}
        </div>
        <Button asChild variant="ink" size="xl" className="mt-8">
          <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer">
            <Instagram /> Seguir no Instagram
          </a>
        </Button>
      </Section>
    </StoreShell>
  );
}
