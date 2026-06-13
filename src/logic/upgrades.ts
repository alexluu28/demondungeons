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
      console.log('--- 🧪 BEFORE VITALITY SURGE ---');
      state.party.forEach((m) =>
        console.log(`${m.name} -> HP: ${m.hp}/${m.maxHp}`),
      );

      state.party.forEach((member) => {
        member.maxHp += 15;
        member.hp = Math.min(member.hp + 15, member.maxHp);
      });

      console.log('--- ✨ AFTER VITALITY SURGE ---');
      state.party.forEach((m) =>
        console.log(`${m.name} -> HP: ${m.hp}/${m.maxHp}`),
      );
    },
  },
  {
    id: 'ferocity_boost',
    title: '⚔️ Ferocious Fangs',
    description:
      'Increase the base attack power of all active party members by 5.',
    rarity: 'Common',
    applyReward: () => {
      console.log('--- 🧪 BEFORE FEROCIOUS FANGS ---');
      // Adjust property names if your party model tracks 'attack' or 'power' differently
      state.party.forEach((m) =>
        console.log(`${m.name} -> Attack Power: ${(m as any).attackPower}`),
      );

      state.party.forEach((member) => {
        (member as any).attackPower += 5;
      });

      console.log('--- ✨ AFTER FEROCIOUS FANGS ---');
      state.party.forEach((m) =>
        console.log(`${m.name} -> Attack Power: ${(m as any).attackPower}`),
      );
    },
  },
  {
    id: 'iron_will',
    title: '🛡️ Iron Bulwark',
    description:
      'Fortify your allies. All party members gain a permanent +3 reduction to incoming physical damage.',
    rarity: 'Common',
    applyReward: () => {
      console.log('--- 🧪 BEFORE IRON BULWARK ---');
      state.party.forEach((m) =>
        console.log(
          `${m.name} -> Defense: ${(m as any).defense || (m as any).damageReduction || 0}`,
        ),
      );

      state.party.forEach((member) => {
        if ('defense' in member) {
          (member as any).defense += 3;
        } else {
          (member as any).damageReduction =
            ((member as any).damageReduction || 0) + 3;
        }
      });

      console.log('--- ✨ AFTER IRON BULWARK ---');
      state.party.forEach((m) =>
        console.log(
          `${m.name} -> Defense: ${(m as any).defense || (m as any).damageReduction || 0}`,
        ),
      );
    },
  },
  {
    id: 'vampiric_touch',
    title: '🧛 Vampiric Essence',
    description:
      'Grant all party members a permanent 15% chance to heal on hit.',
    rarity: 'Rare',
    applyReward: () => {
      console.log('--- 🧪 BEFORE VAMPIRIC ESSENCE ---');
      state.party.forEach((m) =>
        console.log(
          `${m.name} -> Vampirism Status: ${(m as any).hasVampirism}`,
        ),
      );

      state.party.forEach((member) => {
        (member as any).hasVampirism = true;
      });

      console.log('--- ✨ AFTER VAMPIRIC ESSENCE ---');
      state.party.forEach((m) =>
        console.log(
          `${m.name} -> Vampirism Status: ${(m as any).hasVampirism}`,
        ),
      );
    },
  },
  {
    id: 'economic_windfall',
    title: '💰 Treasure Hoard',
    description:
      'Instantly find an abandoned coin purse containing 100 extra coins.',
    rarity: 'Common',
    applyReward: () => {
      console.log(
        `--- 🧪 TREASURE HOARD: Wallet modified from ${state.totalCoins} -> ${state.totalCoins + 100} ---`,
      );
      state.totalCoins += 100;
    },
  },
];

export function generateThreeDraftCards(): UpgradeCard[] {
  const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
