import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';
import { GoldHUD } from '../ui/gold-hud';

export class ShopScene extends ex.Scene {
  onInitialize(_engine: ex.Engine) {
    // 1. UI Overlay
    this.add(new GoldHUD());

    const title = new ex.Label({
      text: 'WANDERING MERCHANT',
      pos: ex.vec(400, 80),
      font: new ex.Font({
        size: 40,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
        family: 'monospace',
        bold: true,
      }),
    });
    this.add(title);

    // 2. Buy Heal (Potion)
    this.createShopItem(
      'HEALTH POTION (20G)',
      'Heals 30 HP',
      250,
      ex.Color.Green,
      () => GameState.buyHeal(20, 30),
    );

    // 3. Buy Max HP (Life Crystal)
    this.createShopItem(
      'LIFE CRYSTAL (50G)',
      '+20 Max HP & Full Heal',
      350,
      ex.Color.Orange,
      () => GameState.buyMaxHP(50, 20),
    );

    // 4. Exit Button
    const exitButton = new ex.Actor({
      pos: ex.vec(400, 520),
      width: 200,
      height: 50,
      color: ex.Color.Gray,
    });

    const exitLabel = new ex.Label({
      text: 'DESCEND FURTHER',
      font: new ex.Font({
        size: 18,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
      }),
    });
    exitButton.addChild(exitLabel);

    exitButton.on('pointerup', () => {
      this.engine.goToScene('level1');
    });

    this.add(exitButton);
  }

  /**
   * Helper to create shop buttons consistently
   */
  private createShopItem(
    name: string,
    desc: string,
    yPos: number,
    color: ex.Color,
    buyFn: () => boolean,
  ) {
    const button = new ex.Actor({
      pos: ex.vec(400, yPos),
      width: 400,
      height: 80,
      color: color,
    });

    const label = new ex.Label({
      text: name,
      pos: ex.vec(0, -10),
      font: new ex.Font({
        size: 22,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
        bold: true,
      }),
    });

    const subLabel = new ex.Label({
      text: desc,
      pos: ex.vec(0, 20),
      font: new ex.Font({
        size: 14,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
      }),
    });

    button.addChild(label);
    button.addChild(subLabel);

    button.on('pointerup', () => {
      const success = buyFn();
      if (success) {
        // Flash white on success
        button.actions.blink(50, 50, 2);
        console.log(`Purchased ${name}`);
      } else {
        // Shake on failure
        button.actions.moveBy(10, 0, 50).moveBy(-20, 0, 50).moveBy(10, 0, 50);
      }
    });

    this.add(button);
  }
}
