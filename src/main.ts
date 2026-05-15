import { DungeonScene } from './scenes/dungeon-scene';
import { GameOverScene } from './scenes/game-over-scene';
import {VictoryScene} from './scenes/victory-scene';
import {game, loader } from './resources';
import {ShopScene} from "./scenes/shop-scene.ts";

// Add scenes to the engine
game.add('level1', new DungeonScene());
game.add('shop', new ShopScene());
game.add('gameover', new GameOverScene());
game.add('victory', new VictoryScene());

// Start the game and transition to the first level
game.start(loader).then(() => {
  game.goToScene('level1');
});
