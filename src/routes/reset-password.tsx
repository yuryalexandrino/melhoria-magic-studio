import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | Rafaela Shoes" },
      { name: "description", content: "Defina uma nova senha para o painel da Rafaela Shoes." },
      { property: "og:title", content: "Nova senha | Rafaela Shoes" },
      { property: "og:description", content: "Defina uma nova senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Link expirado. Peça um novo na tela de entrar.");
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/painel" });
  };
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-ink px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-8 shadow-lift">
        <h1 className="text-3xl">Nova senha</h1>
        <input
          type="password"
          required
          placeholder="Nova senha (mín. 8 caracteres)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 focus:border-gold focus:outline-none"
        />
        <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy}>
          Salvar senha
        </Button>
      </form>
    </div>
  );
}
