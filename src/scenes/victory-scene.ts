import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';

export class VictoryScene extends ex.Scene {
  onInitialize(_engine: ex.Engine) {
    const title = new ex.Label({
      text: 'DUNGEON CLEARED',
      pos: ex.vec(400, 150),
      font: new ex.Font({
        size: 50,
        color: ex.Color.Yellow,
        textAlign: ex.TextAlign.Center,
        bold: true,
      }),
    });

    const stats = new ex.Label({
      text: `You escaped with ${GameState.coins} Gold!`,
      pos: ex.vec(400, 300),
      font: new ex.Font({
        size: 24,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
      }),
    });

    const restartButton = new ex.Actor({
      pos: ex.vec(400, 450),
      width: 200,
      height: 50,
      color: ex.Color.Green,
    });

    restartButton.addChild(
      new ex.Label({
        text: 'PLAY AGAIN',
        font: new ex.Font({
          size: 20,
          color: ex.Color.White,
          textAlign: ex.TextAlign.Center,
        }),
      }),
    );

    restartButton.on('pointerup', () => {
      // Reset GameState before restarting
      GameState.coins = 0;
      GameState.floor = 1;
      GameState.maxHp = 100;
      GameState.currentHp = 100;
      this.engine.goToScene('level1');
    });

    this.add(title);
    this.add(stats);
    this.add(restartButton);
  }
}
