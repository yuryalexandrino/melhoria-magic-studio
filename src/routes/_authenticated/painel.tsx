import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { ProductForm, emptyDraft, type ProductDraft } from "@/components/admin/ProductForm";
import { StoreTab } from "@/components/admin/StoreTab";
import { adminProductsQuery, draftToRow, isOwnerQuery } from "@/components/admin/data";
import { Logo } from "@/components/store/Header";
import { ProductImage } from "@/components/store/ProductImage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, effectivePrice, formatBRL, isSoldOut, type Product } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel da loja | Rafaela Shoes" },
      { name: "description", content: "Gerencie os produtos e as informações da Rafaela Shoes." },
      { property: "og:title", content: "Painel da loja | Rafaela Shoes" },
      { property: "og:description", content: "Área da dona da loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PanelPage,
});

function PanelPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"produtos" | "loja">("produtos");

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-ink text-ink-foreground">
        <div className="container-store flex h-16 items-center gap-4">
          <Link to="/" aria-label="Voltar para a loja">
            <Logo />
          </Link>
          <span className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">Painel da dona</span>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="onInk" size="sm">
              <Link to="/">
                <Store className="size-4" /> Ver loja
              </Link>
            </Button>
            <button
              onClick={signOut}
              aria-label="Sair do painel"
              className="flex items-center gap-2 rounded-full border border-ink-foreground/25 px-3.5 py-2 text-sm font-medium hover:border-gold"
            >
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container-store py-8">
        <Suspense
          fallback={
            <div className="grid place-items-center py-24 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
            </div>
          }
        >
          <OwnerGate userId={user.id} tab={tab} setTab={setTab} />
        </Suspense>
      </main>
    </div>
  );
}

function OwnerGate({ userId, tab, setTab }: { userId: string; tab: "produtos" | "loja"; setTab: (t: "produtos" | "loja") => void }) {
  const { data: isOwner } = useSuspenseQuery(isOwnerQuery(userId));

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <h1 className="text-3xl">Sem permissão</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Esta conta não é a dona da loja. Entre com a conta cadastrada no primeiro acesso.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex gap-2">
        {(
          [
            ["produtos", "Produtos"],
            ["loja", "Informações da loja"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`rounded-full border px-5 py-2.5 text-sm font-medium ${
              tab === key ? "border-ink bg-ink text-ink-foreground" : "border-input bg-background hover:border-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "produtos" ? <ProductsTab /> : <StoreTab />}
    </>
  );
}

function toDraft(p: Product): ProductDraft {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    price: p.price,
    promoPrice: p.promoPrice,
    tags: p.tags,
    sizes: p.sizes,
    colors: p.colors,
    description: p.description,
    images: p.images,
    active: p.active,
  };
}

function ProductsTab() {
  const { data: products } = useSuspenseQuery(adminProductsQuery);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductDraft | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const save = useMutation({
    mutationFn: async (d: ProductDraft) => {
      const row = draftToRow(d);
      const { error } = d.id
        ? await supabase.from("products").update(row).eq("id", d.id)
        : await supabase.from("products").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto salvo. O site já foi atualizado.");
      setEditing(null);
      invalidate();
    },
    onError: () => toast.error("Não foi possível salvar o produto."),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível remover o produto."),
  });

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6">
        <h1 className="mb-6 text-3xl">{editing.id ? "Editar produto" : "Novo produto"}</h1>
        <ProductForm initial={editing} saving={save.isPending} onSave={(d) => save.mutate(d)} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">
          Produtos <span className="text-lg text-muted-foreground">({products.length})</span>
        </h1>
        <Button variant="ink" size="lg" onClick={() => setEditing(emptyDraft())}>
          <Plus className="size-4" /> Novo produto
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-4 p-4">
            <ProductImage src={p.images[0]} alt="" className="size-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORIES[p.category].name} · {p.subcategory}
                {isSoldOut(p) ? " · Esgotado" : ""}
              </p>
              <p className="text-sm font-semibold">{formatBRL(effectivePrice(p)) ?? "Consulte o preço"}</p>
            </div>
            {!p.active && (
              <span className="hidden rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:inline">
                Oculto
              </span>
            )}
            <button
              onClick={() => setEditing(toDraft(p))}
              aria-label={`Editar ${p.name}`}
              className="rounded-full border border-input p-2.5 hover:border-ink"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Remover "${p.name}" do site?`)) del.mutate(p.id);
              }}
              aria-label={`Remover ${p.name}`}
              className="rounded-full border border-input p-2.5 text-muted-foreground hover:border-sale hover:text-sale"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
