import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';

export class GoldHUD extends ex.ScreenElement {
  private label!: ex.Label;

  onInitialize(_engine: ex.Engine) {
    this.label = new ex.Label({
      text: `Gold: ${GameState.coins}`,
      pos: ex.vec(20, 20), // Top left corner
      font: new ex.Font({
        family: 'monospace',
        size: 24,
        color: ex.Color.Yellow,
        unit: ex.FontUnit.Px,
      }),
    });

    this.addChild(this.label);
  }

  onPostUpdate() {
    // Automatically sync the label with the GameState every frame
    this.label.text = `Gold: ${GameState.coins}`;
  }
}
