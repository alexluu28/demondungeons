import * as ex from 'excalibur';
import { Slime } from '../actors/slime-enemy';
import { Enemy } from '../actors/enemy';
import { Resources } from '../resources';

// If you created a Ghost class as well:
// import { Ghost } from '../actors/ghost-enemy';

export class LevelGenerator {
  /**
   * Generates a floor with a grid-based layout.
   * @param scene The current DungeonScene
   * @param count Number of enemies to spawn
   * @param gridSize The dimension of the floor (e.g., 20x20 tiles)
   * @param tileSize The size of each tile (e.g., 64px)
   */
  public static generateFloor(
    scene: ex.Scene,
    count: number,
    gridSize: number,
    tileSize: number,
  ): Enemy[] {
    const enemies: Enemy[] = [];

    // 1. Create the Floor Visuals
    // We create a large tiled background so the world isn't empty space
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const floorTile = new ex.Actor({
          pos: ex.vec(x * tileSize, y * tileSize),
          width: tileSize,
          height: tileSize,
          z: -1, // Keep floor behind everything
        });
        floorTile.graphics.use(Resources.FloorSprite.toSprite());
        scene.add(floorTile);
      }
    }

    // 2. Spawn Enemies on Grid Intersections
    for (let i = 0; i < count; i++) {
      // Random grid coordinates
      const gridX = Math.floor(Math.random() * gridSize);
      const gridY = Math.floor(Math.random() * gridSize);

      const worldX = gridX * tileSize;
      const worldY = gridY * tileSize;

      // Prevent spawning at the starting position (0,0)
      if (gridX < 2 && gridY < 2) continue;

      // Randomly choose between enemy types to test weaknesses
      // If you haven't made Ghost yet, you can just use new Slime() for both
      const enemy =
        Math.random() > 0.5
          ? new Slime(worldX, worldY)
          : new Slime(worldX, worldY); // Replace with Ghost once created

      scene.add(enemy);
      enemies.push(enemy);
    }

    console.log(`Floor generated with ${enemies.length} entities.`);
    return enemies;
  }
}
