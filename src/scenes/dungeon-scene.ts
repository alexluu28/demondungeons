import * as ex from 'excalibur';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';
import { Coin } from '../actors/coin';
import { LevelGenerator } from '../logic/level-generator';
import { BattleHUD } from '../ui/battle-hud';
import { ExplorationHUD } from '../ui/exploration-hud';
import { game } from '../resources';

export class DungeonScene extends ex.Scene {
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
    this.battleHud.updatePlayerParty([
      { name: 'Pixie', hp: 45, mp: 20, skills: ['Zio', 'Dia'] },
      { name: 'Jack Frost', hp: 70, mp: 15, skills: ['Bufu', 'Mabufu'] },
    ]);
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
}
