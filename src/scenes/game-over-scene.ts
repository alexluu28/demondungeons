import * as ex from 'excalibur';

export class GameOverScene extends ex.Scene {
  onInitialize(engine: ex.Engine) {
    const label = new ex.Label({
      text: 'GAME OVER',
      pos: ex.vec(engine.halfDrawWidth, engine.halfDrawHeight - 50),
      font: new ex.Font({
        family: 'impact',
        size: 72,
        color: ex.Color.Red,
        textAlign: ex.TextAlign.Center,
      }),
    });

    const retryLabel = new ex.Label({
      text: 'Press [R] to Restart',
      pos: ex.vec(engine.halfDrawWidth, engine.halfDrawHeight + 50),
      font: new ex.Font({
        family: 'sans-serif',
        size: 24,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
      }),
    });

    this.add(label);
    this.add(retryLabel);

    engine.input.keyboard.on('press', (evt) => {
      if (evt.key === ex.Keys.R) {
        // Return to the dungeon and reset
        engine.goToScene('dungeon');
      }
    });
  }
}
