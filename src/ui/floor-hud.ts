import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';

export class FloorHUD extends ex.ScreenElement {
  private label!: ex.Label;

  onInitialize(_engine: ex.Engine) {
    this.label = new ex.Label({
      text: `FLOOR: ${GameState.floor}`,
      pos: ex.vec(780, 20), // Top right corner
      font: new ex.Font({
        family: 'monospace',
        size: 24,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Right,
        bold: true,
      }),
    });

    this.addChild(this.label);
  }

  onPostUpdate() {
    // Keep the text updated as the player descends
    this.label.text = `FLOOR: ${GameState.floor}`;
  }
}
