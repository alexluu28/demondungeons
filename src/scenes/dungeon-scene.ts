import * as ex from 'excalibur';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';
import { Coin } from '../actors/coin';
import { LevelGenerator } from '../logic/level-generator';
import { BattleHUD } from '../ui/battle-hud';
import { ExplorationHUD } from '../ui/exploration-hud';
import { game, Resources } from '../resources';
import { state } from '../state';

export class DungeonScene extends ex.Scene {
  private currentFloorEnemies: Enemy[] = [];
  private summoner!: Summoner;
  private battleHud!: BattleHUD;
  private explorationHud!: ExplorationHUD;
  private enemies: Enemy[] = [];
  private totalCoins: number = 0;
  private isCombatActive: boolean = false;
  private stairsSpawned: boolean = false;

  onInitialize() {
    // 1. World Generation
    this.enemies = LevelGenerator.generateFloor(this, 12, 20, 64);

    // 2. Player Setup
    this.summoner = new Summoner(64, 64);
    this.add(this.summoner);

    // 3. UI Setup
    this.explorationHud = new ExplorationHUD();
    this.add(this.explorationHud);

    this.battleHud = new BattleHUD();
    this.battleHud.onVictory = () => this.endCombat();
    this.add(this.battleHud);

    // Camera Configuration
    this.camera.strategy.lockToActor(this.summoner);
    this.camera.zoom = 1.5;

    //collision for summoner
    this.initStairsCollision(this.summoner);
  }

  /**
   * Freezes world exploration and enters battle mode.
   */
  public startCombat(enemyGroup: Enemy[]) {
    if (this.isCombatActive) return;
    this.isCombatActive = true;
    this.summoner.canMove = false;

    // Hide world visuals and Exploration UI
    this.explorationHud.graphics.visible = false;
    this.entities.forEach((entity) => {
      if (entity instanceof ex.Actor && !(entity instanceof BattleHUD)) {
        entity.graphics.visible = false;
      }
    });

    this.battleHud.updateEnemyList(enemyGroup);

    this.battleHud.updatePlayerParty(state.party);

    this.battleHud.setVisible(true);
  }

  /**
   * Cleans up combat, drops loot, and handles floor progression.
   */
  public endCombat() {
    this.isCombatActive = false;
    this.explorationHud.graphics.visible = true;

    // 1. Drop Loot (using world positions before enemies are fully removed)
    this.enemies.forEach((enemy) => {
      if (enemy.isKilled() && enemy.graphics.visible === false) {
        const loot = new Coin(enemy.pos.x, enemy.pos.y);
        this.add(loot);
        loot.graphics.visible = true;
      }
    });

    // 2. Battle UI Cleanup
    this.battleHud.updateEnemyList([]);
    this.battleHud.setVisible(false);

    // 3. Restore Visibility to the world
    this.entities.forEach((entity) => {
      if (
        entity instanceof ex.Actor &&
        !entity.isKilled() &&
        !(entity instanceof BattleHUD)
      ) {
        entity.graphics.visible = true;
      }
    });

    this.summoner.canMove = true;

    // 4. Progression: Spawn stairs if all enemies on the floor are defeated
    const remainingEnemies = this.enemies.filter((e) => !e.isKilled()).length;
    if (remainingEnemies === 0 && !this.stairsSpawned) {
      this.spawnStairs();
    }
  }

  private spawnStairs() {
    if (this.stairsSpawned) return;
    this.stairsSpawned = true;

    // 1. Calculate a random tile position
    // Assuming a 20x20 grid and 64px tile size
    const gridWidth = 20;
    const gridHeight = 20;
    const tileSize = 64;

    const randomX =
      Math.floor(Math.random() * gridWidth) * tileSize + tileSize / 2;
    const randomY =
      Math.floor(Math.random() * gridHeight) * tileSize + tileSize / 2;

    const stairs = new ex.Actor({
      pos: ex.vec(randomX, randomY),
      width: tileSize,
      height: tileSize,
      color: ex.Color.Green,
      collisionType: ex.CollisionType.Passive,
      z: -1, // Set slightly behind the player but above the floor
    });

    // 2. Add Label
    const label = new ex.Label({
      text: 'STAIRS',
      pos: ex.vec(0, -40),
      font: new ex.Font({
        size: 20,
        color: ex.Color.White,
        family: 'monospace',
        textAlign: ex.TextAlign.Center,
      }),
    });
    stairs.addChild(label);

    // 3. Collision Logic
    stairs.on('precollision', (evt) => {
      if (evt.other.owner === this.summoner) {
        console.log('Advancing to next floor via random exit!');
        game.goToScene('shop');
      }
    });

    this.add(stairs);
    console.log(`Stairs spawned at: ${randomX}, ${randomY}`);
  }

  onPreUpdate() {
    if (this.isCombatActive) return;

    // Check for Enemy Encounters
    for (const enemy of this.enemies) {
      if (!enemy.isKilled() && this.summoner.pos.distance(enemy.pos) < 40) {
        this.startCombat([enemy]);
        break;
      }
    }

    // Check for Coin Collection
    this.entities.forEach((entity) => {
      if (
        entity instanceof Coin &&
        this.summoner.pos.distance(entity.pos) < 30
      ) {
        entity.kill();
        this.totalCoins += 10;
        this.explorationHud.updateCoins(this.totalCoins);
      }
    });
  }

  private initStairsCollision(summoner: ex.Actor) {
    summoner.on('collisionstart', (evt) => {
      // Check if the thing we ran into is named 'Stairs'
      if (evt.other.owner && evt.other.owner.name === 'Stairs') {
        console.log('Stairs triggered! Moving to the next floor...');

        // 1. Advance your persistent global floor counter
        state.currentFloor++;

        // 2. Play a quick visual transition or audio effect
        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);

        // 3. Clear the current floor map and reload a brand new one!
        this.nextFloorSequence();
      }
    });
  }

  public updateCurrentFloorEnemies(enemies: Enemy[]) {
    this.currentFloorEnemies = enemies;
    console.log(
      `Dungeon tracking updated: ${this.currentFloorEnemies.length} active targets.`,
    );
  }

  private nextFloorSequence() {
    // 1. Reset the flag so stairs can spawn on the new floor
    this.stairsSpawned = false;

    // 2. FIX: Protect the HUD actors AND any child entities attached to them!
    const actorsToRemove = this.actors.filter((actor) => {
      // Keep the player character
      if (actor === this.summoner || actor.name === 'Summoner') return false;

      // Keep the HUD frameworks themselves
      if (actor instanceof BattleHUD || actor instanceof ExplorationHUD)
        return false;

      // Keep any child elements attached inside the HUD objects (protects your labels!)
      if (this.explorationHud && this.explorationHud.children.includes(actor))
        return false;
      if (this.battleHud && this.battleHud.children.includes(actor))
        return false;

      return true; // Safe to clear away everything else (enemies, items, old stairs)
    });

    // Purge the cleared elements
    actorsToRemove.forEach((actor) => this.remove(actor));

    // 3. Re-run your generator to procedurally build the next layout
    const nextEnemies = LevelGenerator.generateFloor(this, 12, 20, 64);
    this.enemies = nextEnemies;
    this.updateCurrentFloorEnemies(nextEnemies);

    // 4. Place player in walkable zone
    if (this.summoner) {
      this.summoner.pos = ex.vec(192, 192);
      this.summoner.z = 10;
      this.summoner.graphics.visible = true;
      this.summoner.canMove = true;
    }

    // 5. Reset camera target
    this.camera.pos = ex.vec(192, 192);
    this.camera.strategy.lockToActor(this.summoner);
    this.camera.zoom = 1.5;

    // 6. Force text blocks to sync with fresh layout parameters
    if (this.explorationHud) {
      this.explorationHud.graphics.visible = true;
      this.explorationHud.z = 100;
      this.explorationHud.updateCoins(state.totalCoins);
      this.explorationHud.updateFloor(state.currentFloor);
    }

    console.log(`Floor B${state.currentFloor} initialized successfully!`);
  }
}
