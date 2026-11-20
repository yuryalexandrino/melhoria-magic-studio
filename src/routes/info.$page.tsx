import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageHero } from "@/components/store/Listing";
import { StoreShell } from "@/components/store/StoreShell";
import { catalogQuery, useCatalog } from "@/lib/queries";
import type { StoreSettings } from "@/lib/store";

const PAGES: Record<string, { title: string; key: keyof StoreSettings; desc: string }> = {
  entrega: { title: "Informações de entrega", key: "delivery", desc: "Como funciona a entrega dos pedidos da Rafaela Shoes." },
  trocas: { title: "Trocas e devoluções", key: "returns", desc: "Política de trocas e devoluções da Rafaela Shoes." },
  privacidade: { title: "Política de privacidade", key: "privacy", desc: "Como a Rafaela Shoes cuida dos seus dados." },
};

export const Route = createFileRoute("/info/$page")({
  beforeLoad: ({ params }) => {
    if (!PAGES[params.page]) throw notFound();
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: ({ params }) => {
    const p = PAGES[params.page];
    const title = `${p?.title ?? "Informações"} | Rafaela Shoes`;
    return {
      meta: [
        { title },
        { name: "description", content: p?.desc ?? "" },
        { property: "og:title", content: title },
        { property: "og:description", content: p?.desc ?? "" },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: InfoPage,
});

function InfoPage() {
  const { page } = Route.useParams();
  const { settings } = useCatalog();
  const p = PAGES[page];
  return (
    <StoreShell>
      <PageHero eyebrow="A loja" title={p.title} />
      <div className="container-store max-w-3xl py-12">
        <p className="whitespace-pre-line text-lg leading-relaxed">{String(settings[p.key]) || "Em breve."}</p>
      </div>
    </StoreShell>
  );
}
