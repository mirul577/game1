export class Kingdom {
  constructor(name, x, y, isPlayer = false) {
    this.name = name;
    this.x = x; this.y = y;
    this.isPlayer = isPlayer;
    this.level = 1;
    this.wood = 0; this.stone = 0; this.gold = 0;
    this.food = 25;
    this.guards = [];
    this.warScore = 0;
    this.fortHp = 300;
    this.maxFortHp = 300;
    this.isAtWar = false;
  }
}
