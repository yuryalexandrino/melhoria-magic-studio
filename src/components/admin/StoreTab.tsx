import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isValidWhatsApp, type StoreSettings } from "@/lib/store";
import { adminSettingsQuery, settingsToRow } from "./data";
import { uploadPhoto } from "./upload";

const input = "h-11 w-full rounded-xl border border-input bg-background px-3 text-base focus:border-gold focus:outline-none";
const area = "w-full rounded-xl border border-input bg-background p-3 text-base focus:border-gold focus:outline-none";

function F({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function StoreTab() {
  const { data } = useSuspenseQuery(adminSettingsQuery);
  const qc = useQueryClient();
  const [s, setS] = useState<StoreSettings>(data);
  const [uploading, setUploading] = useState(false);
  const up = (k: keyof StoreSettings) => (e: { target: { value: string } }) => setS((p) => ({ ...p, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("store_settings").update(settingsToRow(s)).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informações salvas. O site já foi atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  const submit = () => {
    if (!isValidWhatsApp(s.whatsapp)) {
      toast.error("WhatsApp inválido. Use 55 + DDD + número, ex.: 558391082240.");
      return;
    }
    save.mutate();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-3xl">Página inicial</h2>
        <F label="Frase principal">
          <input className={input} value={s.heroTitle} onChange={up("heroTitle")} />
        </F>
        <F label="Texto abaixo da frase">
          <textarea rows={2} className={area} value={s.heroSubtitle} onChange={up("heroSubtitle")} />
        </F>
        <F label="Aviso no topo do site" hint="Ex.: Frete grátis no bairro · Novidades toda sexta">
          <input className={input} value={s.announcement} onChange={up("announcement")} />
        </F>
        <div>
          <span className="text-sm font-medium">Foto de destaque</span>
          <p className="text-xs text-muted-foreground">Sem foto, o site monta uma colagem com seus produtos.</p>
          <div className="mt-2 flex items-center gap-3">
            {s.bannerUrl && (
              <div className="relative">
                <img src={s.bannerUrl} alt="" className="arch h-32 w-24 object-cover" />
                <button
                  onClick={() => setS((p) => ({ ...p, bannerUrl: "" }))}
                  className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-ink-foreground"
                  aria-label="Remover foto de destaque"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            <label className="flex h-32 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-xs text-muted-foreground hover:border-gold">
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              {s.bannerUrl ? "Trocar" : "Enviar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(true);
                  try {
                    const url = await uploadPhoto(f, "banner", 1600);
                    setS((p) => ({ ...p, bannerUrl: url }));
                  } catch {
                    toast.error("Não foi possível enviar a foto.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>
        </div>
        <F label="Sobre a loja">
          <textarea rows={4} className={area} value={s.about} onChange={up("about")} />
        </F>
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-3xl">Contato e políticas</h2>
        <F label="WhatsApp que recebe os pedidos" hint="Com 55 e DDD, só números. Ex.: 558391082240">
          <input className={input} inputMode="numeric" value={s.whatsapp} onChange={up("whatsapp")} />
        </F>
        <F label="Instagram" hint="Sem o @">
          <input className={input} value={s.instagram} onChange={up("instagram")} />
        </F>
        <F label="Informações de entrega">
          <textarea rows={4} className={area} value={s.delivery} onChange={up("delivery")} />
        </F>
        <F label="Trocas e devoluções">
          <textarea rows={4} className={area} value={s.returns} onChange={up("returns")} />
        </F>
        <F label="Política de privacidade">
          <textarea rows={4} className={area} value={s.privacy} onChange={up("privacy")} />
        </F>
      </div>

      <div className="lg:col-span-2">
        <Button variant="ink" size="xl" onClick={submit} disabled={save.isPending || uploading}>
          {save.isPending ? "Salvando…" : "Salvar informações"}
        </Button>
      </div>
    </div>
  );
}
