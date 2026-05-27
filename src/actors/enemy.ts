import * as ex from 'excalibur';
import { Element } from '../types/combat';
import { Resources, game } from '../resources';

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
      // Scaled up to 48x48 so sprites stand out clearly on the battle stage grid
      width: 48,
      height: 48,
      collisionType: ex.CollisionType.Passive,
      z: 5, // Ensures they layer prominently above floor tracks and backgrounds
    });

    this.enemyName = name;
    this.maxHp = hp;
    this.currentHp = hp;
    this.weakness = weakness;
  }

  onInitialize(_engine: ex.Engine) {
    this.assignVisualSprite();
  }

  /**
   * Dynamically checks the loaded asset registry to pair the enemy name with a
   * high-resolution texture asset, falling back gracefully to the standard sprite.
   */
  private assignVisualSprite() {
    const lookupKey = `${this.enemyName.replace(/\s+/g, '')}Sprite`;
    const registry = Resources as Record<string, any>;

    if (
      registry[lookupKey] &&
      typeof registry[lookupKey].toSprite === 'function'
    ) {
      this.graphics.use(registry[lookupKey].toSprite());
    } else if (Resources.EnemySprite) {
      this.graphics.use(Resources.EnemySprite.toSprite());
    }
  }

  /**
   * Base attack execution method for all monsters.
   * Handles physical kinetic lunge animations moving toward party arrays.
   */
  public attack(summoner: any) {
    console.log(`${this.enemyName} lunges forward to attack!`);

    // Physical lunge logic moving 40px left into target frame space, then snapping back
    // Smoothly dash left 40 pixels over 250ms, then slide back
    const originalX = this.pos.x;

    this.actions
      .moveBy(-40, 0, 160) // 160 is the speed (pixels per second)
      .callMethod(() => {
        if (summoner && typeof summoner.takeDamage === 'function') {
          summoner.takeDamage(this.stats.str);
        }
      })
      .moveTo(originalX, this.pos.y, 160);
  }

  /**
   * Processes damage, applies the 2x Weakness multiplier, and executes hit animations.
   */
  public takeDamage(baseDamage: number, type: Element) {
    let finalDamage = baseDamage;
    const isWeakness = type === this.weakness;

    if (isWeakness) {
      finalDamage = baseDamage * 2;
      console.log(
        `%c WEAKNESS! %c ${this.enemyName} took ${finalDamage} damage!`,
        'color: white; background: #e74c3c; padding: 2px 5px; border-radius: 2px;',
        'color: default;',
      );

      // 💥 High-Impact Weakness: Rapid blinking
      this.actions.blink(40, 40, 4);

      // Trigger a distinct, noticeable screen shake via the global game context
      if (game.currentScene && game.currentScene.camera) {
        game.currentScene.camera.shake(8, 8, 250);
      }
    } else {
      console.log(`${this.enemyName} took ${finalDamage} damage.`);
      // Standard damage response flash
      this.actions.blink(60, 60, 2);
    }

    this.currentHp -= finalDamage;

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.handleDeath();
    }
  }

  /**
   * Cleans up world loops, executing an opacity fade out before removing the instance.
   */
  private handleDeath() {
    console.log(`${this.enemyName} has been banished!`);
    this.actions.clearActions(); // Interrupt any lingering impact loops cleanly
    this.actions.fade(0, 350).die();
  }
}
