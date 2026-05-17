import * as ex from 'excalibur';
import { Slime } from '../actors/slime-enemy';
import { Enemy } from '../actors/enemy';
import { Ghost } from '../actors/ghost-enemy';
import { Resources } from '../resources';

export class LevelGenerator {
  /**
   * Generates a floor with a bounded grid layout and an exit stair actor.
   */
  public static generateFloor(
    scene: ex.Scene,
    count: number,
    gridSize: number,
    tileSize: number,
  ): Enemy[] {
    const enemies: Enemy[] = [];

    // 1. Create the Floor Visuals
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const floorTile = new ex.Actor({
          pos: ex.vec(x * tileSize, y * tileSize),
          width: tileSize,
          height: tileSize,
          z: -1, // Sits under everything
        });
        floorTile.graphics.use(Resources.FloorSprite.toSprite());
        scene.add(floorTile);
      }
    }

    // --- 2. Generate Solid Map Bounding Walls ---
    for (let i = -1; i <= gridSize; i++) {
      // Top Wall row & Bottom Wall row
      this.spawnWall(scene, i, -1, tileSize);
      this.spawnWall(scene, i, gridSize, tileSize);

      // Left Wall column & Right Wall column (skipping corners already handled)
      if (i >= 0 && i < gridSize) {
        this.spawnWall(scene, -1, i, tileSize);
        this.spawnWall(scene, gridSize, i, tileSize);
      }
    }

    // --- 3. Spawn Exit Stairs (Force-Rendered) ---
    const stairsGridX = Math.floor(Math.random() * (gridSize - 4)) + 2;
    const stairsGridY = Math.floor(Math.random() * (gridSize - 4)) + 2;

    const stairs = new ex.Actor({
      pos: ex.vec(stairsGridX * tileSize, stairsGridY * tileSize),
      width: tileSize,
      height: tileSize,
      name: 'Stairs',
      z: 99, // Set Z-index absurdly high so floor tiles CANNOT bury it
    });

    // Explicitly double-check the graphic asset availability
    if (
      Resources.StairsSprite &&
      typeof Resources.StairsSprite.toSprite === 'function' &&
      Resources.StairsSprite.isLoaded?.()
    ) {
      stairs.graphics.use(Resources.StairsSprite.toSprite());
    } else {
      // Unmistakable backup visual if your texture load has a silent error
      console.warn(
        `Stairs texture not available. Dropping high-contrast text fallback at [${stairsGridX}, ${stairsGridY}]`,
      );

      stairs.color = ex.Color.Yellow; // Solid bright box anchor

      const textLabel = new ex.Label({
        text: 'EXIT',
        font: new ex.Font({
          size: 16,
          color: ex.Color.Black,
          textAlign: ex.TextAlign.Center,
          bold: true,
          family: 'monospace',
        }),
        pos: ex.vec(0, 6), // Center text vertically over the square anchor
      });
      stairs.addChild(textLabel);
    }

    scene.add(stairs);
    console.log(
      `Exit stairs successfully spawned at grid position: [${stairsGridX}, ${stairsGridY}]`,
    );

    // --- 4. Spawn Enemies (Fixed to use reliable while-loop structure) ---
    let enemiesSpawned = 0;

    while (enemiesSpawned < count) {
      const gridX = Math.floor(Math.random() * gridSize);
      const gridY = Math.floor(Math.random() * gridSize);

      // If it lands in a restricted zone, re-roll immediately without incrementing counter
      if (gridX < 2 && gridY < 2) continue;
      if (gridX === stairsGridX && gridY === stairsGridY) continue;

      let enemy: Enemy;

      // Roll a 30% random probability weight to decide monster type assignments
      if (Math.random() < 0.3) {
        enemy = new Ghost(gridX * tileSize, gridY * tileSize);
        console.log(
          `👻 Spooked! Ghost spawned at grid point: [${gridX}, ${gridY}]`,
        );
      } else {
        enemy = new Slime(gridX * tileSize, gridY * tileSize);
      }

      scene.add(enemy);
      enemies.push(enemy);

      enemiesSpawned++; // Only increments upon a successful placement
    }

    return enemies;
  }

  /**
   * Helper method to generate a solid wall block with collision enabled
   */
  private static spawnWall(
    scene: ex.Scene,
    gridX: number,
    gridY: number,
    tileSize: number,
  ) {
    const wall = new ex.Actor({
      pos: ex.vec(gridX * tileSize, gridY * tileSize),
      width: tileSize,
      height: tileSize,
      color: ex.Color.fromHex('#222222'), // Dark gray visual block
      z: 2,
      collisionType: ex.CollisionType.Fixed, // Prevent player/enemies from walking through it
    });

    if (
      Resources.WallSprite &&
      typeof Resources.WallSprite.toSprite === 'function'
    ) {
      wall.graphics.use(Resources.WallSprite.toSprite());
    }

    scene.add(wall);
  }
}
