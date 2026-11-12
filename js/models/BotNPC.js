export class BotNPC {
  constructor(name, role, x, y, faction = "neutral") {
    Object.assign(this, {
      name, role, x, y, faction, radius: 11,
      color: role === "Guard" ? "#6f91d8" : role === "Farmer" ? "#75b96b" :
        role === "Blacksmith" ? "#d38b54" : role === "Merchant" ? "#e6bd55" : "#b28bd8",
      homeX: x, homeY: y, direction: Math.random() * Math.PI * 2,
      mood: "working", wanderTimer: 0, hp: role === "Guard" ? 70 : 35,
      maxHp: role === "Guard" ? 70 : 35,
      attackCooldown: 0
    });
  }
}
