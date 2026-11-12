import { MathEngine } from "./MathEngine.js";

const obj = (type, amount, label, extra = {}) => ({ type, amount, label, ...extra });
const NPC_COOLDOWN = 90 * 60; // frames (~90 s at 60 fps)

// ---------- Authored quests: main, side, NPC and character (class) quests ----------
export const STATIC_QUESTS = [
  // MAIN STORY — "The Chronicle of Mathoria"
  { id: "main_1", type: "main", giver: "Mira", title: "Welcome to Mathoria",
    description: "Mira needs proof you can survive beyond the village. Defeat 3 monsters (Space = attack).",
    objectives: [obj("kill", 3, "Defeat monsters")], rewards: { gold: 50, exp: 35 } },
  { id: "main_2", type: "main", giver: "Elder", requires: "main_1", title: "The Elder's Warning",
    description: "The Elder senses a rival realm stirring in the east. Gather timber and stone (E near trees and rocks).",
    objectives: [obj("gather", 8, "Gather wood", { target: "wood" }), obj("gather", 6, "Gather stone", { target: "stone" })],
    rewards: { gold: 60, exp: 50, potions: 2 } },
  { id: "main_3", type: "main", giver: "Mira", requires: "main_2", title: "Forge of Heroes",
    description: "Turn your resources into gear: a Forest Blade (X) and two Health Potions (C, needs berries).",
    objectives: [obj("craft", 1, "Craft a Forest Blade", { target: "sword" }), obj("craft", 2, "Craft Health Potions", { target: "potion" })],
    rewards: { gold: 80, exp: 70 } },
  { id: "main_4", type: "main", giver: "Elder", requires: "main_3", title: "A Crown of Your Own",
    description: "Found a kingdom of your own (K). It costs 150 gold, 35 wood and 25 stone.",
    objectives: [obj("kingdom", 1, "Found a kingdom")], rewards: { gold: 100, exp: 100 } },
  { id: "main_5", type: "main", giver: "Mira", requires: "main_4", title: "Guardians of the Keep",
    description: "A ruler needs soldiers. Recruit 2 royal guards (R).",
    objectives: [obj("guards", 2, "Recruit royal guards")], rewards: { gold: 90, exp: 120 } },
  { id: "main_6", type: "main", giver: "Elder", requires: "main_5", minLevel: 3, title: "War of the Two Crowns",
    description: "Declare war (T) and defeat the Ironfang Dominion's raiders before they topple your keep.",
    objectives: [obj("warWon", 1, "Win the war against Ironfang")], rewards: { gold: 300, exp: 400, potions: 3 } },

  // SIDE QUESTS — optional stories from named characters
  { id: "side_cartographer", type: "side", giver: "Borin", minLevel: 2, title: "Cartographer's Request",
    description: "Borin pays well for maps. Set foot in all four outer regions of Mathoria.",
    objectives: [
      obj("visit", 1, "Visit the Sunscar Desert", { target: "desert" }), obj("visit", 1, "Visit the Stormridge Highlands", { target: "highlands" }),
      obj("visit", 1, "Visit the Frostfang Tundra", { target: "snow" }), obj("visit", 1, "Visit the Blackmire Swamp", { target: "swamp" })],
    rewards: { gold: 140, exp: 100, potions: 1 } },
  { id: "side_slime", type: "side", giver: "Borin", title: "Slime Season",
    description: "Slimes are ruining Borin's trade routes. Defeat 8 of them.",
    objectives: [obj("kill", 8, "Defeat Slimes", { target: "Slime" })], rewards: { gold: 90, exp: 80 } },
  { id: "side_goblin", type: "side", giver: "Rurik", minLevel: 2, title: "Goblin Bounty",
    description: "Rurik posted a bounty on goblins (the purple ones). They are rare, so hunt widely.",
    objectives: [obj("kill", 2, "Defeat Goblins", { target: "Goblin" })], rewards: { gold: 120, exp: 90 } },
  { id: "side_survivor", type: "side", giver: "Elder", title: "Survivor's Primer",
    description: "Learn to endure the wild: eat berries (F), drink water (V) and build a camp shelter (B).",
    objectives: [obj("eat", 2, "Eat berries", { target: "any" }), obj("drink", 2, "Drink water"), obj("craft", 1, "Build a camp shelter", { target: "camp" })],
    rewards: { gold: 70, exp: 60, potions: 1 } },
  { id: "side_river", type: "side", giver: "Elder", title: "Beyond the River",
    description: "Old trade roads lie north of the river. Follow the quest arrow and reach the Northern Trail.",
    objectives: [obj("reach", 1, "Reach the Northern Trail", { x: 3150, y: 1450, r: 120 })], rewards: { gold: 90, exp: 70 } },

  // NPC QUESTS — repeatable errands from villagers
  ...[
    ["Tomas", "Berry Harvest",         "Tomas needs berries for the village stew.",        obj("gather", 6, "Gather berries", { target: "berries" }), 18, 14],
    ["Oren",  "Scarecrow Season",      "Oren needs timber for new scarecrows.",             obj("gather", 4, "Gather wood", { target: "wood" }),       16, 12],
    ["Elara", "Healer's Supplies",     "Elara is out of potions. Craft one for her.",       obj("craft", 1, "Craft a Health Potion", { target: "potion" }), 25, 18],
    ["Brann", "Ore for the Anvil",     "Brann's forge is running cold. Bring stone.",       obj("gather", 5, "Gather stone", { target: "stone" }),     22, 16],
    ["Rurik", "Patrol Duty",           "Thin out the monsters near the village.",           obj("kill", 4, "Defeat monsters"),                         30, 22],
    ["Sela",  "Perimeter Sweep",       "Sela wants the outer fields cleared.",              obj("kill", 5, "Defeat monsters"),                         36, 26],
    ["Milo",  "Thirsty Work",          "Milo asks you to test the canteen routes.",         obj("drink", 3, "Drink water"),                            12, 10],
    ["Anwen", "Cook's Supplies",       "Anwen's kitchen needs more berries.",               obj("gather", 8, "Gather berries", { target: "berries" }), 24, 18],
    ["Darin", "Timber!",               "Darin is building a new barn and needs wood.",      obj("gather", 8, "Gather wood", { target: "wood" }),       24, 18],
    ["Lyra",  "Eyes on the Highlands", "Lyra wants a first-hand report of the highlands.",  obj("visit", 1, "Visit the Stormridge Highlands", { target: "highlands" }), 30, 24],
    ["Nessa", "Caravan Escort",        "Clear the road so Nessa's caravans can pass.",      obj("kill", 6, "Defeat monsters"),                         38, 26]
  ].map(([giver, title, description, o, gold, exp]) => ({
    id: `npc_${giver.toLowerCase()}`, type: "npc", giver, title, description,
    objectives: [o], rewards: { gold, exp }, repeatable: true, cooldown: NPC_COOLDOWN
  })),
  { id: "npc_pella", type: "npc", giver: "Pella", title: "A Friend in Need",
    description: "Pella is too shy to speak to Mira herself. Go talk to Mira, then come back.",
    objectives: [obj("talk", 1, "Speak with Mira", { target: "Mira" })], rewards: { gold: 15, exp: 10 } },

  // CHARACTER QUESTS — one chain per class, given by your class trainer
  { id: "class_k1", type: "class", giver: "Trainer", classOnly: "Knight", title: "Trial of Steel",
    description: "Prove your blade. Defeat 6 monsters.", objectives: [obj("kill", 6, "Defeat monsters")],
    rewards: { gold: 40, exp: 40, stats: { maxHp: 12 } } },
  { id: "class_k2", type: "class", giver: "Trainer", classOnly: "Knight", requires: "class_k1", minLevel: 2, title: "Shield Wall",
    description: "A knight endures. Use 2 potions and gather 4 stone to reinforce your armour.",
    objectives: [obj("potion", 2, "Use Health Potions"), obj("gather", 4, "Gather stone", { target: "stone" })],
    rewards: { gold: 60, exp: 70, stats: { maxHp: 10, attack: 2 } } },
  { id: "class_k3", type: "class", giver: "Trainer", classOnly: "Knight", requires: "class_k2", minLevel: 4, title: "Champion of the Realm",
    description: "Defeat 12 monsters and scout the highlands to earn the champion's seal.",
    objectives: [obj("kill", 12, "Defeat monsters"), obj("visit", 1, "Visit the Stormridge Highlands", { target: "highlands" })],
    rewards: { gold: 150, exp: 200, stats: { maxHp: 20, attack: 3 } } },

  { id: "class_m1", type: "class", giver: "Trainer", classOnly: "Mage", title: "Spark of Insight",
    description: "Channel your power. Cast Arcane Strike (Q) 5 times on enemies.", objectives: [obj("cast", 5, "Cast Arcane Strike")],
    rewards: { gold: 40, exp: 40, stats: { maxMp: 15 } } },
  { id: "class_m2", type: "class", giver: "Trainer", classOnly: "Mage", requires: "class_m1", minLevel: 2, title: "Wellsprings of Mana",
    description: "Gather 6 berries for a mana tonic and drink 2 times from your canteen.",
    objectives: [obj("gather", 6, "Gather berries", { target: "berries" }), obj("drink", 2, "Drink water")],
    rewards: { gold: 60, exp: 70, stats: { maxMp: 20 } } },
  { id: "class_m3", type: "class", giver: "Trainer", classOnly: "Mage", requires: "class_m2", minLevel: 4, title: "Archmage's Trial",
    description: "Cast Arcane Strike 12 times and defeat 8 monsters.",
    objectives: [obj("cast", 12, "Cast Arcane Strike"), obj("kill", 8, "Defeat monsters")],
    rewards: { gold: 150, exp: 200, stats: { maxMp: 25, attack: 4 } } },

  { id: "class_r1", type: "class", giver: "Trainer", classOnly: "Ranger", title: "Hunter's Eye",
    description: "Land 4 critical hits. Rangers crit more often than any other class.", objectives: [obj("crit", 4, "Land critical hits")],
    rewards: { gold: 40, exp: 40, stats: { speed: 0.2 } } },
  { id: "class_r2", type: "class", giver: "Trainer", classOnly: "Ranger", requires: "class_r1", minLevel: 2, title: "Swift Trails",
    description: "Scout the highlands and the swamp to learn the wild trails.",
    objectives: [obj("visit", 1, "Visit the Stormridge Highlands", { target: "highlands" }), obj("visit", 1, "Visit the Blackmire Swamp", { target: "swamp" })],
    rewards: { gold: 60, exp: 70, stats: { speed: 0.2, maxHp: 8 } } },
  { id: "class_r3", type: "class", giver: "Trainer", classOnly: "Ranger", requires: "class_r2", minLevel: 4, title: "Master Tracker",
    description: "Defeat 10 monsters and land 5 critical hits.",
    objectives: [obj("kill", 10, "Defeat monsters"), obj("crit", 5, "Land critical hits")],
    rewards: { gold: 150, exp: 200, stats: { attack: 3, maxHp: 12, speed: 0.2 } } }
];

// ---------- World quests: dynamic, timed, zone-based (WoW world quests / Albion zone bounties) ----------
const WORLD_TIME = 4 * 60 * 60; // 4 minutes of frames
const worldReward = (zone, level, mult) => ({
  gold: Math.round((22 + level * 6) * zone.rewardMult * mult),
  exp: Math.round((28 + level * 8) * zone.rewardMult * mult),
  ...(zone.tier >= 3 ? { potions: zone.tier - 2 } : {})
});

export const WORLD_TEMPLATES = [
  { key: "slay", build: ({ id, zoneKey, zone, level, point }) => ({
      id, type: "world", zone: zoneKey, marker: point, expiresIn: WORLD_TIME,
      title: `Purge the ${zone.short}`,
      description: `Monsters are swarming the ${zone.name}. Defeat them inside the zone before the bounty expires.`,
      objectives: [obj("kill", Math.min(12, 4 + Math.floor(level / 2)), `Defeat monsters in the ${zone.short}`)],
      rewards: worldReward(zone, level, 1) }) },
  { key: "harvest", build: ({ id, zoneKey, zone, level, point }) => {
      const [resource, label] = MathEngine.permutation([["wood", "Timber"], ["stone", "Stone"], ["berries", "Berry"]])[0];
      const amount = Math.min(10, 6 + Math.floor(level / 4));
      return { id, type: "world", zone: zoneKey, marker: point, expiresIn: WORLD_TIME,
        title: `${zone.short} ${label} Run`,
        description: `Resource nodes have appeared near the marker in the ${zone.name}. Gather ${resource} there.`,
        objectives: [obj("gather", amount, `Gather ${resource} in the ${zone.short}`, { target: resource })],
        rewards: worldReward(zone, level, 0.9), spawn: { resource, count: Math.ceil(amount / 2) + 2 } };
    } },
  { key: "scout", build: ({ id, zoneKey, zone, level, point }) => ({
      id, type: "world", zone: zoneKey, marker: point, expiresIn: WORLD_TIME,
      title: `Scout the ${zone.short}`,
      description: `Travel to the marked point deep in the ${zone.name} and chart the area.`,
      objectives: [obj("reach", 1, `Reach the ${zone.short} outpost`, { x: point.x, y: point.y, r: 110 })],
      rewards: worldReward(zone, level, 1.2) }) }
];

export const NPC_INTRO = {
  Mira: "Welcome, traveler. Mathoria needs heroes — and you look capable.",
  Elder: "The old stones whisper of war. There is much to prepare.",
  Borin: "Coin and courage, friend — both are in short supply out here.",
  Trainer: "Every class walks a path of trials. Are you ready for yours?",
  default: "Got a moment? I could use a hand."
};
