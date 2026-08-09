import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { drawScene, type NodeRow, type Self, type TerritoryRow } from "@/lib/game/render";
import {
  HARVEST_RANGE,
  MOB_AGGRO_RANGE,
  MOB_ATTACK_RANGE,
  PLAYER_SPEED,
  PVP_RANGE,
  SAFE_RADIUS,
  SPAWN,
  WORLD_SIZE,
  XP_PER_LEVEL,
  clamp,
  dist,
  makeMobs,
  respawnMob,
  type ChatLine,
  type FloatingText,
  type Mob,
  type RemotePlayer,
} from "@/lib/game/world";

export const Route = createFileRoute("/_authenticated/world")({
  head: () => ({
    meta: [
      { title: "The Ashen Reach — Live World | Ashen Dominion" },
      {
        name: "description",
        content:
          "Enter the persistent Ashen Reach: farm contested nodes, hunt the Hollow Kin, duel rival players in real time and seize territory for your clan.",
      },
      { property: "og:title", content: "The Ashen Reach — Live World" },
      {
        property: "og:description",
        content: "A live top-down open world with real-time PvP, resource farming and clan sieges.",
      },
    ],
  }),
  component: WorldPage,
});

type ClanRow = { id: string; name: string; tag: string; renown: number };
type Hud = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  xp: number;
  renown: number;
  kills: number;
  deaths: number;
  ore: number;
  bloodwood: number;
  relics: number;
  gold: number;
  clan: string | null;
  clanId: string | null;
  online: number;
};

const EMPTY_HUD: Hud = {
  name: "…",
  level: 1,
  hp: 100,
  maxHp: 100,
  xp: 0,
  renown: 0,
  kills: 0,
  deaths: 0,
  ore: 0,
  bloodwood: 0,
  relics: 0,
  gold: 0,
  clan: null,
  clanId: null,
  online: 1,
};

function WorldPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const meRef = useRef<Self & { id: string; faction: string }>({
    id: "",
    name: "…",
    faction: "Unsworn",
    x: 1000,
    y: 1000,
    hp: 100,
    maxHp: 100,
    level: 1,
    clanId: null,
  });
  const othersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const mobsRef = useRef<Mob[]>([]);
  const nodesRef = useRef<NodeRow[]>([]);
  const terrRef = useRef<TerritoryRow[]>([]);
  const clanNamesRef = useRef<Map<string, string>>(new Map());
  const floatsRef = useRef<FloatingText[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const stickRef = useRef<{ active: boolean; dx: number; dy: number }>({
    active: false,
    dx: 0,
    dy: 0,
  });
  const swingRef = useRef(0);
  const hudClanRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const busyRef = useRef(false);
  const floatId = useRef(1);

  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [clans, setClans] = useState<ClanRow[]>([]);
  const [leaders, setLeaders] = useState<
    { id: string; character_name: string; level: number; renown: number; kills: number }[]
  >([]);
  const [panel, setPanel] = useState<"none" | "clan" | "ranks">("none");
  const [clanName, setClanName] = useState("");
  const [clanTag, setClanTag] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const say = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 2200);
  }, []);

  const float = useCallback(
    (x: number, y: number, text: string, tone: FloatingText["tone"]) => {
      floatsRef.current.push({ id: floatId.current++, x, y, text, tone, born: performance.now() });
      if (floatsRef.current.length > 40) floatsRef.current.shift();
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    const id = meRef.current.id;
    if (!id) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (!data) return;
    meRef.current.hp = data.hp;
    meRef.current.maxHp = data.max_hp;
    meRef.current.level = data.level;
    meRef.current.name = data.character_name;
    meRef.current.clanId = data.clan_id;
    setHud((h) => ({
      ...h,
      name: data.character_name,
      level: data.level,
      hp: data.hp,
      maxHp: data.max_hp,
      xp: Number(data.experience) % XP_PER_LEVEL,
      renown: data.renown,
      kills: data.kills,
      deaths: data.deaths,
      ore: data.ore,
      bloodwood: data.bloodwood,
      relics: data.relics,
      gold: data.gold,
      clan: data.clan,
      clanId: data.clan_id,
    }));
  }, []);

  const loadWorld = useCallback(async () => {
    const [nodes, terr, clanRows, top] = await Promise.all([
      supabase.from("resource_nodes").select("id, kind, x, y, amount"),
      supabase.from("territories").select("id, name, x, y, radius, owner_clan_id"),
      supabase.from("clans").select("id, name, tag, renown").order("renown", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, character_name, level, renown, kills")
        .order("renown", { ascending: false })
        .limit(10),
    ]);
    nodesRef.current = nodes.data ?? [];
    terrRef.current = terr.data ?? [];
    const map = new Map<string, string>();
    for (const c of clanRows.data ?? []) map.set(c.id, c.name);
    clanNamesRef.current = map;
    setClans(clanRows.data ?? []);
    setLeaders(top.data ?? []);
  }, []);

  // Boot: identity, world data, realtime
  useEffect(() => {
    let cancelled = false;
    mobsRef.current = makeMobs();

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      meRef.current.id = user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile) {
        meRef.current.x = profile.pos_x;
        meRef.current.y = profile.pos_y;
        meRef.current.name = profile.character_name;
        meRef.current.faction = profile.faction;
        meRef.current.hp = profile.hp;
        meRef.current.maxHp = profile.max_hp;
        meRef.current.level = profile.level;
        meRef.current.clanId = profile.clan_id;
      }

      await loadWorld();
      await refreshProfile();

      // existing players in the world (seen in the last 2 minutes)
      const { data: activePlayers } = await supabase
        .from("profiles")
        .select("id, character_name, faction, clan, level, hp, max_hp, pos_x, pos_y")
        .neq("id", user.id)
        .gt("online_at", new Date(Date.now() - 120_000).toISOString());
      for (const p of activePlayers ?? []) {
        othersRef.current.set(p.id, {
          id: p.id,
          name: p.character_name,
          faction: p.faction,
          clan: p.clan,
          level: p.level,
          hp: p.hp,
          maxHp: p.max_hp,
          x: p.pos_x,
          y: p.pos_y,
          tx: p.pos_x,
          ty: p.pos_y,
          seen: Date.now(),
        });
      }

      const channel = supabase.channel("ashen-world", {
        config: { broadcast: { self: false } },
      });
      channel
        .on("broadcast", { event: "pos" }, ({ payload }) => {
          const p = payload as RemotePlayer & { hp: number; maxHp: number };
          if (!p?.id || p.id === meRef.current.id) return;
          const prev = othersRef.current.get(p.id);
          othersRef.current.set(p.id, {
            id: p.id,
            name: p.name,
            faction: p.faction,
            clan: p.clan,
            level: p.level,
            hp: p.hp,
            maxHp: p.maxHp,
            x: prev?.x ?? p.x,
            y: prev?.y ?? p.y,
            tx: p.x,
            ty: p.y,
            seen: Date.now(),
          });
        })
        .on("broadcast", { event: "chat" }, ({ payload }) => {
          const line = payload as ChatLine;
          setChat((c) => [...c.slice(-40), line]);
        })
        .on("broadcast", { event: "left" }, ({ payload }) => {
          othersRef.current.delete((payload as { id: string }).id);
        })
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "resource_nodes" },
          ({ new: row }) => {
            const n = row as NodeRow;
            const idx = nodesRef.current.findIndex((x) => x.id === n.id);
            if (idx >= 0) nodesRef.current[idx] = { ...nodesRef.current[idx]!, amount: n.amount };
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "territories" },
          ({ new: row }) => {
            const t = row as TerritoryRow;
            const idx = terrRef.current.findIndex((x) => x.id === t.id);
            if (idx >= 0) terrRef.current[idx] = { ...terrRef.current[idx]!, ...t };
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "clans" },
          () => void loadWorld(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles" },
          ({ new: row }) => {
            const p = row as {
              id: string;
              hp: number;
              max_hp: number;
              level: number;
              pos_x: number;
              pos_y: number;
            };
            if (p.id === meRef.current.id) {
              if (p.hp < meRef.current.hp) float(meRef.current.x, meRef.current.y, "hit!", "damage");
              meRef.current.hp = p.hp;
              meRef.current.maxHp = p.max_hp;
              void refreshProfile();
              return;
            }
            const prev = othersRef.current.get(p.id);
            if (prev) {
              prev.hp = p.hp;
              prev.maxHp = p.max_hp;
              prev.level = p.level;
            }
          },
        );

      channel.subscribe();
      channelRef.current = channel;
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) {
        void ch.send({
          type: "broadcast",
          event: "left",
          payload: { id: meRef.current.id },
        });
        supabase.removeChannel(ch);
        channelRef.current = null;
      }
    };
  }, [navigate, loadWorld, refreshProfile, float]);

  // Actions
  const harvest = useCallback(async () => {
    if (busyRef.current) return;
    const me = meRef.current;
    let best: NodeRow | null = null;
    let bestD = HARVEST_RANGE;
    for (const n of nodesRef.current) {
      if (n.amount <= 0) continue;
      const d = dist(n.x, n.y, me.x, me.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (!best) {
      say("No node in reach.");
      return;
    }
    busyRef.current = true;
    const { data, error } = await supabase.rpc("harvest_node", { _node_id: best.id });
    busyRef.current = false;
    if (error) {
      say(error.message);
      return;
    }
    const res = data as { kind: string; amount: number } | null;
    if (res) float(best.x, best.y, `+${res.amount} ${res.kind}`, "gain");
    void refreshProfile();
  }, [float, refreshProfile, say]);

  const strike = useCallback(async () => {
    if (busyRef.current) return;
    const me = meRef.current;
    swingRef.current = 1;

    // mobs first
    let mob: Mob | null = null;
    let md = MOB_ATTACK_RANGE + 30;
    for (const m of mobsRef.current) {
      if (m.dead) continue;
      const d = dist(m.x, m.y, me.x, me.y);
      if (d < md) {
        md = d;
        mob = m;
      }
    }
    if (mob) {
      const dmg = 10 + me.level * 3 + Math.floor(Math.random() * 8);
      mob.hp -= dmg;
      float(mob.x, mob.y, `-${dmg}`, "damage");
      if (mob.hp <= 0) {
        mob.dead = true;
        mob.respawnAt = performance.now() + 8000;
        busyRef.current = true;
        const { data } = await supabase.rpc("slay_mob", { _mob_level: mob.level });
        busyRef.current = false;
        const res = data as { xp: number } | null;
        if (res) float(me.x, me.y, `+${res.xp} XP`, "gain");
        void refreshProfile();
      }
      return;
    }

    // then players
    let target: RemotePlayer | null = null;
    let td = PVP_RANGE;
    for (const o of othersRef.current.values()) {
      const d = dist(o.x, o.y, me.x, me.y);
      if (d < td) {
        td = d;
        target = o;
      }
    }
    if (!target) {
      say("Nothing in range.");
      return;
    }
    busyRef.current = true;
    const { data, error } = await supabase.rpc("attack_player", { _target_id: target.id });
    busyRef.current = false;
    if (error) {
      say(error.message);
      return;
    }
    const res = data as { damage: number; killed: boolean } | null;
    if (res) {
      float(target.x, target.y, res.killed ? "SLAIN" : `-${res.damage}`, "damage");
      if (res.killed) say(`You slew ${target.name}.`);
    }
    void refreshProfile();
  }, [float, refreshProfile, say]);

  const capture = useCallback(async () => {
    const me = meRef.current;
    const t = terrRef.current.find((z) => dist(z.x, z.y, me.x, me.y) <= z.radius);
    if (!t) {
      say("Stand inside a territory to claim it.");
      return;
    }
    const { error } = await supabase.rpc("capture_territory", { _territory_id: t.id });
    if (error) {
      say(error.message);
      return;
    }
    say(`${t.name} claimed for your clan!`);
    float(me.x, me.y, "TERRITORY CLAIMED", "gain");
    void loadWorld();
    void refreshProfile();
  }, [float, loadWorld, refreshProfile, say]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let lastBroadcast = 0;
    let lastPersist = 0;
    let lastRespawnSweep = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const me = meRef.current;

      // movement
      const keys = keysRef.current;
      let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      if (stickRef.current.active) {
        dx = stickRef.current.dx;
        dy = stickRef.current.dy;
      }
      const len = Math.hypot(dx, dy);
      if (len > 0.05) {
        me.x = clamp(me.x + (dx / len) * PLAYER_SPEED * dt, 10, WORLD_SIZE - 10);
        me.y = clamp(me.y + (dy / len) * PLAYER_SPEED * dt, 10, WORLD_SIZE - 10);
      }

      // interpolate other players
      for (const [id, o] of othersRef.current) {
        o.x += (o.tx - o.x) * Math.min(1, dt * 8);
        o.y += (o.ty - o.y) * Math.min(1, dt * 8);
        if (Date.now() - o.seen > 20_000) othersRef.current.delete(id);
      }

      // mobs
      for (const m of mobsRef.current) {
        if (m.dead) {
          if (now > m.respawnAt) respawnMob(m);
          continue;
        }
        const d = dist(m.x, m.y, me.x, me.y);
        const sanctuary = dist(me.x, me.y, SPAWN.x, SPAWN.y) < SAFE_RADIUS;
        if (!sanctuary && d < MOB_AGGRO_RANGE && d > MOB_ATTACK_RANGE * 0.7) {
          const speed = 80 + m.level * 4;
          m.x += ((me.x - m.x) / d) * speed * dt;
          m.y += ((me.y - m.y) / d) * speed * dt;
        }
        m.cooldown -= dt;
        if (!sanctuary && d <= MOB_ATTACK_RANGE && m.cooldown <= 0 && me.hp > 0) {
          m.cooldown = 1.6;
          const dmg = 3 + m.level * 2;
          float(me.x, me.y, `-${dmg}`, "damage");
          void supabase.rpc("take_damage", { _amount: dmg }).then(({ data }) => {
            const res = data as { died: boolean } | null;
            if (res?.died) {
              meRef.current.x = 1000;
              meRef.current.y = 1000;
              say("You were slain. Respawned at Cinder Crossroads.");
            }
            void refreshProfile();
          });
        }
      }

      if (swingRef.current > 0) swingRef.current = Math.max(0, swingRef.current - dt * 3);

      // network: broadcast position at 10hz
      if (now - lastBroadcast > 100 && channelRef.current) {
        lastBroadcast = now;
        void channelRef.current.send({
          type: "broadcast",
          event: "pos",
          payload: {
            id: me.id,
            name: me.name,
            faction: me.faction,
            clan: hudClanRef.current,
            level: me.level,
            hp: me.hp,
            maxHp: me.maxHp,
            x: Math.round(me.x),
            y: Math.round(me.y),
          },
        });
      }

      // persist position every 3s
      if (now - lastPersist > 3000 && me.id) {
        lastPersist = now;
        void supabase
          .from("profiles")
          .update({
            pos_x: Math.round(me.x),
            pos_y: Math.round(me.y),
            online_at: new Date().toISOString(),
          })
          .eq("id", me.id);
      }

      if (now - lastRespawnSweep > 15000) {
        lastRespawnSweep = now;
        void supabase.rpc("respawn_nodes").then(() => {
          void supabase
            .from("resource_nodes")
            .select("id, kind, x, y, amount")
            .then(({ data }) => {
              if (data) nodesRef.current = data;
            });
        });
      }

      floatsRef.current = floatsRef.current.filter((f) => now - f.born < 1200);

      const rect = wrap.getBoundingClientRect();
      drawScene({
        ctx,
        width: rect.width,
        height: rect.height,
        self: me,
        others: [...othersRef.current.values()],
        mobs: mobsRef.current,
        nodes: nodesRef.current,
        territories: terrRef.current,
        clanNames: clanNamesRef.current,
        floats: floatsRef.current,
        now,
        swing: swingRef.current,
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [float, refreshProfile, say]);

  useEffect(() => {
    hudClanRef.current = hud.clan;
  }, [hud.clan]);

  // HUD refresh tick
  useEffect(() => {
    const t = window.setInterval(() => {
      setHud((h) => ({
        ...h,
        hp: meRef.current.hp,
        maxHp: meRef.current.maxHp,
        level: meRef.current.level,
        online: othersRef.current.size + 1,
      }));
    }, 400);
    return () => window.clearInterval(t);
  }, []);

  // Out-of-combat regeneration
  useEffect(() => {
    const t = window.setInterval(() => {
      const me = meRef.current;
      if (!me.id || me.hp >= me.maxHp) return;
      void supabase.rpc("heal_tick").then(({ data }) => {
        if (typeof data === "number" && data > 0) meRef.current.hp = data;
      });
    }, 4000);
    return () => window.clearInterval(t);
  }, []);

  // Keyboard
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
      keysRef.current.add(k);
      if (k === "e") void harvest();
      if (k === " " || k === "f") void strike();
      if (k === "c") void capture();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [harvest, strike, capture]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const body = chatDraft.trim().slice(0, 160);
    if (!body || !channelRef.current) return;
    const line: ChatLine = {
      id: crypto.randomUUID(),
      name: meRef.current.name,
      body,
      at: Date.now(),
    };
    void channelRef.current.send({ type: "broadcast", event: "chat", payload: line });
    setChat((c) => [...c.slice(-40), line]);
    setChatDraft("");
  };

  const createClan = async () => {
    const { error } = await supabase.rpc("create_clan", { _name: clanName, _tag: clanTag });
    if (error) {
      say(error.message);
      return;
    }
    setClanName("");
    setClanTag("");
    await loadWorld();
    await refreshProfile();
    say("Clan founded.");
  };

  const joinClan = async (id: string) => {
    const { error } = await supabase.rpc("join_clan", { _clan_id: id });
    if (error) {
      say(error.message);
      return;
    }
    await refreshProfile();
    say("You swore the oath.");
  };

  // Touch joystick
  const stickBase = useRef<{ x: number; y: number } | null>(null);
  const onStickStart = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    stickBase.current = { x: e.clientX, y: e.clientY };
    stickRef.current.active = true;
  };
  const onStickMove = (e: React.PointerEvent) => {
    if (!stickRef.current.active || !stickBase.current) return;
    const dx = e.clientX - stickBase.current.x;
    const dy = e.clientY - stickBase.current.y;
    const m = Math.max(1, Math.hypot(dx, dy));
    const cappedMag = Math.min(m, 52) / 52;
    stickRef.current.dx = (dx / m) * cappedMag;
    stickRef.current.dy = (dy / m) * cappedMag;
  };
  const onStickEnd = () => {
    stickRef.current = { active: false, dx: 0, dy: 0 };
    stickBase.current = null;
  };

  const hpPct = Math.round((hud.hp / Math.max(1, hud.maxHp)) * 100);
  const xpPct = Math.round((hud.xp / XP_PER_LEVEL) * 100);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      </div>

      {loading && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-background/90 text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Entering the Ashen Reach…
        </div>
      )}

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto panel w-[min(340px,70vw)] rounded-sm border border-border/60 p-3">
          <div className="flex items-baseline justify-between">
            <span className="font-[family-name:var(--font-display)] text-sm font-bold text-gold">
              {hud.clan ? `[${hud.clan}] ` : ""}
              {hud.name}
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              Lv {hud.level}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[#a8412f]" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gold" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            <div>
              <div className="text-sm text-foreground">{hud.ore}</div>ore
            </div>
            <div>
              <div className="text-sm text-foreground">{hud.bloodwood}</div>wood
            </div>
            <div>
              <div className="text-sm text-foreground">{hud.relics}</div>relics
            </div>
            <div>
              <div className="text-sm text-foreground">{hud.kills}</div>kills
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPanel(panel === "clan" ? "none" : "clan")}>
              Clans
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPanel(panel === "ranks" ? "none" : "ranks")}>
              Ranks
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/character">Sheet</Link>
            </Button>
          </div>
          <span className="rounded-sm bg-background/70 px-2 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            {hud.online} in the reach
          </span>
        </div>
      </div>

      {/* Panels */}
      {panel === "clan" && (
        <div className="panel absolute right-3 top-28 z-30 w-[min(340px,80vw)] rounded-sm border border-border/60 p-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Clans</h2>
          {!hud.clanId && (
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Clan name"
                value={clanName}
                maxLength={28}
                onChange={(e) => setClanName(e.target.value)}
              />
              <Input
                placeholder="Tag (max 4)"
                value={clanTag}
                maxLength={4}
                onChange={(e) => setClanTag(e.target.value)}
              />
              <Button size="sm" className="w-full" onClick={createClan}>
                Found clan
              </Button>
            </div>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {clans.length === 0 && <li className="text-muted-foreground">No clans yet. Found the first.</li>}
            {clans.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className="text-gold">[{c.tag}]</span> {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">{c.renown} renown</span>
                </span>
                {hud.clanId !== c.id && (
                  <Button size="sm" variant="ghost" onClick={() => joinClan(c.id)}>
                    Join
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {panel === "ranks" && (
        <div className="panel absolute right-3 top-28 z-30 w-[min(340px,80vw)] rounded-sm border border-border/60 p-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Warlords</h2>
          <ol className="mt-3 space-y-1 text-sm">
            {leaders.map((p, i) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {i + 1}. {p.character_name}
                </span>
                <span className="text-gold">
                  {p.renown} · {p.kills}k
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Chat */}
      <div className="absolute bottom-3 left-3 z-20 w-[min(330px,72vw)]">
        <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
          {chat.slice(-8).map((l) => (
            <p key={l.id} className="rounded-sm bg-background/70 px-2 py-1">
              <span className="text-gold">{l.name}:</span> {l.body}
            </p>
          ))}
        </div>
        <form onSubmit={sendChat} className="mt-2 flex gap-2">
          <Input
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            placeholder="Speak to the reach…"
            className="h-9 bg-background/80 text-sm"
          />
          <Button type="submit" size="sm" variant="outline">
            Say
          </Button>
        </form>
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" onClick={harvest}>
            Farm
          </Button>
          <Button size="sm" variant="destructive" onClick={strike}>
            Strike
          </Button>
          <Button size="sm" variant="outline" onClick={capture}>
            Claim
          </Button>
        </div>
        <div
          onPointerDown={onStickStart}
          onPointerMove={onStickMove}
          onPointerUp={onStickEnd}
          onPointerCancel={onStickEnd}
          className="grid h-28 w-28 touch-none place-items-center rounded-full border border-border/60 bg-background/50 md:hidden"
        >
          <span className="h-10 w-10 rounded-full border border-gold/60 bg-background/70" />
        </div>
        <p className="hidden text-right text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground md:block">
          WASD move · E farm · Space strike · C claim
        </p>
      </div>

      {toast && (
        <div className="absolute left-1/2 top-24 z-40 -translate-x-1/2 rounded-sm border border-border/60 bg-background/90 px-4 py-2 text-sm">
          {toast}
        </div>
      )}
    </main>
  );
}
