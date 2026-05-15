// src/logic/game-state.ts
export const GameState = {
  coins: 0,
  floor: 1,
  maxHp: 100,
  currentHp: 100,
  addCoins(amount: number) {
    this.coins += amount;
  },
  buyHeal(cost: number, amount: number): boolean {
    if (this.coins >= cost) {
      this.coins -= cost;
      this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
      return true;
    }
    return false;
  },
  // NEW: Permanent Max HP Increase
  buyMaxHP(cost: number, amount: number): boolean {
    if (this.coins >= cost) {
      this.coins -= cost;
      this.maxHp += amount;
      this.currentHp += amount; // Healing by the amount increased
      return true;
    }
    return false;
  },
};
