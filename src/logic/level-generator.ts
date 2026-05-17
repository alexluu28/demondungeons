import * as ex from 'excalibur';
import { Slime } from '../actors/slime-enemy';
import { Enemy } from '../actors/enemy';
import { Ghost } from '../actors/ghost-enemy';
import { Boss } from '../actors/boss';
import { Resources } from '../resources';
import { state } from '../state';
import { DungeonBuilder } from './dungeon-builder';

export class LevelGenerator {
  /**
   * Generates a procedurally carved random room floor grid layout.
   */
  public static generateFloor(
    scene: ex.Scene,
    count: number,
    gridSize: number,
    tileSize: number,
  ): Enemy[] {
    const enemies: Enemy[] = [];

    // 1. Generate the logical 2D array grid layout matrix (0 = Wall, 1 = Floor)
    const maxRooms = 8;
    const grid = DungeonBuilder.generateGrid(gridSize, gridSize, maxRooms);

    // Track valid open floor locations for spawning game entities
    const openFloorTiles: ex.Vector[] = [];

    // 2. Map the 2D procedural grid matrix out to Excalibur Actors
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const worldX = x * tileSize;
        const worldY = y * tileSize;

        if (grid[y][x] === 0) {
          // --- SPAWN A SOLID COLLIDABLE WALL ---
          this.spawnWall(scene, x, y, tileSize);
        } else {
          // --- SPAWN A VISUAL FLOOR TILE ---
          const floorTile = new ex.Actor({
            pos: ex.vec(worldX, worldY),
            width: tileSize,
            height: tileSize,
            z: -1, // Sits under everything else
          });

          if (
            Resources.FloorSprite &&
            typeof Resources.FloorSprite.toSprite === 'function'
          ) {
            floorTile.graphics.use(Resources.FloorSprite.toSprite());
          }
          scene.add(floorTile);

          // Cache the grid coordinate vectors for safe entity distribution
          openFloorTiles.push(ex.vec(x, y));
        }
      }
    }

    // Shuffle our floor collection options to ensure randomized unique allocations
    openFloorTiles.sort(() => 0.5 - Math.random());

    if (openFloorTiles.length === 0) {
      console.error(
        'Critical Failure: No floor space carved by DungeonBuilder!',
      );
      return [];
    }

    // 3. Coordinate Player Spawn Anchor Location
    // Pull the first open tile from our randomized deck to seat the Summoner
    const playerGridPos = openFloorTiles.pop()!;
    const player = scene.actors.find(
      (a) => a.name === 'Summoner' || a.constructor.name === 'Summoner',
    );
    if (player) {
      player.pos = ex.vec(
        playerGridPos.x * tileSize,
        playerGridPos.y * tileSize,
      );
      console.log(
        `Player starting position anchored safely at: [${playerGridPos.x}, ${playerGridPos.y}]`,
      );
    }

    // 4. Coordinate Exit Stairs Spawn Location
    // Pull the next unique open tile to prevent overlapping any walls or player spawns
    const stairsGridPos = openFloorTiles.pop()!;
    const stairsGridX = stairsGridPos.x;
    const stairsGridY = stairsGridPos.y;

    const stairs = new ex.Actor({
      pos: ex.vec(stairsGridX * tileSize, stairsGridY * tileSize),
      width: tileSize,
      height: tileSize,
      name: 'Stairs',
      z: 99, // Set Z-index absurdly high so graphics layers cannot bury it
    });

    if (
      Resources.StairsSprite &&
      typeof Resources.StairsSprite.toSprite === 'function' &&
      (typeof Resources.StairsSprite.isLoaded !== 'function' ||
        Resources.StairsSprite.isLoaded())
    ) {
      stairs.graphics.use(Resources.StairsSprite.toSprite());
    } else {
      console.warn(
        `Stairs texture not available. Dropping high-contrast text fallback at [${stairsGridX}, ${stairsGridY}]`,
      );
      stairs.color = ex.Color.Yellow;

      const textLabel = new ex.Label({
        text: 'EXIT',
        font: new ex.Font({
          size: 16,
          color: ex.Color.Black,
          textAlign: ex.TextAlign.Center,
          bold: true,
          family: 'monospace',
        }),
        pos: ex.vec(0, 6),
      });
      stairs.addChild(textLabel);
    }

    scene.add(stairs);
    console.log(
      `Exit stairs successfully spawned at grid position: [${stairsGridX}, ${stairsGridY}]`,
    );

    // --- Milestone Boss Floor Spawning (Every 5th Floor) ---
    const isBossFloor = state.currentFloor % 5 === 0;

    if (isBossFloor) {
      // Place the Boss guardian directly protecting the room's stairs exit vector
      const boss = new Boss(stairsGridX * tileSize, stairsGridY * tileSize);
      scene.add(boss);
      enemies.push(boss);

      console.log(
        `⚠️ BOSS ENCOUNTER! Giant guardian spawned at grid: [${stairsGridX}, ${stairsGridY}]`,
      );

      // Reduce standard enemy count to avoid crowding the boss arena layout
      count = Math.min(count, 2);
    }

    // --- 5. Spawn Enemies strictly on remaining open floor tiles ---
    let enemiesSpawned = 0;
    const maxAvailableEnemies = Math.min(count, openFloorTiles.length);

    while (enemiesSpawned < maxAvailableEnemies) {
      // Safely pop a guaranteed unique floor coordinate space
      const enemyGridPos = openFloorTiles.pop()!;
      const gridX = enemyGridPos.x;
      const gridY = enemyGridPos.y;

      // Skip the tile if it rests directly adjacent to the starting player location
      if (
        Math.abs(gridX - playerGridPos.x) <= 1 &&
        Math.abs(gridY - playerGridPos.y) <= 1
      ) {
        continue;
      }

      let enemy: Enemy;

      // Roll a 30% probability weight to handle monster variance assignments
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

      enemiesSpawned++;
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
      color: ex.Color.fromHex('#222233'), // Dark navy-gray dungeon visual blocks
      z: 2,
      collisionType: ex.CollisionType.Fixed, // Block all overworld actors completely
    });

    wall.name = 'Wall';

    if (
      Resources.WallSprite &&
      typeof Resources.WallSprite.toSprite === 'function'
    ) {
      wall.graphics.use(Resources.WallSprite.toSprite());
    }

    scene.add(wall);
  }
}
