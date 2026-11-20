import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Listing, PageHero, parseSort } from "@/components/store/Listing";
import { StoreShell } from "@/components/store/StoreShell";
import { catalogQuery, useCatalog } from "@/lib/queries";
import { searchProducts, sortProducts, type SortKey } from "@/lib/store";

export const Route = createFileRoute("/busca")({
  validateSearch: (s: Record<string, unknown>): { q: string; ordem?: SortKey } => ({
    q: typeof s.q === "string" ? s.q : "",
    ordem: s.ordem ? parseSort(s.ordem) : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Buscar produtos | Rafaela Shoes" },
      { name: "description", content: "Encontre tênis, sandálias, chinelos e bolsas na Rafaela Shoes." },
      { property: "og:title", content: "Buscar produtos | Rafaela Shoes" },
      { property: "og:description", content: "Encontre o modelo perfeito na Rafaela Shoes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, ordem } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { products } = useCatalog();
  const list = sortProducts(searchProducts(products, q), ordem ?? "destaques");
  return (
    <StoreShell>
      <PageHero eyebrow="Resultados da busca" title={q ? `“${q}”` : "Buscar"} />
      <Listing
        products={list}
        sort={ordem ?? "destaques"}
        onSort={(o) => navigate({ search: (s) => ({ ...s, ordem: o }), replace: true })}
        empty={<>Não encontramos nada para “{q}”. Tente outra palavra ou fale com a gente no WhatsApp.</>}
      />
    </StoreShell>
  );
}
