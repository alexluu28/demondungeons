import * as ex from 'excalibur';
import { game } from '../resources';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';
import { state } from '../state'; // <-- Added to grab the current level value

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

    ctx.drawRectangle(
      ex.vec(this.mapX, this.mapY),
      this.minimapSize,
      this.minimapSize,
      ex.Color.White,
      ex.Color.Transparent,
      1,
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
        } else if (entity.name === 'Stairs') {
          // FIX: Case-matched to your active string descriptor
          dotColor = ex.Color.Green;
        }

        if (dotColor) {
          // Map world coordinates (0-1280) to minimap coordinates (0-120)
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

  // FIX: ADD THIS METHOD TO FORCE TEXT GRAPHICS REDRAW ON STAIR CONTACT
  public updateFloor(floorNum: number) {
    if (this.floorLabel) {
      this.floorLabel.text = `FLOOR: ${floorNum}`;
    }
  }

  /**
   * Drives the layout metrics of the HTML experience progression bar.
   */
  public updateXpBar(currentXp: number, xpNeeded: number) {
    const xpFill = document.getElementById('xp-bar-fill');
    const xpText = document.getElementById('xp-bar-text');
    const lvlText = document.getElementById('hud-level-text');

    // Calculate percentage, capped at 100% to prevent bar styling overflow bugs
    const percentage = Math.min((currentXp / xpNeeded) * 100, 100);

    if (xpFill) {
      xpFill.style.width = `${percentage}%`;
    }

    if (xpText) {
      xpText.innerText = `${currentXp} / ${xpNeeded} XP`;
    }

    if (lvlText) {
      lvlText.innerText = state.currentLevel.toString();
    }
  }
}
