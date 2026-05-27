import { DungeonScene } from './scenes/dungeon-scene';
import { GameOverScene } from './scenes/game-over-scene';
import { VictoryScene } from './scenes/victory-scene';
import { ShopScene } from './scenes/shop-scene';
import { game, loader } from './resources';
import { state } from './state';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🎬 Booting Engine with Global Asset Registry...');

  // Start the engine with the populated loader instance
  game
    .start(loader)
    .then(() => {
      console.log('✨ All resources unpackaged successfully.');

      // 1. Load persistent save data before building the world scenes
      state.loadGame();

      // --- EMERGENCY DEATH LOOP BREAK ---
      // If the game loads and finds your team completely wiped out or under 11 HP,
      // treat it as a Game Over clear and force-reset the profile immediately.
      const isWiped = state.party.some((demon) => demon.hp <= 10);
      if (isWiped) {
        console.warn(
          '⚠️ Critical health state detected at boot. Resetting profile values...',
        );
        state.resetOnDeath();
      }

      console.log('Building world scenes with recovered state parameters...');

      // 2. Instantiate and link world scenes safely inside the resolution loop
      game.add('level1', new DungeonScene());
      game.add('shop', new ShopScene());
      game.add('gameover', new GameOverScene());
      game.add('victory', new VictoryScene());

      // 3. Transition to the primary level grid
      game.goToScene('level1');
    })
    .catch((err) => {
      console.error('❌ Asset download blocked:', err);
    });
});
