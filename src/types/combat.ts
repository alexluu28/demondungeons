// src/types/combat.ts

export enum Element {
  Physical = 'Phys',
  Fire = 'Agi',
  Ice = 'Bufu',
  Electric = 'Zio',
  Force = 'Zan',
}

export interface Attack {
  name: string;
  element: Element;
  damage: number;
}
