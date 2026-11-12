export class Monster {
  constructor(x, y, level = 1, random = Math.random) {
    this.x = x; this.y = y; this.radius = 15;
    this.maxHp = 35 + level * 7; this.hp = this.maxHp;
    this.speed = 0.45 + random() * 0.3;
    this.kind = random() < 0.15 ? "Goblin" : "Slime";
    this.color = this.kind === "Goblin" ? "#a78bfa" : "#7ddc78";
    this.attackPattern = null;
    this.hitCooldown = 0;
  }
}