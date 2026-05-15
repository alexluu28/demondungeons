// src/actors/ghost-enemy.ts
import { Resources } from '../resources.ts';
import { Enemy } from './enemy.ts';
import { Element } from '../types/combat';


export class Ghost extends Enemy {
  constructor(x: number, y: number) {
    super(x, y, 'Ghost', 40, Element.Fire);
  }

  onInitialize(engine: ex.Engine) {
    super.onInitialize(engine);
    this.graphics.use(Resources.GhostSprite.toSprite()); // Assuming you have this
    this.graphics.opacity = 0.7; // Make it look spooky!
  }
}
