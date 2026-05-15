// src/ui/damage-label.ts
import * as ex from 'excalibur';

export class DamageLabel extends ex.Actor {
  constructor(
    x: number,
    y: number,
    amount: number,
    color: ex.Color = ex.Color.White,
  ) {
    super({
      pos: ex.vec(x, y),
      vel: ex.vec(0, -50), // Move upward automatically
      z: 100, // Ensure it's on top of everything
    });

    const text = new ex.Text({
      text: amount.toString(),
      font: new ex.Font({
        size: 20,
        bold: true,
        color: color,
        family: 'sans-serif',
      }),
    });

    this.graphics.use(text);
  }

  onInitialize(_engine: ex.Engine) {
    // Animation sequence: Float up and fade out, then kill itself
    this.actions.delay(500).fade(0,300).die();
  }
}
