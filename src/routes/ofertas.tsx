import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Listing, PageHero, parseSort } from "@/components/store/Listing";
import { StoreShell } from "@/components/store/StoreShell";
import { catalogQuery, useCatalog } from "@/lib/queries";
import { isOnSale, sortProducts, type SortKey } from "@/lib/store";

export const Route = createFileRoute("/ofertas")({
  validateSearch: (s: Record<string, unknown>): { ordem?: SortKey } => ({
    ordem: s.ordem ? parseSort(s.ordem) : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Ofertas | Rafaela Shoes" },
      { name: "description", content: "Tênis, sandálias e bolsas com preço especial na Rafaela Shoes. Peça pelo WhatsApp." },
      { property: "og:title", content: "Ofertas | Rafaela Shoes" },
      { property: "og:description", content: "Calçados com preço especial. Peça pelo WhatsApp e receba em casa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Offers,
});

function Offers() {
  const { ordem } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { products } = useCatalog();
  const list = sortProducts(products.filter(isOnSale), ordem ?? "destaques");
  return (
    <StoreShell>
      <PageHero eyebrow="Preço especial" title="Ofertas" />
      <Listing
        products={list}
        sort={ordem ?? "destaques"}
        onSort={(o) => navigate({ search: { ordem: o }, replace: true })}
        empty={<>Nenhuma oferta no momento. Volte em breve!</>}
      />
    </StoreShell>
  );
}
