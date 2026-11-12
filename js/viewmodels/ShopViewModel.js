// Shop commands are delegated to GameViewModel so game state has one owner.
export class ShopViewModel {
  constructor(gameViewModel) { this.game = gameViewModel; }
  purchase(itemKey) { this.game.buy(itemKey); }
}