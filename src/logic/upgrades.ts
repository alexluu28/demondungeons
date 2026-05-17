import { state } from '../state';

export interface UpgradeCard {
  id: string;
  title: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  applyReward: () => void;
}

export const UPGRADE_POOL: UpgradeCard[] = [
  {
    id: 'vitality_boost',
    title: '❤️ Vitality Surge',
    description:
      'Increase Max HP of all party members by 15 and heal them by that amount.',
    rarity: 'Common',
    applyReward: () => {
      state.party.forEach((member) => {
        member.maxHp += 15;
        member.hp = Math.min(member.hp + 15, member.maxHp);
      });
    },
  },
  {
    id: 'ferocity_boost',
    title: '⚔️ Ferocious Fangs',
    description:
      'Increase the base attack power of all active party members by 5.',
    rarity: 'Common',
    applyReward: () => {
      state.party.forEach((member) => {
        member.attackPower += 5;
      });
    },
  },
  {
    id: 'mana_pool',
    title: '🧪 Mystic Arcana',
    description:
      "Expand your party's magical reserves. Max MP increases by 10.",
    rarity: 'Common',
    applyReward: () => {
      state.party.forEach((member) => {
        member.maxMp += 10;
        member.mp = Math.min(member.mp + 10, member.maxMp);
      });
    },
  },
  {
    id: 'vampiric_touch',
    title: '🧛 Vampiric Essence',
    description:
      'Grant all party members a permanent 15% chance to heal on hit.',
    rarity: 'Rare',
    applyReward: () => {
      state.party.forEach((member) => {
        member.hasVampirism = true;
      });
    },
  },
  {
    id: 'economic_windfall',
    title: '💰 Treasure Hoard',
    description:
      'Instantly find an abandoned coin purse containing 100 extra coins.',
    rarity: 'Common',
    applyReward: () => {
      state.totalCoins += 100;
    },
  },
];

/**
 * Returns 3 completely unique randomized cards from the total reward pool.
 */
export function generateThreeDraftCards(): UpgradeCard[] {
  // Shuffle the pool and slice the first 3 elements to ensure unique card choices
  const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
