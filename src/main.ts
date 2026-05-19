import { DungeonScene } from './scenes/dungeon-scene';
import { GameOverScene } from './scenes/game-over-scene';
import { VictoryScene } from './scenes/victory-scene';
import { ShopScene } from './scenes/shop-scene';
import { game, loader } from './resources';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🎬 Booting Engine with Global Asset Registry...');

  // Start the engine with the populated loader instance
  game
    .start(loader)
    .then(() => {
      console.log(
        '✨ All resources unpackaged successfully. Building scenes...',
      );

      // Instantiate and link world scenes safely inside the resolution loop
      game.add('level1', new DungeonScene());
      game.add('shop', new ShopScene());
      game.add('gameover', new GameOverScene());
      game.add('victory', new VictoryScene());

      game.goToScene('level1');
    })
    .catch((err) => {
      console.error('❌ Asset download blocked:', err);
    });
});
