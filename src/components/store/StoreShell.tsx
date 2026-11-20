import type { ReactNode } from "react";
import { useCatalog } from "@/lib/queries";
import { whatsappLink } from "@/lib/store";
import { BagSheet } from "./BagSheet";
import { CheckoutDialog } from "./CheckoutDialog";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { WhatsAppIcon } from "./icons";

export function StoreShell({ children }: { children: ReactNode }) {
  const { products, settings } = useCatalog();
  return (
    <div className="flex min-h-screen flex-col">
      <Header announcement={settings.announcement} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <a
        href={whatsappLink(settings.whatsapp, "Olá! Vim pelo site da Rafaela Shoes e gostaria de mais informações.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a loja no WhatsApp"
        className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lift transition-transform hover:scale-110"
      >
        <WhatsAppIcon className="size-7" />
      </a>
      <BagSheet products={products} />
      <CheckoutDialog products={products} whatsapp={settings.whatsapp} />
    </div>
  );
}
