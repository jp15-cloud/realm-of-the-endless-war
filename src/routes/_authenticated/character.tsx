import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/character")({
  head: () => ({
    meta: [
      { title: "Your Character — Ashen Dominion" },
      {
        name: "description",
        content:
          "Track your Ashen Dominion character: level, experience, renown, clan and hoarded resources, synced across PC and mobile.",
      },
      { property: "og:title", content: "Your Character — Ashen Dominion" },
      {
        property: "og:description",
        content: "Your persistent character sheet, synced across every device.",
      },
    ],
  }),
  component: CharacterPage,
});

type Profile = {
  id: string;
  character_name: string;
  faction: string;
  class: string;
  level: number;
  experience: number;
  renown: number;
  clan: string | null;
  ore: number;
  bloodwood: number;
  relics: number;
  updated_at: string;
};

const XP_PER_LEVEL = 1000;

function CharacterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Profile>>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created as Profile;
    },
  });

  useEffect(() => {
    if (profile) {
      setDraft({
        character_name: profile.character_name,
        faction: profile.faction,
        class: profile.class,
        clan: profile.clan ?? "",
      });
    }
  }, [profile]);

  async function persist(patch: Partial<Omit<Profile, "id" | "updated_at">>) {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Progress saved.");
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function logSession() {
    if (!profile) return;
    const gainedXp = 250;
    const totalXp = profile.experience + gainedXp;
    await persist({
      experience: totalXp,
      level: Math.max(profile.level, Math.floor(totalXp / XP_PER_LEVEL) + 1),
      renown: profile.renown + 15,
      ore: profile.ore + 40,
      bloodwood: profile.bloodwood + 25,
      relics: profile.relics + 1,
    });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Summoning your character…
      </main>
    );
  }

  const intoLevel = profile.experience % XP_PER_LEVEL;
  const pct = Math.round((intoLevel / XP_PER_LEVEL) * 100);

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.32em] text-gold"
          >
            ASHEN DOMINION
          </Link>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>

        <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl font-bold">
          {profile.character_name}
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {profile.faction} · {profile.class} · Level {profile.level}
          {profile.clan ? ` · ${profile.clan}` : ""}
        </p>

        <section className="panel mt-8 rounded-sm border border-border/60 p-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="uppercase tracking-[0.2em] text-muted-foreground">Experience</span>
            <span>
              {intoLevel} / {XP_PER_LEVEL}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Renown", profile.renown],
              ["Ore", profile.ore],
              ["Bloodwood", profile.bloodwood],
              ["Relics", profile.relics],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-sm border border-border/60 p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-gold">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <Button className="mt-6" onClick={logSession} disabled={saving}>
            Log a war session (+250 XP)
          </Button>
        </section>

        <section className="panel mt-6 rounded-sm border border-border/60 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Character details
          </h2>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await persist({
                character_name: (draft.character_name ?? "").trim() || "Unnamed Wanderer",
                faction: (draft.faction ?? "").trim() || "Unsworn",
                class: (draft.class ?? "").trim() || "Vagrant",
                clan: (draft.clan ?? "").trim() || null,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Character name</Label>
              <Input
                id="name"
                maxLength={24}
                value={draft.character_name ?? ""}
                onChange={(e) => setDraft({ ...draft, character_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faction">Faction</Label>
              <Input
                id="faction"
                maxLength={40}
                value={draft.faction ?? ""}
                onChange={(e) => setDraft({ ...draft, faction: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                maxLength={40}
                value={draft.class ?? ""}
                onChange={(e) => setDraft({ ...draft, class: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clan">Clan</Label>
              <Input
                id="clan"
                maxLength={40}
                value={draft.clan ?? ""}
                onChange={(e) => setDraft({ ...draft, clan: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                Save character
              </Button>
              {message && <span className="ml-3 text-sm text-muted-foreground">{message}</span>}
            </div>
          </form>
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Last synced {new Date(profile.updated_at).toLocaleString()} — the same sheet loads on PC
          and mobile.
        </p>
      </div>
    </main>
  );
}
