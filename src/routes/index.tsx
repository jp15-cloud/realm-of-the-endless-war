import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroWar from "@/assets/hero-war.jpg";
import worldImg from "@/assets/world.jpg";
import farmingImg from "@/assets/farming.jpg";
import classesImg from "@/assets/classes.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ashen Dominion — Open-World Grimdark MMORPG" },
      {
        name: "description",
        content:
          "Ashen Dominion is an open-world grimdark MMORPG built on deep grind, siege-scale clan wars, contested resource farming, and full cross-play between PC and mobile.",
      },
      { property: "og:title", content: "Ashen Dominion — Open-World Grimdark MMORPG" },
      {
        property: "og:description",
        content:
          "Grind for power. Farm contested ground. Take a fortress with your clan. Cross-play on PC and mobile.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    tag: "I",
    title: "Grind That Means Something",
    body: "No level squish, no catch-up handouts. 1–120 across nine mastery tracks, with weapon ranks that only rise through use. Every point of power on your character was paid for in hours.",
  },
  {
    tag: "II",
    title: "Clan Wars at Siege Scale",
    body: "Up to 300 players contest a single keep. Declare war, breach the gate, hold the throne for seven real days, and tax every road your banner touches.",
  },
  {
    tag: "III",
    title: "Contested Resource Farming",
    body: "Ore veins, bloodwood groves and relic sites are finite, timed, and open-PvP. Nothing valuable spawns anywhere safe.",
  },
  {
    tag: "IV",
    title: "One World, Two Screens",
    body: "The same character, the same shard, the same war. Full input parity between desktop and touch with no separate mobile economy.",
  },
];

const factions = [
  {
    name: "The Ashen Choir",
    creed: "Ruin is a sacrament.",
    body: "Warpriests who burn their own holdings rather than surrender them. Strongest in attrition sieges and territory denial.",
  },
  {
    name: "Ironmoor Pact",
    creed: "Every debt is collected.",
    body: "Mercenary smiths and caravan lords. Control the forge network, the trade roads and the price of war.",
  },
  {
    name: "Hollow Kin",
    creed: "We were here before the light.",
    body: "Plague-touched raiders who fight from the dark. Ambush warfare, poison economies, node sabotage.",
  },
];

const specs = [
  ["Worlds", "6 persistent shards, no instanced overworld"],
  ["Siege cap", "300v300 with server-side rollback netcode"],
  ["Territory", "184 claimable holdings, weekly war windows"],
  ["Platforms", "Windows, macOS, iOS, Android — one account"],
  ["Economy", "Full player crafting, item loss on death in warzones"],
  ["Monetisation", "Buy-to-play. Cosmetics only. No power sold."],
];

function Landing() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.32em] text-gold">
            ASHEN DOMINION
          </span>
          <nav className="hidden gap-8 text-xs uppercase tracking-[0.2em] text-muted-foreground md:flex">
            <a className="transition-colors hover:text-gold" href="#world">
              World
            </a>
            <a className="transition-colors hover:text-gold" href="#war">
              War
            </a>
            <a className="transition-colors hover:text-gold" href="#factions">
              Factions
            </a>
            <a className="transition-colors hover:text-gold" href="#enlist">
              Enlist
            </a>
            <Link className="text-gold transition-colors hover:text-foreground" to="/character">
              My Character
            </Link>
          </nav>

        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-end overflow-hidden">
        <img
          src={heroWar}
          alt="Two clan armies facing each other beneath a blood-red eclipse before a ruined fortress"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="ash-veil absolute inset-0" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-32">
          <p className="eyebrow">Open-world grimdark MMORPG</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.95] sm:text-7xl">
            The land is already lost.
            <span className="block text-gold">Take what remains.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A single persistent continent where power is ground out hour by hour, resources are
            taken from someone else, and every fortress on the map belongs to a clan that had to
            bleed for it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#enlist"
              className="border border-gold/70 bg-[image:var(--gradient-ember)] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground shadow-[var(--shadow-forge)] transition-transform hover:-translate-y-0.5"
            >
              Claim a banner
            </a>
            <a
              href="#world"
              className="border border-border px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-foreground/80 transition-colors hover:border-gold/60 hover:text-gold"
            >
              See the world
            </a>
          </div>
          <p className="mt-8 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
            PC · iOS · Android — same shard, same character
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section id="war" className="mx-auto max-w-6xl px-5 py-24">
        <div className="rule-gold" />
        <h2 className="mt-10 max-w-2xl text-3xl font-bold sm:text-4xl">
          Built for players who never wanted the genre to get easier
        </h2>
        <div className="mt-12 grid gap-px bg-border/60 sm:grid-cols-2">
          {pillars.map((p) => (
            <article key={p.tag} className="bg-background p-8">
              <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.4em] text-blood">
                {p.tag}
              </span>
              <h3 className="mt-4 text-xl font-bold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* World */}
      <section id="world" className="relative overflow-hidden border-y border-border/60">
        <img
          src={worldImg}
          alt="A cursed marshland stretching toward black mountains and a distant crumbling citadel"
          width={1536}
          height={864}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="ash-veil absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 py-28">
          <p className="eyebrow">The continent of Vharn</p>
          <h2 className="mt-5 max-w-2xl text-3xl font-bold sm:text-4xl">
            Seamless, unforgiving, and entirely player-owned
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            One continuous landmass with no loading walls between regions. Safe ground ends four
            hours from the starting gate. Everything past it is claimable, taxable and losable.
          </p>
          <div className="mt-12 grid gap-px bg-border/60 sm:grid-cols-3">
            {[
              ["184", "claimable holdings"],
              ["7 days", "to hold a keep and bank the tax"],
              ["0", "instanced overworld zones"],
            ].map(([n, l]) => (
              <div key={l} className="bg-background/85 p-8 backdrop-blur-sm">
                <p className="font-[family-name:var(--font-display)] text-4xl font-black text-gold">
                  {n}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Farming */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:grid-cols-2">
        <img
          src={farmingImg}
          alt="A hooded miner cutting glowing crimson ore from a vein in a torchlit quarry"
          width={1024}
          height={1024}
          loading="lazy"
          className="panel w-full object-cover"
        />
        <div>
          <p className="eyebrow">Resource farming</p>
          <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Nothing worth having is safe</h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Bloodiron, ashwood and relic shards spawn only in contested territory on shared timers
            broadcast to the whole shard. Farming is a scheduled fight over a known point on the
            map, not a private loop.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            {[
              "Finite node health — a vein stripped by a rival clan stays dead for 36 hours.",
              "Full crafting chain: every weapon, siege engine and wall in the game is player-made.",
              "Cargo is lootable. Hauling ore across a war road is its own risk.",
            ].map((t) => (
              <li key={t} className="flex gap-4 border-l border-blood/60 pl-4 leading-relaxed">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Factions */}
      <section id="factions" className="border-y border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <p className="eyebrow">Three creeds</p>
          <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Pick who you owe</h2>
          <img
            src={classesImg}
            alt="A blood-marked berserker, a hooded assassin and a rune-scarred warpriest standing in darkness"
            width={1536}
            height={864}
            loading="lazy"
            className="panel mt-10 w-full object-cover"
          />
          <div className="mt-px grid gap-px bg-border/60 sm:grid-cols-3">
            {factions.map((f) => (
              <article key={f.name} className="bg-background p-8">
                <h3 className="text-lg font-bold text-gold">{f.name}</h3>
                <p className="mt-1 text-xs italic tracking-wide text-blood">{f.creed}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <p className="eyebrow">The shape of it</p>
        <dl className="mt-10 divide-y divide-border/60 border-y border-border/60">
          {specs.map(([k, v]) => (
            <div key={k} className="grid gap-2 py-5 sm:grid-cols-[14rem_1fr]">
              <dt className="text-xs uppercase tracking-[0.24em] text-gold">{k}</dt>
              <dd className="text-sm text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Enlist */}
      <section id="enlist" className="relative overflow-hidden border-t border-border/60">
        <div className="absolute inset-0 bg-[image:var(--gradient-ember)] opacity-[0.12]" />
        <div className="relative mx-auto max-w-2xl px-5 py-28 text-center">
          <p className="eyebrow">Closed siege test</p>
          <h2 className="mt-5 text-3xl font-bold sm:text-5xl">Enlist before the first war window</h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Founding clans get first claim on the northern holdings and a permanent banner in the
            world record. Enter your email to reserve a slot.
          </p>
          {joined ? (
            <p className="mt-10 border border-gold/60 px-6 py-5 text-sm text-gold">
              Your banner is reserved. Muster orders will reach you before the gates open.
            </p>
          ) : (
            <form
              className="mt-10 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setJoined(true);
              }}
            >
              <label className="sr-only" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warlord@clan.tld"
                className="flex-1 border border-border bg-background/80 px-5 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold"
              />
              <button
                type="submit"
                className="border border-gold/70 bg-[image:var(--gradient-ember)] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Enlist
              </button>
            </form>
          )}
          <p className="mt-6 text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">
            Buy-to-play · cosmetics only · no power sold
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-muted-foreground sm:flex-row">
          <span className="font-[family-name:var(--font-display)] tracking-[0.3em] text-gold">
            ASHEN DOMINION
          </span>
          <span>Pre-alpha. Everything here is subject to the war.</span>
        </div>
      </footer>
    </main>
  );
}
