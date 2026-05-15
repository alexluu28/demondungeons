import * as ex from 'excalibur';
import { game } from '../resources';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';

export class ExplorationHUD extends ex.ScreenElement {
  private coinLabel!: ex.Label;
  private floorLabel!: ex.Label;
  private coins: number = 0;

  // Minimap Settings
  private minimapSize = 120;
  private mapX = 0;
  private mapY = 80;

  onInitialize() {
    this.mapX = game.drawWidth - this.minimapSize - 20;

    this.floorLabel = new ex.Label({
      text: 'FLOOR: 1',
      pos: ex.vec(20, 40),
      font: new ex.Font({
        size: 24,
        color: ex.Color.White,
        family: 'monospace',
      }),
    });

    this.coinLabel = new ex.Label({
      text: 'COINS: 0',
      pos: ex.vec(game.drawWidth - 150, 40),
      font: new ex.Font({
        size: 24,
        color: ex.Color.Yellow,
        family: 'monospace',
      }),
    });

    this.addChild(this.floorLabel);
    this.addChild(this.coinLabel);
  }

  // This runs every frame after all other graphics are drawn
  onPostDraw(ctx: ex.ExcaliburGraphicsContext) {
    if (!this.graphics.visible) return;

    // 1. Draw Map Background
    ctx.drawRectangle(
      ex.vec(this.mapX, this.mapY),
      this.minimapSize,
      this.minimapSize,
      ex.Color.fromHex('#000000AA'),
    );
// Replace the old line with this:
    ctx.drawRectangle(
      ex.vec(this.mapX, this.mapY),
      this.minimapSize,
      this.minimapSize,
      ex.Color.White,
      ex.Color.Transparent, // No fill color for the border call
      1 // Just pass the number 1 for the thickness/stroke width
    );

    // 2. Iterate through all actors in the current scene to draw dots
    const currentScene = game.currentScene;
    currentScene.entities.forEach((entity) => {
      if (entity instanceof ex.Actor) {
        let dotColor: ex.Color | null = null;

        if (entity instanceof Summoner) {
          dotColor = ex.Color.Cyan;
        } else if (entity instanceof Enemy && !entity.isKilled()) {
          dotColor = ex.Color.Red;
        } else if (entity.name === 'STAIRS') {
          dotColor = ex.Color.Green;
        }

        if (dotColor) {
          // Map world coordinates (0-1280) to minimap coordinates (0-120)
          // 20 tiles * 64px = 1280px total world size
          const worldSize = 20 * 64;
          const relX = (entity.pos.x / worldSize) * this.minimapSize;
          const relY = (entity.pos.y / worldSize) * this.minimapSize;

          ctx.drawCircle(
            ex.vec(this.mapX + relX, this.mapY + relY),
            3,
            dotColor,
          );
        }
      }
    });
  }

  public updateCoins(amount: number) {
    this.coins = amount;
    this.coinLabel.text = `COINS: ${this.coins}`;
  }
}
