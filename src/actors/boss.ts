import * as ex from 'excalibur';
import { Enemy } from './enemy';
import { Summoner } from './summoner';
import { Element } from '../types/combat';
import { Resources } from '../resources.ts'; // <-- ADD THIS IMPORT

export class Boss extends Enemy {
  constructor(x: number, y: number) {
    // FIX: Provide all 5 expected arguments to the base Enemy class
    super(x, y, 'Boss', 100, Element.Fire); // Adjust Element type to match your preference

    this.maxHp = 100;
    this.currentHp = 100;
    this.color = ex.Color.Red;
    this.scale = ex.vec(1.5, 1.5); // Physically imposing size scaling
    this.z = 10;
  }

  onInitialize(engine: ex.Engine) {
    super.onInitialize(engine);
    this.graphics.use(Resources.BossSprite.toSprite()); // Assuming you have this
  }

  // Override attack to be more punishing
  public override attack(summoner: Summoner) {
    console.log('BOSS SMASH!');
    summoner.takeDamage(25);
  }
}
