export class Player {
  constructor(name, characterClass) {
    this.name = name;
    this.characterClass = characterClass;
    this.x = 390; this.y = 270; this.radius = 13;
    this.level = 1; this.exp = 0; this.expRequired = 50;
    this.gold = 30; this.potions = 0; this.kills = 0; this.combo = 0;
    this.weapon = "Wooden Sword"; this.hasShield = false;
    const classes = {
      Knight: { maxHp: 115, attack: 13, speed: 2.7, color: "#60a5fa" },
      Mage: { maxHp: 85, attack: 19, speed: 2.7, color: "#c084fc" },
      Ranger: { maxHp: 95, attack: 14, speed: 3.3, color: "#4ade80" }
    };
    Object.assign(this, classes[characterClass] || classes.Knight);
    this.hp = this.maxHp;
    this.maxMp = characterClass === "Mage" ? 140 : characterClass === "Ranger" ? 90 : 75;
    this.mp = this.maxMp;
  }
  takeDamage(amount) {
    const damage = Math.max(1, amount - (this.hasShield ? 3 : 0));
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }
  restoreMp(amount) { this.mp = Math.min(this.maxMp, this.mp + amount); }
  spendMp(amount) {
    if (this.mp < amount) return false;
    this.mp -= amount;
    return true;
  }
  addExperience(amount) {
    this.exp += amount;
    let levels = 0;
    while (this.exp >= this.expRequired) {
      this.exp -= this.expRequired;
      this.level++;
      this.expRequired = Math.floor(this.expRequired * 1.35);
      this.maxHp += 15; this.maxMp += 12; this.attack += 3;
      this.hp = this.maxHp; this.mp = this.maxMp;
      levels++;
    }
    return levels;
  }
}