import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';

export class Coin extends ex.Actor {
  constructor(x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      width: 20,
      height: 20,
      color: ex.Color.Yellow,
      z: 5, // Behind the player but above the floor
    });
  }

  onInitialize(_engine: ex.Engine) {
    // Correct signature: x, y, duration (3 arguments)
    this.actions.repeatForever((ctx) => {
      ctx.moveBy(0, -10, 400).moveBy(0, 10, 400);
    });
  }

  public collect() {
    GameState.addCoins(10);

    // Visual feedback: Pop up and disappear
    this.actions.clearActions();
    this.actions
      .moveBy(0, -30, 200) // Stripped the 4th argument
      .fade(0, 200)
      .die();
  }
}
