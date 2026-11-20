import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Chip, Listing, PageHero, parseSort } from "@/components/store/Listing";
import { StoreShell } from "@/components/store/StoreShell";
import { catalogQuery, useCatalog } from "@/lib/queries";
import { CATEGORIES, isCategory, sortProducts, type SortKey } from "@/lib/store";

export const Route = createFileRoute("/categoria/$cat")({
  validateSearch: (s: Record<string, unknown>): { linha?: string; ordem?: SortKey } => ({
    linha: typeof s.linha === "string" && s.linha ? s.linha : undefined,
    ordem: s.ordem ? parseSort(s.ordem) : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (!isCategory(params.cat)) throw notFound();
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: ({ params }) => {
    const name = isCategory(params.cat) ? CATEGORIES[params.cat].name : "Categoria";
    const desc = `Calçados e acessórios ${name.toLowerCase()}s da Rafaela Shoes. Escolha a numeração e peça pelo WhatsApp com entrega em casa.`;
    return {
      meta: [
        { title: `${name} | Rafaela Shoes` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} | Rafaela Shoes` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useParams();
  const { linha, ordem } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { products } = useCatalog();
  const C = CATEGORIES[cat as keyof typeof CATEGORIES];
  const inCat = products.filter((p) => p.category === cat);
  const lines = C.lines.filter((l) => inCat.some((p) => p.subcategory === l));
  const list = sortProducts(
    inCat.filter((p) => !linha || p.subcategory === linha),
    ordem ?? "destaques",
  );

  return (
    <StoreShell>
      <PageHero eyebrow="Categoria" title={C.name}>
        <p className="mt-3 max-w-lg text-muted-foreground">{C.lines.join(" · ")}</p>
      </PageHero>
      <Listing
        products={list}
        sort={ordem ?? "destaques"}
        onSort={(o) => navigate({ search: (s) => ({ ...s, ordem: o }), replace: true })}
        toolbar={
          lines.length > 1 ? (
            <>
              <Chip active={!linha} onClick={() => navigate({ search: (s) => ({ ...s, linha: undefined }) })}>
                Todos
              </Chip>
              {lines.map((l) => (
                <Chip key={l} active={linha === l} onClick={() => navigate({ search: (s) => ({ ...s, linha: l }) })}>
                  {l}
                </Chip>
              ))}
            </>
          ) : null
        }
        empty={<>Novidades em breve nesta categoria. Fale com a gente no WhatsApp para encomendar!</>}
      />
    </StoreShell>
  );
}
