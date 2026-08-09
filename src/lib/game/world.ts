export const WORLD_SIZE = 2000;
export const PLAYER_SPEED = 240; // px per second
export const HARVEST_RANGE = 90;
export const PVP_RANGE = 110;
export const MOB_AGGRO_RANGE = 320;
export const MOB_ATTACK_RANGE = 44;
export const MOB_COUNT = 34;

export type Vec = { x: number; y: number };

export type RemotePlayer = {
  id: string;
  name: string;
  faction: string;
  clan: string | null;
  level: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  seen: number;
};

export type Mob = {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  cooldown: number;
  dead: boolean;
  respawnAt: number;
};

export type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: "damage" | "gain" | "warn";
  born: number;
};

export type ChatLine = {
  id: string;
  name: string;
  body: string;
  at: number;
};

export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function makeMobs(count = MOB_COUNT): Mob[] {
  const mobs: Mob[] = [];
  for (let i = 0; i < count; i++) {
    const level = 1 + Math.floor(Math.random() * 8);
    const maxHp = 40 + level * 18;
    mobs.push({
      id: i,
      x: 120 + Math.random() * (WORLD_SIZE - 240),
      y: 120 + Math.random() * (WORLD_SIZE - 240),
      hp: maxHp,
      maxHp,
      level,
      cooldown: 0,
      dead: false,
      respawnAt: 0,
    });
  }
  return mobs;
}

export function respawnMob(mob: Mob) {
  mob.level = 1 + Math.floor(Math.random() * 8);
  mob.maxHp = 40 + mob.level * 18;
  mob.hp = mob.maxHp;
  mob.x = 120 + Math.random() * (WORLD_SIZE - 240);
  mob.y = 120 + Math.random() * (WORLD_SIZE - 240);
  mob.dead = false;
  mob.cooldown = 0;
}

export const NODE_COLORS: Record<string, string> = {
  ore: "#8fa3b8",
  bloodwood: "#a8412f",
  relic: "#c9a227",
};

export const XP_PER_LEVEL = 1000;
