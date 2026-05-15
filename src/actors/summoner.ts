import * as ex from 'excalibur';
import { Resources } from '../resources';
import { GameState } from '../logic/game-state.ts';

export class Summoner extends ex.Actor {
  // This flag controls whether the player can use keyboard inputs
  public canMove: boolean = true;
  private moveSpeed: number = 200;

  constructor(x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      width: 32,
      height: 32,
      // CollisionType.Active allows the summoner to bump into walls/enemies
      collisionType: ex.CollisionType.Active,
      color: ex.Color.Blue, // Fallback color
    });
  }

  onInitialize(_engine: ex.Engine) {
    // Assign the sprite we loaded in resources.ts
    const sprite = Resources.SummonerSprite.toSprite();
    this.graphics.use(sprite);

    // Ensure the camera follows this actor
    _engine.currentScene.camera.strategy.lockToActor(this);
  }

  onPreUpdate(engine: ex.Engine, _delta: number) {
    // 1. Check the canMove flag first!
    // If false (Combat/Shop/Menu), stop all movement and exit.
    if (!this.canMove) {
      this.vel = ex.vec(0, 0);
      return;
    }

    // 2. Reset velocity every frame so we stop when keys are released
    this.vel = ex.vec(0, 0);

    // 3. Handle Keyboard Inputs
    // Inside src/actors/summoner.ts -> onPreUpdate

    const kb = engine.input.keyboard;

    if (kb.isHeld(ex.Keys.W) || kb.isHeld(ex.Keys.Up)) {
      this.vel.y = -this.moveSpeed;
    }
    if (kb.isHeld(ex.Keys.S) || kb.isHeld(ex.Keys.Down)) {
      this.vel.y = this.moveSpeed;
    }
    if (kb.isHeld(ex.Keys.A) || kb.isHeld(ex.Keys.Left)) {
      this.vel.x = -this.moveSpeed;
    }
    if (kb.isHeld(ex.Keys.D) || kb.isHeld(ex.Keys.Right)) {
      this.vel.x = this.moveSpeed;
    }

    // 4. Normalize diagonal movement so you don't go faster
    if (this.vel.size !== 0) {
      this.vel = this.vel.normalize().scale(this.moveSpeed);
    }
  }

  // Inside src/actors/summoner.ts
  public takeDamage(amount: number) {
    GameState.currentHp = Math.max(0, GameState.currentHp - amount);

    // Check if the scene and camera are available
    if (this.scene) {
      this.scene.camera.shake(3, 3, 200);
    }

    this.actions.blink(100, 100, 3);

    if (GameState.currentHp <= 0) {
      // Handle Death
    }
  }
}
