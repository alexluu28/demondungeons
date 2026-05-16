export interface PartyMember {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  skills: string[];
  weakness?: string;
}

export class GameState {
  private static _instance: GameState;

  // Global persistent variables
  public totalCoins: number = 0;
  public currentFloor: number = 1;

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
    },
    {
      name: 'JackFrost',
      hp: 45,
      maxHp: 45,
      mp: 30,
      maxMp: 45,
      skills: ['Bufu', 'Mabufu'],
      weakness: 'Fire',
    },
  ];

  // Guarantees only one instance of the state exists
  public static getInstance(): GameState {
    if (!GameState._instance) {
      GameState._instance = new GameState();
    }
    return GameState._instance;
  }
}

// Export a single constant instance to import across your project
export const state = GameState.getInstance();
