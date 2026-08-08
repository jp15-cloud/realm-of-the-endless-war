import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Enlist or Sign In — Ashen Dominion" },
      {
        name: "description",
        content:
          "Create your Ashen Dominion account or sign in to carry one persistent character across PC and mobile.",
      },
      { property: "og:title", content: "Enlist or Sign In — Ashen Dominion" },
      {
        property: "og:description",
        content: "One account, one character, every device. Sign in to Ashen Dominion.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/character", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/character`,
            data: { character_name: characterName },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate({ to: "/character", replace: true });
        } else {
          setNotice("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate({ to: "/character", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/character", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.32em] text-gold"
        >
          ASHEN DOMINION
        </Link>

        <div className="panel mt-6 rounded-sm border border-border/60 p-7">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            {mode === "signup" ? "Enlist" : "Return to the field"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One account. One character. Progress carried between PC and mobile.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={handleGoogle}
            disabled={busy}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="character">Character name</Label>
                <Input
                  id="character"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  maxLength={24}
                  placeholder="Sable of Ironmoor"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-gold">{notice}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-5 w-full text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-gold"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "signup" ? "Already enlisted? Sign in" : "No account? Enlist"}
          </button>
        </div>
      </div>
    </main>
  );
}
