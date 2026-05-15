import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';

export class Stairs extends ex.Actor {
  constructor(x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      width: 40,
      height: 40,
      color: ex.Color.Black, // Looks like a hole/descending path
      z: 1, // On the floor level
    });
  }

  onInitialize(_engine: ex.Engine) {
    // Simple visual indicator: a white border
    const border = new ex.Rectangle({
      width: 40,
      height: 40,
      color: ex.Color.Transparent,
      strokeColor: ex.Color.White,
      lineWidth: 2,
    });
    this.graphics.add(border);
  }

  // Inside stairs.ts enter()
  // Inside src/actors/stairs.ts
  public enter() {
    // Check for Win Condition
    if (GameState.floor >= 10) {
      this.scene?.engine.goToScene('victory');
      return;
    }

    GameState.floor += 1;

    // Check for Shop transition every 3 floors
    if (GameState.floor % 3 === 0) {
      this.scene?.engine.goToScene('shop');
    } else {
      this.scene?.engine.goToScene('level1');
    }
  }
}
