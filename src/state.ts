export interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  skills: string[];
  weakness?: string;
  attackPower: number; // <-- Added for card upgrade scaling
  hasVampirism?: boolean; // <-- Added for rare trait modifiers
}

export class GameState {
  private static _instance: GameState;

  // Global persistent variables
  public totalCoins: number = 0;
  public currentFloor: number = 1;

  // --- NEW: Experience & Progression Tracking ---
  public currentLevel: number = 1;
  public currentXp: number = 0;
  public xpNeededForLevelUp: number = 100; // Baseline milestone value

  // Your starting party setup
  public party: PartyMember[] = [
    {
      name: 'Pixie',
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      skills: ['Zio', 'Agi'],
      weakness: 'Dark',
      attackPower: 15, // Base power
    },
    {
      name: 'JackFrost',
      hp: 45,
      maxHp: 45,
      mp: 30,
      maxMp: 45,
      skills: ['Bufu', 'Mabufu'],
      weakness: 'Fire',
      attackPower: 10, // Base power
    },
  ];

  // Guarantees only one instance of the state exists
  public static getInstance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }

  /**
   * Safe data hook to add experience points to your party run.
   * Returns true if a milestone cap is passed, indicating a Level Up event!
   */
  public gainXp(amount: number): boolean {
    this.currentXp += amount;

    if (this.currentXp >= this.xpNeededForLevelUp) {
      this.currentXp -= this.xpNeededForLevelUp;
      this.currentLevel++;

      // Exponential scaling curve (e.g., each level requires 20% more XP than the last)
      this.xpNeededForLevelUp = Math.floor(this.xpNeededForLevelUp * 1.2);
      return true; // Flag true to let DungeonScene know it's time to open the 3-card draft modal
    }

    return false;
  }
}

// Export a single constant instance to import across your project
export const state = GameState.getInstance();
