export const QUEST_TYPES = {
  main:  { label: "Main Quest",      color: "#ffd166", icon: "👑" },
  side:  { label: "Side Quest",      color: "#7dd3fc", icon: "🧭" },
  npc:   { label: "NPC Quest",       color: "#86efac", icon: "💬" },
  world: { label: "World Quest",     color: "#f0abfc", icon: "🌍" },
  class: { label: "Character Quest", color: "#fb923c", icon: "🎓" }
};

// status: locked -> available -> active -> ready (objectives done, awaiting turn-in) -> completed | cooldown (repeatable)
export class Quest {
  constructor(def) {
    Object.assign(this, {
      id: def.id, type: def.type, title: def.title, description: def.description || "",
      giver: def.giver || null,
      turnIn: def.turnIn || def.giver || "auto",   // "auto" = completes instantly (world quests)
      zone: def.zone || null, marker: def.marker || null,
      minLevel: def.minLevel || 0, requires: def.requires || null, classOnly: def.classOnly || null,
      repeatable: !!def.repeatable, cooldown: def.cooldown || 0, readyAt: 0,
      rewards: def.rewards || {},
      timeLeft: def.expiresIn ?? null,
      status: "locked"
    });
    this.objectives = def.objectives.map(o => ({ ...o, progress: 0 }));
  }
  get complete() { return this.objectives.every(o => o.progress >= o.amount); }
  reset() { for (const o of this.objectives) o.progress = 0; }
}
