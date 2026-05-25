export interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  skills: string[];
  weakness?: string;
  attackPower: number; // Added for card upgrade scaling
  hasVampirism?: boolean; // Added for rare trait modifiers
}

export class GameState {
  private static _instance: GameState;

  // Global persistent variables
  public totalCoins: number = 0;
  public currentFloor: number = 1;

  // Experience & Progression Tracking
  public currentLevel: number = 1;
  public currentXp: number = 0;
  public xpNeededForLevelUp: number = 100; // Baseline milestone value

  // Your starting party setup
  public party: PartyMember[] = [];

  // Private constructor to enforce Singleton blueprint pattern and establish baseline state
  private constructor() {
    this.initializeDefaultState();
  }

  // Guarantees only one instance of the state exists
  public static getInstance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }

  /**
   * Sets up default values for a completely clean run.
   */
  private initializeDefaultState(): void {
    this.totalCoins = 0;
    this.currentFloor = 1;
    this.currentLevel = 1;
    this.currentXp = 0;
    this.xpNeededForLevelUp = 100;

    this.party = [
      {
        name: 'Pixie',
        hp: 130, // Updated base value tracking to match your character profile maximums
        maxHp: 130,
        mp: 50,
        maxMp: 50,
        skills: ['Zio', 'Agi'],
        weakness: 'Dark',
        attackPower: 15,
      },
      {
        name: 'JackFrost',
        hp: 45,
        maxHp: 45,
        mp: 30,
        maxMp: 45,
        skills: ['Bufu', 'Mabufu'],
        weakness: 'Fire',
        attackPower: 10,
      },
    ];
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

      // Exponential scaling curve (each level requires 20% more XP than the last)
      this.xpNeededForLevelUp = Math.floor(this.xpNeededForLevelUp * 1.2);
      return true; // Flag true to let DungeonScene know it's time to open the 3-card draft modal
    }

    return false;
  }

  /**
   * PERMANENT SAVE: Serializes all progression tracking metrics and party compositions
   * into a clean JSON string inside the browser's localStorage.
   */
  public saveGame(): void {
    try {
      const saveData = {
        totalCoins: this.totalCoins,
        currentFloor: this.currentFloor,
        currentLevel: this.currentLevel,
        currentXp: this.currentXp,
        xpNeededForLevelUp: this.xpNeededForLevelUp,
        party: this.party,
      };

      localStorage.setItem('summoner_dungeon_save', JSON.stringify(saveData));
      console.log('💾 Game progress successfully autosaved!');
    } catch (error) {
      console.error('❌ Failed to write save data to localStorage:', error);
    }
  }

  /**
   * RETRIEVE DATA: Reads, parses, and maps your saved JSON layout back onto
   * the live engine state variables if an active run exists.
   */
  public loadGame(): boolean {
    try {
      const rawData = localStorage.getItem('summoner_dungeon_save');
      if (!rawData) {
        console.log('No save data found. Initializing a clean run.');
        this.initializeDefaultState();
        return false;
      }

      const saveData = JSON.parse(rawData);

      this.totalCoins = saveData.totalCoins ?? 0;
      this.currentFloor = saveData.currentFloor ?? 1;
      this.currentLevel = saveData.currentLevel ?? 1;
      this.currentXp = saveData.currentXp ?? 0;
      this.xpNeededForLevelUp = saveData.xpNeededForLevelUp ?? 100;

      if (saveData.party && Array.isArray(saveData.party)) {
        this.party = saveData.party;
      }

      console.log('✨ Game state loaded successfully! Progress restored.');
      return true;
    } catch (error) {
      console.error('❌ Failed to parse or execute load sequence:', error);
      this.initializeDefaultState();
      return false;
    }
  }

  /**
   * PURGE RUN: Wipes the storage slot completely clean. Use this when the player
   * hits an explicit game over state or starts a totally fresh campaign profile.
   */
  public clearSave(): void {
    localStorage.removeItem('summoner_dungeon_save');
    console.log('🗑️ Profile save data completely purged.');
  }

  /**
   * HARD RESET ON GAME OVER: Full heals all parameters, completely wipes accumulated progression metrics,
   * currency totals, and updates local cache to entirely prevent dead state reload loops.
   */
  public resetOnDeath(): void {
    console.log('💀 Resetting game state due to party defeat...');
    this.initializeDefaultState();
    this.saveGame(); // Overwrite the save file immediately with these clean tracking defaults
  }
}

// Export a single constant instance to import across your project
export const state = GameState.getInstance();
