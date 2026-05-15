// src/actors/slime-enemy.ts
import * as ex from 'excalibur';
import { Enemy } from './enemy';
import { Element } from '../types/combat';
import { Resources } from '../resources';

export class Slime extends Enemy {
  constructor(x: number, y: number) {
    // Pass everything to the base Enemy constructor
    super(x, y, 'Slime', 60, Element.Electric);
  }

  onInitialize(engine: ex.Engine) {
    // 1. Call the parent's initialize (optional but good practice)
    super.onInitialize(engine);

    // 2. Explicitly tell this actor which sprite to use
    // Assuming Resources.SlimeSprite exists in your resources.ts
    this.graphics.use(Resources.EnemySprite.toSprite());

    // Optional: Tint it green so it looks like a Slime!
    this.graphics.current!.tint = ex.Color.Green;
  }
}
