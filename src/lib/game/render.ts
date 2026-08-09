import {
  NODE_COLORS,
  WORLD_SIZE,
  type FloatingText,
  type Mob,
  type RemotePlayer,
  type Vec,
} from "./world";

export type NodeRow = { id: string; kind: string; x: number; y: number; amount: number };
export type TerritoryRow = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  owner_clan_id: string | null;
};

export type Self = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  name: string;
  level: number;
  clanId: string | null;
};

type Scene = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  self: Self;
  others: RemotePlayer[];
  mobs: Mob[];
  nodes: NodeRow[];
  territories: TerritoryRow[];
  clanNames: Map<string, string>;
  floats: FloatingText[];
  now: number;
  swing: number;
};

function worldToScreen(cam: Vec, x: number, y: number, w: number, h: number): Vec {
  return { x: x - cam.x + w / 2, y: y - cam.y + h / 2 };
}

export function drawScene(scene: Scene) {
  const { ctx, width, height, self, now } = scene;
  const cam: Vec = { x: self.x, y: self.y };

  ctx.fillStyle = "#08090b";
  ctx.fillRect(0, 0, width, height);

  // ground grid
  const step = 100;
  ctx.strokeStyle = "rgba(201,162,39,0.06)";
  ctx.lineWidth = 1;
  const startX = Math.floor((cam.x - width / 2) / step) * step;
  const startY = Math.floor((cam.y - height / 2) / step) * step;
  for (let gx = startX; gx < cam.x + width / 2 + step; gx += step) {
    const p = worldToScreen(cam, gx, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, height);
    ctx.stroke();
  }
  for (let gy = startY; gy < cam.y + height / 2 + step; gy += step) {
    const p = worldToScreen(cam, 0, gy, width, height);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(width, p.y);
    ctx.stroke();
  }

  // world bounds
  const tl = worldToScreen(cam, 0, 0, width, height);
  ctx.strokeStyle = "rgba(168,65,47,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(tl.x, tl.y, WORLD_SIZE, WORLD_SIZE);

  // territories
  for (const t of scene.territories) {
    const p = worldToScreen(cam, t.x, t.y, width, height);
    const owned = Boolean(t.owner_clan_id);
    const mine = t.owner_clan_id && t.owner_clan_id === self.clanId;
    ctx.beginPath();
    ctx.arc(p.x, p.y, t.radius, 0, Math.PI * 2);
    ctx.fillStyle = mine
      ? "rgba(201,162,39,0.08)"
      : owned
        ? "rgba(168,65,47,0.08)"
        : "rgba(120,130,145,0.05)";
    ctx.fill();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = mine
      ? "rgba(201,162,39,0.55)"
      : owned
        ? "rgba(168,65,47,0.55)"
        : "rgba(140,150,165,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(233,229,220,0.75)";
    ctx.font = "600 13px Barlow, sans-serif";
    ctx.textAlign = "center";
    const owner = t.owner_clan_id ? scene.clanNames.get(t.owner_clan_id) : null;
    ctx.fillText(t.name.toUpperCase(), p.x, p.y - t.radius + 22);
    ctx.fillStyle = owner ? "rgba(201,162,39,0.8)" : "rgba(160,160,160,0.6)";
    ctx.font = "500 11px Barlow, sans-serif";
    ctx.fillText(owner ? `held by ${owner}` : "uncontested", p.x, p.y - t.radius + 40);
  }

  // resource nodes
  for (const n of scene.nodes) {
    const p = worldToScreen(cam, n.x, n.y, width, height);
    if (p.x < -60 || p.y < -60 || p.x > width + 60 || p.y > height + 60) continue;
    const depleted = n.amount <= 0;
    const size = n.kind === "relic" ? 9 : 12;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = depleted ? "rgba(90,90,95,0.35)" : (NODE_COLORS[n.kind] ?? "#888");
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
    if (!depleted) {
      ctx.fillStyle = "rgba(233,229,220,0.4)";
      ctx.font = "500 10px Barlow, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(n.amount), p.x, p.y + 22);
    }
  }

  // mobs
  for (const m of scene.mobs) {
    if (m.dead) continue;
    const p = worldToScreen(cam, m.x, m.y, width, height);
    if (p.x < -60 || p.y < -60 || p.x > width + 60 || p.y > height + 60) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 13);
    ctx.lineTo(p.x + 11, p.y + 10);
    ctx.lineTo(p.x - 11, p.y + 10);
    ctx.closePath();
    ctx.fillStyle = "#7b2318";
    ctx.fill();
    ctx.strokeStyle = "#d8613f";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(p.x - 16, p.y - 24, 32, 4);
    ctx.fillStyle = "#d8613f";
    ctx.fillRect(p.x - 16, p.y - 24, 32 * (m.hp / m.maxHp), 4);
    ctx.fillStyle = "rgba(233,229,220,0.5)";
    ctx.font = "500 10px Barlow, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Lv${m.level}`, p.x, p.y + 24);
  }

  // other players
  for (const o of scene.others) {
    const p = worldToScreen(cam, o.x, o.y, width, height);
    if (p.x < -80 || p.y < -80 || p.x > width + 80 || p.y > height + 80) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#2a3a52";
    ctx.fill();
    ctx.strokeStyle = "#6f9bd1";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(p.x - 18, p.y - 26, 36, 4);
    ctx.fillStyle = "#6f9bd1";
    ctx.fillRect(p.x - 18, p.y - 26, 36 * Math.max(0, o.hp / Math.max(1, o.maxHp)), 4);
    ctx.fillStyle = "rgba(233,229,220,0.85)";
    ctx.font = "600 11px Barlow, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${o.clan ? `[${o.clan}] ` : ""}${o.name} · ${o.level}`, p.x, p.y + 28);
  }

  // self
  const sp = { x: width / 2, y: height / 2 };
  if (scene.swing > 0) {
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 40 + (1 - scene.swing) * 30, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201,162,39,${scene.swing * 0.6})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = "#1b1408";
  ctx.fill();
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(233,229,220,0.95)";
  ctx.font = "700 12px Barlow, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(self.name, sp.x, sp.y + 30);

  // floating text
  for (const f of scene.floats) {
    const age = (now - f.born) / 1200;
    if (age > 1) continue;
    const p = worldToScreen(cam, f.x, f.y - age * 38, width, height);
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle =
      f.tone === "damage" ? "#e0674a" : f.tone === "gain" ? "#c9a227" : "#e9e5dc";
    ctx.font = "700 14px Barlow, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }

  // minimap
  const mm = 132;
  const pad = 14;
  const mx = width - mm - pad;
  const my = pad;
  ctx.fillStyle = "rgba(8,9,11,0.85)";
  ctx.fillRect(mx, my, mm, mm);
  ctx.strokeStyle = "rgba(201,162,39,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mm, mm);
  const k = mm / WORLD_SIZE;
  for (const t of scene.territories) {
    ctx.beginPath();
    ctx.arc(mx + t.x * k, my + t.y * k, t.radius * k, 0, Math.PI * 2);
    ctx.fillStyle = t.owner_clan_id
      ? t.owner_clan_id === self.clanId
        ? "rgba(201,162,39,0.3)"
        : "rgba(168,65,47,0.3)"
      : "rgba(140,150,165,0.15)";
    ctx.fill();
  }
  ctx.fillStyle = "#6f9bd1";
  for (const o of scene.others) ctx.fillRect(mx + o.x * k - 1.5, my + o.y * k - 1.5, 3, 3);
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(mx + self.x * k - 2.5, my + self.y * k - 2.5, 5, 5);
}
