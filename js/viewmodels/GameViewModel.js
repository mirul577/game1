import { Player } from "../models/Player.js";
import { Monster } from "../models/Monster.js";
import { NPC } from "../models/NPC.js";
import { MathEngine } from "../models/MathEngine.js";
import { BotNPC } from "../models/BotNPC.js";
import { Kingdom } from "../models/Kingdom.js";
import { ZONES } from "../models/Zone.js";
import { QuestViewModel } from "./QuestViewModel.js";

export class GameViewModel {
  constructor(view) {
    this.view = view;
    this.player = null;
    this.monsters = [];
    this.npcs = [
      new NPC(145, 160, "Mira", "guide", "#4dd0e1"),
      new NPC(650, 165, "Borin", "merchant", "#fbbf24"),
      new NPC(405, 95, "Elder", "elder", "#c084fc")
    ];
    this.particles = [];
    this.keys = {};
    this.running = false;
    this.frame = 0;
    this.lastAttack = 0;
    this.questRewardClaimed = false;
    this.worldSize = 6000;
    this.resources = [];
    this.structures = [];
    this.inventory = { wood: 0, stone: 0, berries: 0 };
    this.camera = { x: 0, y: 0 };
    this.botNPCs = [];
    this.kingdom = null;
    this.rivalKingdom = new Kingdom("Ironfang Dominion", 4750, 4300, false);
    this.war = { active: false, timer: 0, enemyUnits: [], message: "No war declared" };
    this.survival = { hunger: 100, thirst: 100 };
    this.quests = new QuestViewModel(this);
    this.warWins = 0;
    this.dialogueNpc = null;
    this.lastQuestVersion = -1;
    this.onQuestUpdate = null;
  }

  start(name, characterClass) {
    this.player = new Player(name, characterClass);
    this.player.x = 3000; this.player.y = 3000;
    this.npcs = [
      new NPC(2940, 2920, "Mira", "guide", "#4dd0e1"),
      new NPC(3100, 2920, "Borin", "merchant", "#fbbf24"),
      new NPC(3020, 2835, "Elder", "elder", "#c084fc"),
      this.createTrainer(characterClass)
    ];
    this.monsters = Array.from({ length: 12 }, () => this.createMonster());
    this.resources = Array.from({ length: 150 }, (_, i) => this.createResource(i));
    this.botNPCs = this.createVillageBots();
    this.kingdom = null;
    this.rivalKingdom = new Kingdom("Ironfang Dominion", 4750, 4300, false);
    this.war = { active: false, timer: 0, enemyUnits: [], message: "No war declared" };
    this.survival = { hunger: 100, thirst: 100 };
    this.warWins = 0;
    this.dialogueNpc = null;
    this.lastQuestVersion = -1;
    this.quests.init();
    this.running = true;
    this.view.log(`Welcome ${name} the ${characterClass}! Speak to Mira (look for the ❗ marker) to begin. Press J for your Quest Journal.`);
    this.refresh();
    this.loop();
  }

  createMonster() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 280 + Math.random() * 1250;
    const x = Math.max(50, Math.min(this.worldSize - 50, this.player.x + Math.cos(angle) * radius));
    const y = Math.max(50, Math.min(this.worldSize - 50, this.player.y + Math.sin(angle) * radius));
    const zoneKey = this.getBiome(x, y);
    const monster = new Monster(x, y, (this.player?.level || 1) + ZONES[zoneKey].levelBonus);
    monster.zone = zoneKey;
    monster.attackPattern = MathEngine.permutation([0, 1, 2]);
    return monster;
  }

  createResource(index = 0) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 100 + Math.random() * 2700;
    const x = Math.max(70, Math.min(this.worldSize - 70, 3000 + Math.cos(angle) * radius));
    const y = Math.max(70, Math.min(this.worldSize - 70, 3000 + Math.sin(angle) * radius));
    const roll = Math.random();
    const type = roll < 0.42 ? "tree" : roll < 0.78 ? "rock" : "berry";
    return { id: index, x, y, type, amount: type === "tree" ? 2 : type === "rock" ? 2 : 3, collected: false };
  }

  createVillageBots() {
    const roles = [
      ["Tomas", "Farmer"], ["Elara", "Healer"], ["Brann", "Blacksmith"],
      ["Nessa", "Merchant"], ["Rurik", "Guard"], ["Sela", "Guard"],
      ["Milo", "Fisher"], ["Anwen", "Cook"], ["Darin", "Builder"],
      ["Lyra", "Scout"], ["Oren", "Farmer"], ["Pella", "Villager"]
    ];
    return roles.map(([name, role], i) => new BotNPC(
      name, role, 2800 + (i % 4) * 95, 2780 + Math.floor(i / 4) * 90
    ));
  }

  createKingdom(name) {
    if (this.kingdom) return this.view.toast("You already founded a kingdom.");
    if (this.player.gold < 150 || this.inventory.wood < 35 || this.inventory.stone < 25) {
      return this.view.toast("Founding costs 150 gold, 35 wood and 25 stone.");
    }
    this.player.gold -= 150;
    this.inventory.wood -= 35;
    this.inventory.stone -= 25;
    this.kingdom = new Kingdom((name || "New Kingdom").trim().slice(0, 22) || "New Kingdom",
      this.player.x + 100, this.player.y + 70, true);
    this.kingdom.wood = 0; this.kingdom.stone = 0; this.kingdom.gold = 0;
    this.structures.push({ x: this.kingdom.x, y: this.kingdom.y, type: "keep", kingdom: true });
    this.view.log(`You founded ${this.kingdom.name}! You are its ruler. Recruit guards and prepare your settlement.`);
    this.view.toast("Kingdom founded!");
    this.quests.notify("kingdom", { value: 1 });
    this.refresh();
  }

  recruitGuard() {
    if (!this.kingdom) return this.view.toast("Found a kingdom first.");
    if (this.player.gold < 45 || this.inventory.wood < 3) return this.view.toast("Recruitment costs 45 gold and 3 wood.");
    this.player.gold -= 45; this.inventory.wood -= 3;
    const guard = new BotNPC(`Royal Guard ${this.kingdom.guards.length + 1}`, "Guard",
      this.kingdom.x + (Math.random() - .5) * 100, this.kingdom.y + (Math.random() - .5) * 100, "player");
    this.kingdom.guards.push(guard);
    this.view.log(`${guard.name} joined your kingdom.`);
    this.quests.notify("guards", { value: this.kingdom.guards.length });
    this.refresh();
  }

  declareWar() {
    if (!this.kingdom) return this.view.toast("You must found a kingdom before declaring war.");
    if (this.war.active) return this.view.toast("Your kingdom is already at war!");
    if (this.kingdom.guards.length < 2) return this.view.toast("Recruit at least 2 royal guards before war.");
    this.war.active = true;
    this.war.timer = 0;
    this.kingdom.isAtWar = true;
    this.rivalKingdom.isAtWar = true;
    this.war.message = "WAR: Ironfang Dominion";
    this.war.enemyUnits = Array.from({ length: 6 }, (_, i) => new BotNPC(
      `Ironfang Raider ${i + 1}`, "Guard",
      this.rivalKingdom.x + (Math.random() - .5) * 180,
      this.rivalKingdom.y + (Math.random() - .5) * 180, "enemy"
    ));
    this.view.log(`WAR DECLARED! The Ironfang Dominion is marching toward ${this.kingdom.name}. Defend your keep!`);
    this.view.toast("Your kingdom is at war!");
    this.refresh();
  }

  updateBotAI() {
    const allBots = [...this.botNPCs, ...(this.kingdom?.guards || []), ...this.war.enemyUnits];
    for (const bot of allBots) {
      if (bot.faction === "enemy" && this.war.active && this.kingdom) {
        const dx = this.kingdom.x - bot.x, dy = this.kingdom.y - bot.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 34) { bot.x += dx / d * 0.55; bot.y += dy / d * 0.55; }
        else if (this.frame % 45 === 0) this.kingdom.fortHp = Math.max(0, this.kingdom.fortHp - 8);
      } else if (bot.faction === "player" && this.war.active) {
        const enemy = this.war.enemyUnits
          .map(unit => ({ unit, d: Math.hypot(unit.x - bot.x, unit.y - bot.y) }))
          .filter(item => item.d < 180).sort((a, b) => a.d - b.d)[0];
        if (enemy) {
          if (enemy.d > 28) {
            bot.x += (enemy.unit.x - bot.x) / enemy.d * 0.42;
            bot.y += (enemy.unit.y - bot.y) / enemy.d * 0.42;
          } else if (bot.attackCooldown <= 0) {
            enemy.unit.hp -= 5;
            bot.attackCooldown = 45;
            if (enemy.unit.hp <= 0) {
              this.war.enemyUnits = this.war.enemyUnits.filter(unit => unit !== enemy.unit);
              this.view.log(`${bot.name} defeated ${enemy.unit.name}.`);
            }
          }
        }
        if (bot.attackCooldown > 0) bot.attackCooldown--;
      } else {
        bot.wanderTimer--;
        if (bot.wanderTimer <= 0) {
          bot.direction = Math.random() * Math.PI * 2;
          bot.wanderTimer = 90 + Math.floor(Math.random() * 160);
        }
        const speed = bot.role === "Guard" ? 0.22 : 0.12;
        bot.x += Math.cos(bot.direction) * speed;
        bot.y += Math.sin(bot.direction) * speed;
        if (Math.hypot(bot.x - bot.homeX, bot.y - bot.homeY) > 90) bot.direction = Math.atan2(bot.homeY - bot.y, bot.homeX - bot.x);
      }
    }
    if (this.war.active) {
      this.war.timer++;
      if (this.war.enemyUnits.length === 0) {
        this.war.active = false; this.kingdom.isAtWar = false; this.rivalKingdom.isAtWar = false;
        this.kingdom.gold += 100; this.player.gold += 100;
        this.war.message = "Victory! Ironfang retreated";
        this.view.log("VICTORY! The Ironfang raiders were defeated. Your kingdom receives 100 gold.");
        this.warWins++;
        this.quests.notify("warWon", { value: 1 });
      } else if (this.kingdom.fortHp <= 0) {
        this.war.active = false; this.kingdom.isAtWar = false;
        this.war.message = "Keep captured — defeat";
        this.view.log("Your keep has fallen. Rebuild its defences before declaring another war.");
      }
    }
  }

  feed() {
    if (this.inventory.berries < 2) return this.view.toast("You need 2 berries to eat.");
    this.inventory.berries -= 2;
    this.survival.hunger = Math.min(100, this.survival.hunger + 35);
    this.view.log("You ate berries. Hunger restored.");
    this.quests.notify("eat");
    this.refresh();
  }

  drink() {
    this.survival.thirst = Math.min(100, this.survival.thirst + 35);
    this.view.toast("You drank from your canteen.");
    this.quests.notify("drink");
    this.refresh();
  }

  getBiome(x, y) {
    // Broad coordinate regions create a deterministic world with distinct zones.
    const nx = x / 6000, ny = y / 6000;
    if (nx < 0.22) return "desert";
    if (nx > 0.78) return "snow";
    if (ny < 0.22) return "highlands";
    if (ny > 0.78) return "swamp";
    return "forest";
  }

  collectOrInteract() {
    const p = this.player;
    const resource = this.resources
      .filter(r => !r.collected)
      .map(r => ({ resource: r, distance: Math.hypot(r.x - p.x, r.y - p.y) }))
      .filter(x => x.distance < 62)
      .sort((a, b) => a.distance - b.distance)[0]?.resource;
    if (resource) {
      resource.collected = true;
      this.inventory[resource.type === "tree" ? "wood" : resource.type === "rock" ? "stone" : "berries"] += resource.amount;
      this.view.log(`Gathered ${resource.amount} ${resource.type === "tree" ? "wood" : resource.type === "rock" ? "stone" : "berries"}.`);
      this.quests.notify("gather", {
        target: resource.type === "tree" ? "wood" : resource.type === "rock" ? "stone" : "berries",
        amount: resource.amount, zone: this.getBiome(resource.x, resource.y)
      });
      this.refresh();
      return;
    }
    this.interact();
  }

  craft(item) {
    const costs = {
      potion: { wood: 0, stone: 0, berries: 3 },
      sword: { wood: 4, stone: 5, berries: 0 },
      camp: { wood: 12, stone: 8, berries: 0 }
    };
    const cost = costs[item], inv = this.inventory;
    if (!cost) return;
    for (const key of Object.keys(cost)) if (inv[key] < cost[key]) return this.view.toast("Not enough resources!");
    for (const key of Object.keys(cost)) inv[key] -= cost[key];
    if (item === "potion") this.player.potions++;
    if (item === "sword") { this.player.attack += 8; this.player.weapon = "Crafted Forest Blade"; }
    if (item === "camp") {
      this.structures.push({ x: this.player.x + 42, y: this.player.y + 18, type: "camp" });
    }
    this.view.log(`Crafted ${item === "camp" ? "a camp shelter" : item}.`);
    this.quests.notify("craft", { target: item });
    this.refresh();
  }

  move() {
    const p = this.player;
    let dx = 0, dy = 0;
    if (this.keys.w || this.keys.arrowup) dy--;
    if (this.keys.s || this.keys.arrowdown) dy++;
    if (this.keys.a || this.keys.arrowleft) dx--;
    if (this.keys.d || this.keys.arrowright) dx++;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    p.x = Math.max(24, Math.min(this.worldSize - 24, p.x + dx * p.speed));
    p.y = Math.max(24, Math.min(this.worldSize - 24, p.y + dy * p.speed));
  }

  attack() {
    if (!this.player || Date.now() - this.lastAttack < 420) return;
    this.lastAttack = Date.now();
    const p = this.player;
    let target = null, best = Infinity;
    const targets = [...this.monsters, ...this.war.enemyUnits];
    for (const monster of targets) {
      const d = MathEngine.distance(p.x, p.y, monster.x, monster.y);
      if (d < 85 && d < best) { best = d; target = monster; }
    }
    if (!target) return this.view.toast("No enemy in range. Move closer!");
    p.combo++;
    const slope = MathEngine.gradient(p.x, p.y, target.x, target.y);
    const gradientBonus = Math.min(5, Math.floor(Math.abs(slope)));
    let damage = p.attack + gradientBonus;
    const criticalChance = p.characterClass === "Ranger" ? 0.28 : 0.15;
    const critical = MathEngine.probability(criticalChance);
    if (critical) { damage *= 2; this.quests.notify("crit"); }
    target.hp -= damage;
    this.particles.push({ x: target.x, y: target.y - 20, text: `${critical ? "CRIT! " : ""}-${damage}`, color: critical ? "#ffd166" : "#fff", life: 35 });

    const fibIndex = [1, 2, 3, 5, 8, 13].indexOf(p.combo);
    if (fibIndex >= 0) {
      const bonus = MathEngine.fibonacci(fibIndex + 2);
      p.gold += bonus;
      this.view.toast(`Fibonacci combo! +${bonus} gold`);
    }
    this.view.log(`You hit ${target.kind || target.name} for ${damage} damage${critical ? " (critical hit)" : ""}.`);
    if (target.hp <= 0) {
      this.defeatTarget(target);
    }
    this.refresh();
  }

  castSkill() {
    if (!this.player) return;
    const p = this.player;
    if (!p.spendMp(20)) return this.view.toast("Not enough MP. Wait for mana regeneration.");
    let target = null, best = Infinity;
    for (const monster of [...this.monsters, ...this.war.enemyUnits]) {
      const d = MathEngine.distance(p.x, p.y, monster.x, monster.y);
      if (d < 145 && d < best) { best = d; target = monster; }
    }
    if (!target) {
      p.restoreMp(20);
      return this.view.toast("No target in skill range.");
    }
    // Gradient-derived scaling is calculated internally as part of the skill damage.
    const slope = Math.abs(MathEngine.gradient(p.x, p.y, target.x, target.y));
    const damage = Math.floor(24 + Math.min(12, slope * 3) + p.level * 2);
    target.hp -= damage;
    this.particles.push({ x: target.x, y: target.y - 28, text: `ARCANE -${damage}`, color: "#67e8f9", life: 45 });
    this.view.log(`Arcane Strike dealt ${damage} magic damage.`);
    this.quests.notify("cast");
    if (target.hp <= 0) {
      this.defeatTarget(target);
    }
    this.refresh();
  }

  defeatMonster(monster) {
    this.monsters = this.monsters.filter(m => m !== monster);
    const p = this.player;
    p.kills++;
    const zone = ZONES[monster.zone] || ZONES.forest; // riskier zones pay more
    let drop = Math.round((7 + Math.floor(Math.random() * 8) + p.level * 2) * zone.rewardMult);
    if (MathEngine.probability(0.18)) {
      p.potions++;
      this.view.log("Rare drop! You found a Health Potion.");
    }
    p.gold += drop;
    const levels = p.addExperience(Math.round((20 + p.level * 4) * zone.rewardMult));
    this.view.log(`${monster.kind} defeated. +${drop} gold and EXP.`);
    if (levels) this.view.log(`Level up! You reached level ${p.level}.`);
    this.quests.notify("kill", { target: monster.kind, zone: monster.zone });
    if (levels) this.quests.notify("level", { value: p.level });
    this.monsters.push(this.createMonster());
    this.refresh();
  }

  interact() {
    const p = this.player;
    const npc = [...this.npcs, ...this.botNPCs, ...(this.kingdom?.guards || [])]
      .map(n => ({ npc: n, distance: Math.hypot(n.x - p.x, n.y - p.y) }))
      .filter(x => x.distance < 55)
      .sort((a, b) => a.distance - b.distance)[0]?.npc;
    if (!npc) return this.view.toast("Move closer to an NPC.");
    this.quests.notify("talk", { target: npc.name });
    this.npcService(npc);
    this.openDialogue(npc);
    this.refresh();
  }

  // Flavour lines and small services by role (quests are handled separately by openDialogue).
  npcService(npc) {
    const p = this.player;
    if (npc.questKey === "Trainer") {
      this.view.log(`${npc.name}: Every ${p.characterClass} walks a path of trials. Ask me about them.`);
    } else if (npc.role === "Farmer" || npc.role === "Fisher" || npc.role === "Cook") {
      this.view.log(`${npc.name}: We keep the village supplied. Gather berries and build your own settlement.`);
      this.survival.hunger = Math.min(100, this.survival.hunger + 5);
    } else if (npc.role === "Healer") {
      p.heal(25); p.restoreMp(20);
      this.view.log(`${npc.name}: A healing blessing for you. +25 HP, +20 MP.`);
    } else if (npc.role === "Blacksmith") {
      this.view.log(`${npc.name}: Bring wood and stone to craft better equipment.`);
    } else if (npc.role === "Merchant") {
      this.view.log(`${npc.name}: Trade is the lifeblood of a kingdom. Check the store.`);
    } else if (npc.role === "Guard") {
      this.view.log(`${npc.name}: Keep your kingdom safe. Recruit soldiers before declaring war.`);
    } else if (npc.role === "guide") {
      this.view.log("Mira: Welcome to Mathoria! Quests marked with ❗ are waiting for you.");
    } else if (npc.role === "merchant") {
      this.view.toast("Visit the Adventurer Store panel to buy items.");
    } else if (npc.role === "elder") {
      p.restoreMp(25);
      this.view.log("Elder: The path ahead is dangerous. Take a mana blessing (+25 MP).");
    } else {
      this.view.log(`${npc.name}: Safe travels, ${p.name}.`);
    }
  }

  // WoW-style quest dialogue: turn-ins first, then new offers, then quests in progress.
  openDialogue(npc) {
    const key = npc.questKey || npc.name;
    const { ready, offers, progress } = this.quests.dialogueFor(key);
    if (!ready.length && !offers.length && !progress.length) return this.closeDialogue();
    this.dialogueNpc = npc;
    const entries = [
      ...ready.map(q => ({ ...q, action: "Complete", run: () => { this.quests.turnIn(q.id); this.openDialogue(npc); } })),
      ...offers.map(q => ({ ...q, action: "Accept", run: () => { this.quests.accept(q.id); this.openDialogue(npc); } })),
      ...progress.map(q => ({ ...q, action: null }))
    ];
    this.view.showDialogue({ name: npc.name, role: npc.role, text: this.quests.introFor(npc), entries });
  }

  closeDialogue() {
    this.dialogueNpc = null;
    this.view.hideDialogue();
  }

  createTrainer(characterClass) {
    const trainers = { Knight: ["Sir Aldric", "#93c5fd"], Mage: ["Archmage Lyris", "#d8b4fe"], Ranger: ["Warden Kael", "#86efac"] };
    const [name, color] = trainers[characterClass] || trainers.Knight;
    return new NPC(3185, 3015, name, `${characterClass} Trainer`, color, "Trainer");
  }

  zoneAt(x, y) { return ZONES[this.getBiome(x, y)]; }

  defeatTarget(target) {
    if (this.war.enemyUnits.includes(target)) {
      this.war.enemyUnits = this.war.enemyUnits.filter(unit => unit !== target);
      this.player.gold += 8;
      this.view.log(`${target.name} defeated. +8 gold.`);
      this.quests.notify("kill", { target: "Raider" });
    } else this.defeatMonster(target);
  }

  // World quests drop fresh resource nodes around their marker so gather bounties are always completable.
  spawnQuestResources(x, y, kind, count) {
    const type = kind === "wood" ? "tree" : kind === "stone" ? "rock" : "berry";
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, r = 60 + Math.random() * 260;
      this.resources.push({
        id: this.resources.length, type, collected: false, quest: true, amount: type === "berry" ? 3 : 2,
        x: Math.max(70, Math.min(this.worldSize - 70, x + Math.cos(angle) * r)),
        y: Math.max(70, Math.min(this.worldSize - 70, y + Math.sin(angle) * r))
      });
    }
  }

  // Keep monsters near the player so kill quests work in every zone.
  rebalanceMonsters() {
    const p = this.player;
    this.monsters = this.monsters.map(m => Math.hypot(m.x - p.x, m.y - p.y) > 2200 ? this.createMonster() : m);
  }

  buy(itemKey) {
    const p = this.player;
    const prices = { potion: 12, sword: 65, shield: 45 };
    if (p.gold < prices[itemKey]) return this.view.toast("Not enough gold!");
    if (itemKey === "sword" && p.weapon === "Iron Sword") return this.view.toast("You already own this sword.");
    if (itemKey === "shield" && p.hasShield) return this.view.toast("You already own a shield.");
    p.gold -= prices[itemKey];
    if (itemKey === "potion") p.potions++;
    if (itemKey === "sword") { p.weapon = "Iron Sword"; p.attack += 12; }
    if (itemKey === "shield") p.hasShield = true;
    this.view.log(`Purchased ${itemKey}.`);
    this.refresh();
  }

  usePotion() {
    const p = this.player;
    if (!p.potions) return this.view.toast("You have no potions.");
    if (p.hp === p.maxHp) return this.view.toast("HP is already full.");
    p.potions--; p.heal(35);
    this.quests.notify("potion");
    this.refresh();
  }

  updateMonsters() {
    const p = this.player;
    for (const m of this.monsters) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d > 22 && d < 210) { m.x += (p.x - m.x) / d * m.speed; m.y += (p.y - m.y) / d * m.speed; }
      else if (d <= 22 && m.hitCooldown <= 0) {
        const damage = p.takeDamage(5 + Math.floor(Math.random() * 6));
        m.hitCooldown = 55;
        this.particles.push({ x: p.x, y: p.y - 20, text: `-${damage}`, color: "#fb7185", life: 35 });
        this.view.log(`${m.kind} hit you for ${damage} damage.`);
        if (p.hp <= 0) {
          p.hp = p.maxHp; p.gold = Math.max(0, p.gold - 10); p.x = 3000; p.y = 3000;
          this.view.log("You were defeated and revived in the village. Lost 10 gold.");
        }
      }
      if (m.hitCooldown > 0) m.hitCooldown--;
    }
  }

  loop() {
    if (!this.running) return;
    this.frame++;
    this.move();
    this.quests.tick(this.frame);
    if (this.frame % 12 === 0) this.player.restoreMp(1);
    if (this.frame % 600 === 0) {
      this.survival.hunger = Math.max(0, this.survival.hunger - 2);
      this.survival.thirst = Math.max(0, this.survival.thirst - 3);
      if (this.survival.hunger === 0 || this.survival.thirst === 0) {
        this.player.hp = Math.max(1, this.player.hp - 3);
        this.view.log("Survival warning: hunger or thirst is empty. Find food and water.");
      }
    }
    if (this.frame % 3 === 0) this.updateBotAI();
    this.updateMonsters();
    if (this.frame % 120 === 0) this.rebalanceMonsters();
    if (this.dialogueNpc && this.frame % 15 === 0 &&
        Math.hypot(this.dialogueNpc.x - this.player.x, this.dialogueNpc.y - this.player.y) > 120) this.closeDialogue();
    for (const particle of this.particles) { particle.y -= 0.6; particle.life--; }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.frame % 800 === 0 && this.monsters.length < 16) this.monsters.push(this.createMonster());
    if (this.frame % 1800 === 0 && this.resources.filter(r => !r.collected).length < 80) {
      this.resources.push(this.createResource(this.resources.length));
    }
    this.camera.x = Math.max(0, Math.min(this.worldSize - 800, this.player.x - 400));
    this.camera.y = Math.max(0, Math.min(this.worldSize - 520, this.player.y - 260));
    this.view.render(this);
    this.refresh();
    requestAnimationFrame(() => this.loop());
  }

  refresh() {
    if (!this.player) return;
    this.view.updateHUD(this.player, this.inventory, this.getBiome(this.player.x, this.player.y), this.survival, this.kingdom, this.war);
    if (this.lastQuestVersion !== this.quests.version) {
      this.lastQuestVersion = this.quests.version;
      this.view.renderTracker(this.quests.getTracker());
      this.onQuestUpdate?.();
    }
    if (this.frame % 30 === 0) this.view.updateTimers(this.quests.getTimers());
    const mapModal = document.getElementById("worldMapModal");
    if (mapModal && !mapModal.classList.contains("hidden")) this.view.drawWorldMap(this);
  }
}
