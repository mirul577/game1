// Albion-style zone risk tiers. Higher tiers = tougher monsters but better rewards.
export const ZONES = {
  forest:    { name: "Verdant Forest",       short: "Forest",    risk: "Blue Zone",   tier: 1, color: "#60a5fa", rewardMult: 1,   levelBonus: 0,
               bounds: { x0: 1500, x1: 4500, y0: 1500, y1: 4500 } },
  highlands: { name: "Stormridge Highlands", short: "Highlands", risk: "Yellow Zone", tier: 2, color: "#facc15", rewardMult: 1.3, levelBonus: 2,
               bounds: { x0: 1500, x1: 4500, y0: 300,  y1: 1200 } },
  desert:    { name: "Sunscar Desert",       short: "Desert",    risk: "Yellow Zone", tier: 2, color: "#facc15", rewardMult: 1.3, levelBonus: 2,
               bounds: { x0: 300,  x1: 1200, y0: 300,  y1: 5700 } },
  snow:      { name: "Frostfang Tundra",     short: "Tundra",    risk: "Red Zone",    tier: 3, color: "#f87171", rewardMult: 1.7, levelBonus: 4,
               bounds: { x0: 4800, x1: 5700, y0: 300,  y1: 5700 } },
  swamp:     { name: "Blackmire Swamp",      short: "Swamp",     risk: "Black Zone",  tier: 4, color: "#a8a29e", rewardMult: 2.2, levelBonus: 7,
               bounds: { x0: 1500, x1: 4500, y0: 4800, y1: 5700 } }
};

export function randomPointInZone(key, random = Math.random) {
  const b = ZONES[key].bounds;
  return { x: Math.round(b.x0 + random() * (b.x1 - b.x0)), y: Math.round(b.y0 + random() * (b.y1 - b.y0)) };
}
