import * as ex from 'excalibur';
import { Element } from '../types/combat';
import { Resources } from '../resources';

export class Enemy extends ex.Actor {
  public currentHp: number;
  public maxHp: number;
  public weakness: Element;
  public enemyName: string;

  public stats = {
    str: 10,
    mag: 10,
    def: 5,
  };

  constructor(
    x: number,
    y: number,
    name: string,
    hp: number,
    weakness: Element,
  ) {
    super({
      pos: ex.vec(x, y),
      // Scale these to match your grid size (e.g., 64x64 or 32x32)
      width: 32,
      height: 32,
      collisionType: ex.CollisionType.Passive,
      z: 1, // Ensure they are above the floor tiles
    });

    this.enemyName = name;
    this.maxHp = hp;
    this.currentHp = hp;
    this.weakness = weakness;
  }

  onInitialize(_engine: ex.Engine) {
    // FALLBACK SPRITE:
    // This ensures every enemy has a visual, even if the subclass doesn't set one.
    if (!this.graphics.current) {
      this.graphics.use(Resources.EnemySprite.toSprite());
    }
  }

  /**
   * Processes damage and applies the 2x Weakness multiplier.
   */
  public takeDamage(baseDamage: number, type: Element) {
    let finalDamage = baseDamage;

    // Weakness logic: 2x damage if elements match
    if (type === this.weakness) {
      finalDamage = baseDamage * 2;
      console.log(
        `%c WEAKNESS! %c ${this.enemyName} took ${finalDamage} damage!`,
        'color: white; background: #e74c3c; padding: 2px 5px; border-radius: 2px;',
        'color: default;',
      );

      // Visual feedback: Quick blink
      this.actions.blink(50, 50, 3);
    } else {
      console.log(`${this.enemyName} took ${finalDamage} damage.`);
    }

    this.currentHp -= finalDamage;

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.handleDeath();
    }
  }

  private handleDeath() {
    console.log(`${this.enemyName} has been banished!`);
    // Fade out and remove from the game world
    this.actions.fade(0, 300).die();
  }
}
