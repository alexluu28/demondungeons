import * as ex from 'excalibur';
import { GameState } from '../logic/game-state';
import { state } from '../state';

export class ShopScene extends ex.Scene {
  private shopOverlay!: HTMLElement | null;
  private goldText!: HTMLElement | null;
  private potionBtn!: HTMLButtonElement | null;
  private crystalBtn!: HTMLButtonElement | null;
  private exitBtn!: HTMLButtonElement | null;

  override onInitialize(_engine: ex.Engine) {
    // Cache references to our domestic DOM elements
    this.shopOverlay = document.getElementById('shop-html-hud');
    this.goldText = document.getElementById('shop-gold-text');

    this.potionBtn = document.getElementById(
      'shop-item-potion',
    ) as HTMLButtonElement;
    this.crystalBtn = document.getElementById(
      'shop-item-crystal',
    ) as HTMLButtonElement;
    this.exitBtn = document.getElementById(
      'shop-exit-button',
    ) as HTMLButtonElement;

    this.setupInputListeners();
  }

  /**
   * Fires every single time the scene transitions into view.
   */
  override onActivate(context: ex.SceneActivationContext<unknown>) {
    super.onActivate(context);
    this.syncGoldTracker();

    // Reveal the clean structural HTML layout overlay layer smoothly
    if (this.shopOverlay) {
      this.shopOverlay.style.display = 'block';
    }
  }

  /**
   * Fires whenever we are routing completely away from the shop scene.
   * 🌟 FIXED: Changed type signature to use valid SceneActivationContext
   */
  override onDeactivate(context: ex.SceneActivationContext<any, any>) {
    super.onDeactivate(context);

    // Hide the layout container cleanly so it doesn't bleed back into overworld exploration canvas loops
    if (this.shopOverlay) {
      this.shopOverlay.style.display = 'none';
    }
  }

  /**
   * Links native HTML element clicks safely to our game logic routines.
   */
  private setupInputListeners() {
    // 🧪 Purchase Potion Action Routing
    if (this.potionBtn) {
      this.potionBtn.onclick = (e) => {
        e.preventDefault();
        const success = GameState.buyHeal(20, 30);
        this.handlePurchaseFeedback(this.potionBtn!, success);
      };
    }

    // 🧪 Purchase Max HP Upgrade Action Routing
    if (this.crystalBtn) {
      this.crystalBtn.onclick = (e) => {
        e.preventDefault();
        const success = GameState.buyMaxHP(50, 20);
        this.handlePurchaseFeedback(this.crystalBtn!, success);
      };
    }

    // 🚪 Close Shop & Route to Exploration loop
    if (this.exitBtn) {
      this.exitBtn.onclick = (e) => {
        e.preventDefault();
        console.log(
          'Leaving shop intermission, descending to next depth level...',
        );
        this.engine.goToScene('level1');
      };

      // Simple button hover aesthetic behaviors via JS styles
      this.exitBtn.onmouseenter = () => {
        if (this.exitBtn) this.exitBtn.style.background = '#3f3f5c';
      };
      this.exitBtn.onmouseleave = () => {
        if (this.exitBtn) this.exitBtn.style.background = '#27273a';
      };
    }
  }

  private syncGoldTracker() {
    if (this.goldText) {
      this.goldText.innerText = `${state.totalCoins}`;
    }
  }

  /**
   * Handles modern responsive styling visual animations on native elements
   * without needing manual engine action tracking loops.
   */
  private handlePurchaseFeedback(
    element: HTMLButtonElement,
    isSuccessful: boolean,
  ) {
    const originalBackground = element.style.background;

    if (isSuccessful) {
      console.log('Transaction verified successfully!');
      this.syncGoldTracker();

      // Flash structural green indicator frames dynamically
      element.style.transform = 'scale(0.97)';
      element.style.background = '#2e7d32';

      setTimeout(() => {
        element.style.transform = '';
        element.style.background = originalBackground;
      }, 120);
    } else {
      console.log('Transaction denied: Insufficient capital reserves.');

      // Shake animation effect utilizing inline styling offsets
      element.style.transform = 'translateX(6px)';
      element.style.borderColor = '#dc2626';

      setTimeout(() => (element.style.transform = 'translateX(-6px)'), 60);
      setTimeout(() => (element.style.transform = 'translateX(4px)'), 120);
      setTimeout(() => {
        element.style.transform = '';
        element.style.borderColor = 'transparent';
      }, 180);
    }
  }
}
