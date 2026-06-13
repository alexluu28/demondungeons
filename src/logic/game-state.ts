import { state } from '../state'; // Adjust this path to point to your global state file

export class GameState {
  /**
   * Processes a potion healing purchase against the unified global wallet.
   */
  public static buyHeal(cost: number, healAmount: number): boolean {
    // 🌟 FIX: Validate directly against the global state balance!
    if (state.totalCoins < cost) {
      console.warn(
        `[Shop] Purchase failed. Need ${cost}G, but wallet only has ${state.totalCoins}G.`,
      );
      return false;
    }

    // Deduct currency from the true global profile state
    state.totalCoins -= cost;

    // Apply the healing to your active party members
    state.party.forEach((demon) => {
      // Prevent over-healing beyond max HP parameters
      demon.hp = Math.min(demon.maxHp, demon.hp + healAmount);
    });

    // Commit changes to local storage autosaves instantly
    state.saveGame();
    return true;
  }

  /**
   * Processes a Life Crystal max HP upgrade against the unified global wallet.
   */
  public static buyMaxHP(cost: number, hpBonus: number): boolean {
    // 🌟 FIX: Validate directly against the global state balance!
    if (state.totalCoins < cost) {
      console.warn(
        `[Shop] Purchase failed. Need ${cost}G, but wallet only has ${state.totalCoins}G.`,
      );
      return false;
    }

    // Deduct currency
    state.totalCoins -= cost;

    // Upgrade profile limits
    state.party.forEach((demon) => {
      demon.maxHp += hpBonus;
      demon.hp = demon.maxHp; // Full vitality refresh award
    });

    state.saveGame();
    return true;
  }
}
