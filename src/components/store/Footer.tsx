import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { CATEGORIES, CATEGORY_KEYS, formatWhatsApp, whatsappLink, type StoreSettings } from "@/lib/store";
import { Logo } from "./Header";
import { WhatsAppIcon } from "./icons";

export function Footer({ settings }: { settings: StoreSettings }) {
  const wa = whatsappLink(settings.whatsapp, "Olá! Vim pelo site da Rafaela Shoes e gostaria de mais informações.");
  return (
    <footer className="bg-ink pb-28 pt-14 text-ink-muted">
      <div className="container-store grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="text-ink-foreground" />
          <p className="mt-3 max-w-xs text-sm">Tendências, estilo e conforto para todos os momentos. Entregamos na sua casa.</p>
        </div>
        <div>
          <h3 className="mb-3 text-xl text-ink-foreground">Atendimento</h3>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1 text-sm hover:text-gold">
            <WhatsAppIcon className="size-4" /> {formatWhatsApp(settings.whatsapp)}
          </a>
          <a
            href={`https://instagram.com/${settings.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-1 text-sm hover:text-gold"
          >
            <Instagram className="size-4" /> @{settings.instagram}
          </a>
        </div>
        <div>
          <h3 className="mb-3 text-xl text-ink-foreground">Categorias</h3>
          {CATEGORY_KEYS.map((k) => (
            <Link key={k} to="/categoria/$cat" params={{ cat: k }} className="block py-1 text-sm hover:text-gold">
              {CATEGORIES[k].name}
            </Link>
          ))}
          <Link to="/ofertas" className="block py-1 text-sm hover:text-gold">
            Ofertas
          </Link>
        </div>
        <div>
          <h3 className="mb-3 text-xl text-ink-foreground">A loja</h3>
          <Link to="/" hash="sobre" className="block py-1 text-sm hover:text-gold">
            Sobre a loja
          </Link>
          <Link to="/info/$page" params={{ page: "entrega" }} className="block py-1 text-sm hover:text-gold">
            Informações de entrega
          </Link>
          <Link to="/info/$page" params={{ page: "trocas" }} className="block py-1 text-sm hover:text-gold">
            Trocas e devoluções
          </Link>
          <Link to="/info/$page" params={{ page: "privacidade" }} className="block py-1 text-sm hover:text-gold">
            Política de privacidade
          </Link>
        </div>
      </div>
      <div className="container-store mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-ink-foreground/10 pt-6 text-xs">
        <span>© {new Date().getFullYear()} Rafaela Shoes</span>
        <Link to="/painel" className="hover:text-gold">
          Área da loja
        </Link>
      </div>
    </footer>
  );
}
