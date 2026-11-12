export class NPC {
  constructor(x, y, name, role, color, questKey = null) {
    Object.assign(this, { x, y, name, role, color, radius: 12, questKey });
  }
}