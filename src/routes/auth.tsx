import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/store/Header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no painel | Rafaela Shoes" },
      { name: "description", content: "Acesso da dona da loja ao painel da Rafaela Shoes." },
      { property: "og:title", content: "Entrar no painel | Rafaela Shoes" },
      { property: "og:description", content: "Acesso ao painel da loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const inputCls =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-base focus:border-gold focus:outline-none";

function AuthPage() {
  const navigate = useNavigate();
  const { data: hasOwner, isLoading } = useQuery({
    queryKey: ["store-has-owner"],
    queryFn: async () => {
      const { data } = await supabase.rpc("store_has_owner");
      return !!data;
    },
  });
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  const creating = hasOwner === false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link para seu e-mail.");
        setMode("login");
      } else if (creating) {
        if (password.length < 8) {
          toast.error("A senha precisa ter pelo menos 8 caracteres.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/painel` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/painel" });
        else setSentConfirm(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(/invalid login/i.test(msg) ? "E-mail ou senha incorretos." : /confirm/i.test(msg) ? "Confirme seu e-mail antes de entrar." : "Não foi possível continuar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-ink px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-lift">
        <Link to="/" className="mb-6 block text-center">
          <Logo className="text-foreground" />
        </Link>
        {sentConfirm ? (
          <div className="text-center">
            <h1 className="text-3xl">Confira seu e-mail</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Enviamos um link para <b>{email}</b>. Toque nele para ativar sua conta e abrir o painel.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-3xl">
              {mode === "forgot" ? "Recuperar senha" : creating ? "Criar conta da loja" : "Painel da loja"}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {mode === "forgot"
                ? "Digite seu e-mail para receber um link."
                : creating
                  ? "Primeiro acesso: esta conta será a dona da loja."
                  : "Entre para editar produtos e informações."}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                placeholder="E-mail"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
              {mode === "login" && (
                <input
                  type="password"
                  required
                  placeholder="Senha"
                  autoComplete={creating ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              )}
              <Button type="submit" variant="ink" size="xl" className="w-full" disabled={busy || isLoading}>
                {busy ? "Aguarde…" : mode === "forgot" ? "Enviar link" : creating ? "Criar conta" : "Entrar"}
              </Button>
            </form>
            {!creating && (
              <button
                onClick={() => setMode(mode === "login" ? "forgot" : "login")}
                className="mt-4 w-full text-center text-sm text-muted-foreground underline underline-offset-2"
              >
                {mode === "login" ? "Esqueci minha senha" : "Voltar para entrar"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
