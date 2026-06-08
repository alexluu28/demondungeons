export interface Card {
  id: string;
  suit: 'SPADES' | 'CLUBS' | 'DIAMONDS' | 'HEARTS'; // Element mapping
  value: number; // 3 to 15 (where 11=J, 12=Q, 13=K, 14=A, 15=2)
  name: string;
}

export type HandType =
  | 'SINGLE'
  | 'PAIR'
  | 'TRIPLE'
  | 'QUAD'
  | 'STRAIGHT'
  | 'BOMB'
  | 'INVALID';

export class CardValidator {
  /**
   * Translates internal values back to card faces for debugging/display
   */
  public static getCardName(value: number): string {
    if (value <= 10) return value.toString();
    return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' }[value] || '';
  }

  /**
   * Sorts cards primarily by value (3 up to 2)
   */
  public static sortCards(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => a.value - b.value);
  }

  /**
   * Evaluates a selection of cards and returns the hand classification and power
   */
  public static evaluateHand(selectedCards: Card[]): {
    type: HandType;
    power: number;
    element: string;
  } {
    if (selectedCards.length === 0)
      return { type: 'INVALID', power: 0, element: 'NONE' };

    const sorted = this.sortCards(selectedCards);
    const len = sorted.length;

    // Determine primary element based on the dominant suit in the combo
    const elementMap = {
      SPADES: 'PHYS',
      CLUBS: 'ZIO',
      DIAMONDS: 'BUFUX',
      HEARTS: 'AGI',
    };
    const dominantSuit = sorted[len - 1].suit; // Highest card dictates the element breakthrough
    const element = elementMap[dominantSuit];

    // 1. Single Card
    if (len === 1) {
      return { type: 'SINGLE', power: sorted[0].value, element };
    }

    // 2. Multiples (Pairs, Triples, Quads)
    const allSameValue = sorted.every((c) => c.value === sorted[0].value);
    if (allSameValue) {
      if (len === 2)
        return { type: 'PAIR', power: sorted[0].value * 2, element };
      if (len === 3)
        return { type: 'TRIPLE', power: sorted[0].value * 3, element };
      if (len === 4)
        return { type: 'QUAD', power: sorted[0].value * 5, element }; // Quad "Bomb" behavior
    }

    // 3. Straights (3 or more consecutive values, 2s cannot be part of a straight in traditional 13)
    if (len >= 3) {
      let isStraight = true;
      for (let i = 0; i < len - 1; i++) {
        if (
          sorted[i + 1].value !== sorted[i].value + 1 ||
          sorted[i].value === 15 ||
          sorted[i + 1].value === 15
        ) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) {
        // Sum total values * length multiplier
        const totalValue = sorted.reduce((sum, c) => sum + c.value, 0);
        return { type: 'STRAIGHT', power: totalValue * 1.2, element };
      }
    }

    // 4. Advanced Bombs: 3 consecutive pairs (Length 6)
    if (len === 6) {
      const p1 = sorted[0].value === sorted[1].value;
      const p2 = sorted[2].value === sorted[3].value;
      const p3 = sorted[4].value === sorted[5].value;
      const consecutive =
        sorted[2].value === sorted[0].value + 1 &&
        sorted[4].value === sorted[2].value + 1;

      if (p1 && p2 && p3 && consecutive) {
        return { type: 'BOMB', power: 150, element }; // Massive flat baseline burst
      }
    }

    return { type: 'INVALID', power: 0, element: 'NONE' };
  }
}
