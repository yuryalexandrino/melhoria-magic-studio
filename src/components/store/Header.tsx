import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBag } from "@/lib/bag";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/store";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[1.7rem] font-bold italic leading-none ${className}`}>
      Rafaela <span className="not-italic text-gold">Shoes</span>
    </span>
  );
}

function SearchForm({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/busca", search: { q: q.trim() } });
    onDone?.();
  };
  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
      <input
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar tênis, sandálias, bolsas…"
        aria-label="Buscar produtos"
        className="h-10 w-full rounded-full border border-ink-foreground/20 bg-ink-foreground/10 pl-10 pr-4 text-sm text-ink-foreground placeholder:text-ink-muted focus:border-gold focus:outline-none"
      />
    </form>
  );
}

export function Header({ announcement }: { announcement: string }) {
  const { items, setOpen } = useBag();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {announcement && (
        <div className="bg-gold py-1.5 text-center text-xs font-medium tracking-wide text-gold-foreground">{announcement}</div>
      )}
      <div className="bg-ink text-ink-foreground">
        <div className="container-store flex h-16 items-center gap-4">
          <button
            className="-ml-2 rounded-full p-2 hover:bg-ink-foreground/10 md:hidden"
            onClick={() => setMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" aria-label="Rafaela Shoes, página inicial">
            <Logo />
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
            {CATEGORY_KEYS.map((k) => (
              <Link
                key={k}
                to="/categoria/$cat"
                params={{ cat: k }}
                className="transition-colors hover:text-rose"
                activeProps={{ className: "text-gold" }}
              >
                {CATEGORIES[k].name}
              </Link>
            ))}
            <Link to="/ofertas" className="transition-colors hover:text-rose" activeProps={{ className: "text-gold" }}>
              Ofertas
            </Link>
          </nav>
          <div className="ml-auto hidden w-64 lg:block">
            <SearchForm />
          </div>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <button
              className="rounded-full p-2 hover:bg-ink-foreground/10 lg:hidden"
              onClick={() => setSearching((v) => !v)}
              aria-label="Buscar"
            >
              {searching ? <X className="size-5" /> : <Search className="size-5" />}
            </button>
            <button
              onClick={() => setOpen(true)}
              className="relative flex items-center gap-2 rounded-full border border-ink-foreground/25 px-3.5 py-2 text-sm font-medium hover:border-gold"
              aria-label={`Abrir sacola, ${count} ${count === 1 ? "item" : "itens"}`}
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Sacola</span>
              <span className="grid min-w-5 place-items-center rounded-full bg-gold px-1.5 text-xs font-semibold text-gold-foreground">
                {count}
              </span>
            </button>
          </div>
        </div>
        {searching && (
          <div className="container-store pb-3 lg:hidden">
            <SearchForm autoFocus onDone={() => setSearching(false)} />
          </div>
        )}
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[85%] max-w-sm border-0 bg-ink text-ink-foreground">
          <SheetHeader>
            <SheetTitle className="text-left text-ink-foreground">
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-8 flex flex-col">
            {CATEGORY_KEYS.map((k) => (
              <Link
                key={k}
                to="/categoria/$cat"
                params={{ cat: k }}
                onClick={() => setMenu(false)}
                className="border-b border-ink-foreground/10 py-4 font-display text-3xl italic hover:text-gold"
              >
                {CATEGORIES[k].name}
              </Link>
            ))}
            <Link
              to="/ofertas"
              onClick={() => setMenu(false)}
              className="border-b border-ink-foreground/10 py-4 font-display text-3xl italic hover:text-gold"
            >
              Ofertas
            </Link>
            <Link
              to="/"
              hash="sobre"
              onClick={() => setMenu(false)}
              className="py-4 text-sm font-medium text-ink-muted hover:text-gold"
            >
              Sobre a loja
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
