import * as ex from 'excalibur';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';
import { Coin } from '../actors/coin';
import { LevelGenerator } from '../logic/level-generator';
import { BattleHUD } from '../ui/battle-hud';
import { ExplorationHUD } from '../ui/exploration-hud';
import { Resources } from '../resources';
import { state } from '../state';

export class DungeonScene extends ex.Scene {
  private currentFloorEnemies: Enemy[] = [];
  private summoner!: Summoner;
  private battleHud!: BattleHUD;
  private explorationHud!: ExplorationHUD;
  private enemies: Enemy[] = [];
  private totalCoins: number = 0;
  private isCombatActive: boolean = false;

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

    // Set up permanent collision monitoring for advancing floors via stairs
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
   * Cleans up combat, drops loot, and manages post-encounter floor checks.
   */
  /**
   * Cleans up combat, drops loot, and manages post-encounter floor checks.
   */
  public endCombat() {
    this.isCombatActive = false;
    this.explorationHud.graphics.visible = true;

    // 1. FIX: Sweep all killed enemies currently residing in the scene for loot drops
    this.actors.forEach((actor) => {
      if (
        actor instanceof Enemy &&
        actor.isKilled() &&
        actor.graphics.visible === false
      ) {
        const loot = new Coin(actor.pos.x, actor.pos.y);
        this.add(loot);
        loot.graphics.visible = true;
      }
    });

    // 2. Battle UI Cleanup
    this.battleHud.updateEnemyList([]);
    this.battleHud.setVisible(false);

    // 3. Restore Visibility to survivors in the world
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
    console.log('Combat resolved. The path forward is clear.');

    // --- Force an immediate escape check if standing on the stairs post-boss ---
    const stairsActor = this.actors.find((actor) => actor.name === 'Stairs');
    if (stairsActor && this.summoner) {
      const distanceToStairs = this.summoner.pos.distance(stairsActor.pos);
      if (distanceToStairs < 40) {
        console.log(
          '👑 Guardian defeated while on exit tile! Autoloading next floor...',
        );
        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);
        this.nextFloorSequence();
      }
    }
  }

  onPreUpdate() {
    if (this.isCombatActive) return;

    // Check for Enemy Encounters
    for (const enemy of this.enemies) {
      if (!enemy.isKilled() && this.summoner.pos.distance(enemy.pos) < 40) {
        // --- NEW: Group Encounter Logic ---
        const enemyGroup: Enemy[] = [enemy]; // Start with the overworld monster

        // Don't multiply the Boss! Keep boss fights as a solitary 1v1 challenge.
        if (enemy.enemyName !== 'Boss') {
          // Identify the specific class constructor (e.g., Slime or Ghost)
          const EnemyClass = enemy.constructor as new (
            x: number,
            y: number,
          ) => Enemy;

          // Instantiate 2 extra reinforcement clones of the same type
          // We spawn them at the same position; they are hidden during overworld exploration anyway!
          const reinforcement1 = new EnemyClass(enemy.pos.x, enemy.pos.y);
          const reinforcement2 = new EnemyClass(enemy.pos.x, enemy.pos.y);

          // Push them into the active scene registry so Excalibur tracks them
          this.add(reinforcement1);
          this.add(reinforcement2);

          // Add them to our battle group array
          enemyGroup.push(reinforcement1, reinforcement2);
        }

        // Trigger the battle scene with all 3 units!
        this.startCombat(enemyGroup);
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

  /**
   * Sets up collision events for interacting with the pre-rendered floor exit stairs.
   */
  private initStairsCollision(summoner: ex.Actor) {
    summoner.on('collisionstart', (evt) => {
      // Check if the entity run into is the procedural 'Stairs' actor
      if (evt.other.owner && evt.other.owner.name === 'Stairs') {
        // Check if there is an active, undefeated Boss on this floor
        const bossIsAlive = this.enemies.some(
          (enemy) => enemy.enemyName === 'Boss' && !enemy.isKilled(),
        );

        if (bossIsAlive) {
          console.log('🔒 The exit stairs are sealed by the Boss guardian!');

          // Optional visual/audio feedback for the player
          if (Resources.ErrorSound?.isLoaded()) {
            Resources.ErrorSound.play(0.2);
          }
          return; // STOP the sequence here—do not advance to the next floor!
        }

        console.log(
          'Stairs triggered! Initiating floor transition sequence...',
        );

        // Play a quick visual transition or audio effect
        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);

        // Clear the old floor mapping and construct the new level grid
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

  /**
   * Sweeps old floor actors out of memory and runs the generator to spin up the next map.
   */
  private nextFloorSequence() {
    // 1. CRITICAL CONTEXT SYNC: Increment your global floor index BEFORE building the next layout!
    state.currentFloor++;

    // 2. Clear out actors from the scene while protecting player and HUD assets
    const actorsToRemove = this.actors.filter((actor) => {
      // Keep the player character
      if (actor === this.summoner || actor.name === 'Summoner') return false;

      // Keep the core HUD systems
      if (actor instanceof BattleHUD || actor instanceof ExplorationHUD)
        return false;

      // Keep child sub-nodes attached to HUDs (protects nested text labels from sweeping)
      if (this.explorationHud && this.explorationHud.children.includes(actor))
        return false;
      if (this.battleHud && this.battleHud.children.includes(actor))
        return false;

      return true; // Safely purge slimes, ghosts, items, and walls
    });

    // Remove the gathered old floor actors from active memory
    actorsToRemove.forEach((actor) => this.remove(actor));

    // 3. Re-run your generator to procedurally build the next level grid
    const nextEnemies = LevelGenerator.generateFloor(this, 12, 20, 64);
    this.enemies = nextEnemies;
    this.updateCurrentFloorEnemies(nextEnemies);

    // 4. Place player character in an open starting tile space
    if (this.summoner) {
      this.summoner.pos = ex.vec(192, 192);
      this.summoner.z = 10;
      this.summoner.graphics.visible = true;
      this.summoner.canMove = true;
    }

    // 5. Reset Camera bounds
    this.camera.pos = ex.vec(192, 192);
    this.camera.strategy.lockToActor(this.summoner);
    this.camera.zoom = 1.5;

    // 6. Force text boxes and tracking UI layers to sync with fresh room indices
    if (this.explorationHud) {
      this.explorationHud.graphics.visible = true;
      this.explorationHud.z = 100;
      this.explorationHud.updateCoins(this.totalCoins);
      this.explorationHud.updateFloor(state.currentFloor);
    }

    console.log(`Floor B${state.currentFloor} initialized successfully!`);
  }
}
