import { Quest, QUEST_TYPES } from "../models/Quest.js";
import { STATIC_QUESTS, WORLD_TEMPLATES, NPC_INTRO } from "../models/QuestData.js";
import { ZONES, randomPointInZone } from "../models/Zone.js";
import { MathEngine } from "../models/MathEngine.js";

// Objective types that mirror game state instead of counting events.
const STATE_TYPES = new Set(["level", "guards", "kingdom", "warWon"]);
const TYPE_ORDER = ["main", "class", "side", "npc", "world"];
const STAT_LABELS = { maxHp: "Max HP", maxMp: "Max MP", attack: "Attack", speed: "Speed" };
const MAX_ACTIVE = 12;          // non-world quests in the log at once
const WORLD_QUEST_COUNT = 4;    // world quests posted across Mathoria
const WORLD_RESPAWN_DELAY = 900; // frames before a replacement world quest appears
const formatTime = frames => {
  const s = Math.max(0, Math.ceil(frames / 60));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Owns the quest log: availability, progress tracking, rewards, world-quest rotation.
// GameViewModel reports gameplay events through notify(); views read plain objects via describe().
export class QuestViewModel {
  constructor(game) {
    this.game = game;
    this.quests = new Map();
    this.version = 0;
    this.markers = new Map();
    this.mapCache = null;
    this.worldSeq = 0;
    this.nextWorldSpawn = 0;
  }

  init() {
    this.quests = new Map();
    this.worldSeq = 0;
    this.nextWorldSpawn = 0;
    for (const def of STATIC_QUESTS) this.quests.set(def.id, new Quest(def));
    for (let i = 0; i < WORLD_QUEST_COUNT; i++) this.spawnWorldQuest();
    this.touch();
  }

  // ---------- state helpers ----------
  activeQuests() { return [...this.quests.values()].filter(q => q.status === "active" || q.status === "ready"); }
  worldCount() { return [...this.quests.values()].filter(q => q.type === "world").length; }
  sorted(list) { return list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)); }

  unlocked(q) {
    const p = this.game.player;
    return (!q.classOnly || q.classOnly === p.characterClass) && p.level >= q.minLevel &&
      (!q.requires || this.quests.get(q.requires)?.status === "completed");
  }

  stateValue(type) {
    const g = this.game;
    if (type === "level") return g.player.level;
    if (type === "guards") return g.kingdom?.guards.length || 0;
    if (type === "kingdom") return g.kingdom ? 1 : 0;
    return g.warWins || 0; // warWon
  }

  touch() {
    if (this.game.player) {
      for (const q of this.quests.values()) if (q.type !== "world" && q.status === "locked" && this.unlocked(q)) q.status = "available";
    }
    this.mapCache = null;
    this.recomputeMarkers();
    this.version++;
  }

  // Marker above an NPC's head: "!" = quest available, "?" = ready to turn in, grey "?" = in progress.
  recomputeMarkers() {
    const map = new Map();
    const put = (key, symbol, color, rank) => {
      const cur = map.get(key);
      if (!cur || rank > cur.rank) map.set(key, { symbol, color, rank });
    };
    for (const q of this.quests.values()) {
      if (q.type === "world") continue;
      const color = QUEST_TYPES[q.type].color;
      if (q.status === "ready") put(q.turnIn, "?", color, 3);
      else if (q.status === "available") put(q.giver, "!", color, 2);
      else if (q.status === "active") put(q.turnIn, "?", "#94a3b8", 1);
    }
    this.markers = map;
  }
  markerFor(npc) { return this.markers.get(npc.questKey || npc.name) || null; }

  // ---------- quest lifecycle ----------
  accept(id) {
    const q = this.quests.get(id), g = this.game;
    if (!q || q.status !== "available") return false;
    if (q.type !== "world" && this.activeQuests().filter(x => x.type !== "world").length >= MAX_ACTIVE) {
      g.view.toast(`Quest log full (${MAX_ACTIVE}). Abandon or finish a quest first.`);
      return false;
    }
    q.status = "active";
    for (const o of q.objectives) if (STATE_TYPES.has(o.type)) o.progress = Math.min(o.amount, this.stateValue(o.type));
    g.view.log(`${QUEST_TYPES[q.type].icon} ${QUEST_TYPES[q.type].label} started: ${q.title}`);
    g.view.toast(`Quest accepted: ${q.title}`);
    this.checkComplete(q);
    this.touch();
    return true;
  }

  abandon(id) {
    const q = this.quests.get(id);
    if (!q || q.type === "world" || (q.status !== "active" && q.status !== "ready")) return;
    q.status = "available";
    q.reset();
    this.game.view.log(`Quest abandoned: ${q.title}`);
    this.touch();
  }

  turnIn(id) {
    const q = this.quests.get(id);
    if (q && q.status === "ready") this.complete(q);
  }

  checkComplete(q) {
    if (q.status !== "active" || !q.complete) return;
    if (q.turnIn === "auto") return this.complete(q);
    q.status = "ready";
    this.game.view.log(`Objectives complete: ${q.title}. Return to ${this.npcLabel(q.turnIn)}.`);
    this.game.view.toast(`Quest ready to turn in: ${q.title}`);
  }

  complete(q) {
    const g = this.game, p = g.player, r = q.rewards;
    if (q.type === "world") {
      this.quests.delete(q.id);
      this.nextWorldSpawn = g.frame + WORLD_RESPAWN_DELAY;
    } else if (q.repeatable) {
      q.status = "cooldown";
      q.readyAt = g.frame + q.cooldown;
    } else q.status = "completed";
    if (r.gold) p.gold += r.gold;
    if (r.potions) p.potions += r.potions;
    for (const [key, value] of Object.entries(r.stats || {})) {
      p[key] = key === "speed" ? Math.round((p[key] + value) * 10) / 10 : p[key] + value;
      if (key === "maxHp") p.hp += value;
      if (key === "maxMp") p.mp += value;
    }
    const levels = r.exp ? p.addExperience(r.exp) : 0;
    g.view.log(`✔ Quest complete: ${q.title} — ${this.rewardText(q)}`);
    g.view.toast(`Quest complete: ${q.title}`);
    if (levels) {
      g.view.log(`Level up! You reached level ${p.level}.`);
      this.notify("level", { value: p.level });
    }
    this.touch();
  }

  // ---------- gameplay events ----------
  // Called by GameViewModel: kill, gather, craft, talk, cast, crit, potion, eat, drink, visit, level, guards, kingdom, warWon.
  notify(type, data = {}) {
    const g = this.game, p = g.player;
    if (!p) return;
    const zone = data.zone || g.getBiome(p.x, p.y);
    const amount = data.amount ?? 1;
    let changed = false;
    for (const q of this.activeQuests()) {
      if (q.status !== "active") continue;
      if (q.type === "world" && q.zone && q.zone !== zone) continue; // world quests only count inside their zone
      let hit = false;
      for (const o of q.objectives) {
        if (o.type !== type || o.progress >= o.amount) continue;
        if (o.target && o.target !== "any" && o.target !== data.target) continue;
        o.progress = STATE_TYPES.has(type)
          ? Math.min(o.amount, Math.max(o.progress, data.value ?? 1))
          : Math.min(o.amount, o.progress + amount);
        hit = true;
      }
      if (hit) { changed = true; this.checkComplete(q); }
    }
    if (changed) this.touch();
  }

  // Per-frame upkeep: world quest timers, NPC cooldowns, zone auto-start, location objectives.
  tick(frame) {
    const g = this.game, p = g.player;
    if (!p) return;
    let changed = false;
    for (const q of [...this.quests.values()]) {
      if (q.type === "world") {
        if (--q.timeLeft <= 0) {
          this.quests.delete(q.id);
          this.nextWorldSpawn = frame + WORLD_RESPAWN_DELAY;
          g.view.log(`World quest expired: ${q.title}`);
          changed = true;
        }
      } else if (q.status === "cooldown" && frame >= q.readyAt) {
        q.reset(); q.status = "available"; changed = true;
      }
    }
    if (frame % 10 === 0) changed = this.scanPosition(p) || changed;
    if (frame % 30 === 0) this.notify("visit", { target: g.getBiome(p.x, p.y) });
    if (this.worldCount() < WORLD_QUEST_COUNT && frame >= this.nextWorldSpawn) {
      this.spawnWorldQuest();
      changed = true;
    }
    if (changed) this.touch();
  }

  scanPosition(p) {
    const biome = this.game.getBiome(p.x, p.y);
    let changed = false;
    for (const q of [...this.quests.values()]) {
      if (q.type === "world" && q.status === "available" && q.zone === biome) {
        changed = this.accept(q.id) || changed; // world quests start automatically when you enter their zone
        continue;
      }
      if (q.status !== "active") continue;
      let hit = false;
      for (const o of q.objectives) {
        if (o.type === "reach" && o.progress < o.amount && Math.hypot(p.x - o.x, p.y - o.y) <= (o.r || 100)) {
          o.progress = o.amount; hit = true;
        }
      }
      if (hit) { changed = true; this.checkComplete(q); }
    }
    return changed;
  }

  spawnWorldQuest() {
    const used = new Set([...this.quests.values()].filter(q => q.type === "world").map(q => q.zone));
    const free = Object.keys(ZONES).filter(z => !used.has(z));
    const zoneKey = MathEngine.permutation(free.length ? free : Object.keys(ZONES))[0];
    const point = randomPointInZone(zoneKey);
    const template = MathEngine.permutation(WORLD_TEMPLATES)[0];
    const def = template.build({ id: `world_${++this.worldSeq}`, zoneKey, zone: ZONES[zoneKey], level: this.game.player.level, point });
    const q = new Quest(def);
    q.status = "available";
    this.quests.set(q.id, q);
    if (def.spawn) this.game.spawnQuestResources(point.x, point.y, def.spawn.resource, def.spawn.count);
  }

  // ---------- data for the views ----------
  npcLabel(key) {
    if (key === "Trainer") return this.game.npcs.find(n => n.questKey === "Trainer")?.name || "your class trainer";
    return key;
  }

  introFor(npc) {
    return NPC_INTRO[npc.questKey || npc.name] || NPC_INTRO.default;
  }

  rewardText(q) {
    const r = q.rewards, out = [];
    if (r.gold) out.push(`🪙 ${r.gold}`);
    if (r.exp) out.push(`⭐ ${r.exp} EXP`);
    if (r.potions) out.push(`🧪 ×${r.potions}`);
    if (r.stats) out.push(Object.entries(r.stats).map(([k, v]) => `+${v} ${STAT_LABELS[k]}`).join(", "));
    return out.join("  ·  ");
  }

  describe(q) {
    const type = QUEST_TYPES[q.type], zone = q.zone ? ZONES[q.zone] : null;
    const statusText = {
      active: "In progress", ready: `Return to ${this.npcLabel(q.turnIn)} to turn in`,
      available: q.type === "world" ? "Enter the zone to begin" : `Offered by ${this.npcLabel(q.giver)}`,
      cooldown: "On cooldown", completed: "Completed"
    }[q.status] || "";
    let timeLeft = "";
    if (q.type === "world") timeLeft = formatTime(q.timeLeft);
    else if (q.status === "cooldown") timeLeft = formatTime(q.readyAt - this.game.frame);
    return {
      id: q.id, type: q.type, typeLabel: type.label, color: type.color, icon: type.icon,
      title: q.title, description: q.description, status: q.status, statusText,
      turnIn: this.npcLabel(q.turnIn), ready: q.status === "ready",
      zoneName: zone ? `${zone.name} · ${zone.risk}` : "", zoneColor: zone?.color || "",
      timeLeft, rewards: this.rewardText(q),
      objectives: q.objectives.map(o => ({ label: o.label, progress: o.progress, amount: o.amount, done: o.progress >= o.amount })),
      canAbandon: q.type !== "world" && (q.status === "active" || q.status === "ready")
    };
  }

  // What an NPC can offer right now: turn-ins, new quests, and quests still in progress.
  dialogueFor(key) {
    const pick = fn => this.sorted([...this.quests.values()].filter(q => q.type !== "world" && fn(q))).map(q => this.describe(q));
    return {
      ready: pick(q => q.status === "ready" && q.turnIn === key),
      offers: pick(q => q.status === "available" && q.giver === key),
      progress: pick(q => q.status === "active" && (q.turnIn === key || q.giver === key))
    };
  }

  // tab: active | main | side | npc | world | class | done
  getJournal(tab) {
    const all = [...this.quests.values()];
    let list;
    if (tab === "active") list = all.filter(q => q.status === "active" || q.status === "ready");
    else if (tab === "done") list = all.filter(q => q.status === "completed");
    else list = all.filter(q => q.type === tab && q.status !== "locked" && q.status !== "completed");
    const rank = { ready: 0, active: 1, available: 2, cooldown: 3 };
    list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (rank[a.status] ?? 4) - (rank[b.status] ?? 4));
    return list.map(q => this.describe(q));
  }

  getTracker() {
    return this.sorted(this.activeQuests()).slice(0, 6).map(q => this.describe(q));
  }

  getTimers() {
    const out = {};
    for (const q of this.quests.values()) {
      if (q.type === "world") out[q.id] = formatTime(q.timeLeft);
      else if (q.status === "cooldown") out[q.id] = formatTime(q.readyAt - this.game.frame);
    }
    return out;
  }

  // Quest pins for the 3D-ish world beacons and the world map.
  getMapMarkers() {
    if (this.mapCache) return this.mapCache;
    const out = [];
    for (const q of this.quests.values()) {
      const color = QUEST_TYPES[q.type].color;
      if (q.type === "world") {
        if (q.marker) out.push({ x: q.marker.x, y: q.marker.y, color, label: q.title, active: q.status === "active" });
        continue;
      }
      if (q.status !== "active") continue;
      for (const o of q.objectives) {
        if (o.type === "reach" && o.progress < o.amount) out.push({ x: o.x, y: o.y, color, label: q.title, active: true });
      }
    }
    return (this.mapCache = out);
  }

  // Nearest tracked objective, used for the on-screen quest arrow.
  getGuide(px, py) {
    return this.getMapMarkers().filter(m => m.active)
      .sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py))[0] || null;
  }
}
