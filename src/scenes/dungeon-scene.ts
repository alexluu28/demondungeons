import * as ex from 'excalibur';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';
import { Coin } from '../actors/coin';
import { LevelGenerator } from '../logic/level-generator';
import { BattleHUD } from '../ui/battle-hud';
import { ExplorationHUD } from '../ui/exploration-hud';
import { Resources } from '../resources';
import { state } from '../state';
import { generateThreeDraftCards, UpgradeCard } from '../logic/upgrades';

export class DungeonScene extends ex.Scene {
  private currentFloorEnemies: Enemy[] = [];
  private summoner!: Summoner;
  private battleHud!: BattleHUD;
  private explorationHud!: ExplorationHUD;
  private enemies: Enemy[] = [];
  private isCombatActive: boolean = false;
  private activeEncounterGroup: Enemy[] = []; // Safely cache the active combatants

  onInitialize() {
    // 1. Player Setup (Instantiated first so the LevelGenerator can adjust its position)
    this.summoner = new Summoner(0, 0);
    this.summoner.name = 'Summoner';
    this.add(this.summoner);

    // 2. World Generation (Grid layout handles player repositioning onto an open floor tile)
    this.enemies = LevelGenerator.generateFloor(this, 12, 24, 64);

    // 3. UI Setup
    this.explorationHud = new ExplorationHUD();
    this.add(this.explorationHud);

    this.battleHud = new BattleHUD();
    // Pass the cached encounter squad back to resolution safely on victory
    this.battleHud.onVictory = () => this.endCombat(this.activeEncounterGroup);
    this.add(this.battleHud);

    // Camera Configuration - Anchor frames onto the generated spawn location
    this.camera.pos = this.summoner.pos;
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
    this.activeEncounterGroup = enemyGroup; // Cache the current active squad parameters

    // Hide world visuals, Excalibur HUD, and persistent HTML exploration HUD
    this.explorationHud.graphics.visible = false;

    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'none';

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
   * Decoupled from actor engine filters to prevent zero-XP assessment errors.
   */
  public endCombat(defeatedGroup?: Enemy[]) {
    this.isCombatActive = false;
    this.explorationHud.graphics.visible = true;

    // Fallback safely to a default group size of 3 units if array layer mapping drops context
    const enemiesDefeated =
      defeatedGroup && defeatedGroup.length > 0 ? defeatedGroup.length : 3;
    console.log(
      `Combat resolved. Processing rewards for ${enemiesDefeated} squad elements.`,
    );

    // 1. Drop loot tokens dynamically at your character location space coordinates
    for (let i = 0; i < enemiesDefeated; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const loot = new Coin(
        this.summoner.pos.x + offsetX,
        this.summoner.pos.y + offsetY,
      );
      this.add(loot);
      loot.graphics.visible = true;
    }

    // 2. Battle UI Cleanup
    this.battleHud.updateEnemyList([]);
    this.battleHud.setVisible(false);

    // 3. Restore Visibility to overworld survivors
    this.entities.forEach((entity) => {
      if (
        entity instanceof ex.Actor &&
        !entity.isKilled() &&
        !(entity instanceof BattleHUD)
      ) {
        entity.graphics.visible = true;
      }
    });

    // --- Experience Calculations ---
    const xpEarned = enemiesDefeated * 35; // 35 XP per unit slayed in group encounters
    console.log(
      `Earned ${xpEarned} XP from battle resolutions. Total Enemies: ${enemiesDefeated}`,
    );

    const didLevelUp = state.gainXp(xpEarned);

    // Synchronize the fresh stats out to the custom HTML bar tracking layout
    this.explorationHud.updateXpBar(state.currentXp, state.xpNeededForLevelUp);

    if (didLevelUp) {
      console.log(
        `✨ LEVEL UP! Reached level ${state.currentLevel}! Opening Draft Options...`,
      );
      this.summoner.canMove = false; // Freeze player movement

      // Open the dynamic level-up selection screen
      this.showLevelUpDraftOverlay();
      return; // Hold progression checks until draft selection clears
    }

    // Restore persistent exploration HTML layer if no level up intercepted control
    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'block';

    this.summoner.canMove = true;

    // Reset tracking cache allocation space
    this.activeEncounterGroup = [];

    // Room exit collision fallback verification
    const stairsActor = this.actors.find((actor) => actor.name === 'Stairs');
    if (stairsActor && this.summoner) {
      const distanceToStairs = this.summoner.pos.distance(stairsActor.pos);
      if (distanceToStairs < 40) {
        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);
        this.nextFloorSequence();
      }
    }
  }

  /**
   * Generates and renders the 3 random HTML card choices directly over the canvas container.
   */
  private showLevelUpDraftOverlay() {
    const overlay = document.getElementById('level-up-overlay');
    const cardsRow = document.getElementById('cards-row');
    if (!overlay || !cardsRow) return;

    // Clear previous draft elements out of the container
    cardsRow.innerHTML = '';

    // Generate 3 unique reward item cards from the logic pool
    const options = generateThreeDraftCards();

    // Map and inject modern responsive DOM card nodes
    options.forEach((card: UpgradeCard) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'upgrade-card';

      cardElement.innerHTML = `
        <div class="card-title">${card.title}</div>
        <div class="card-description">${card.description}</div>
        <div class="card-rarity rarity-${card.rarity.toLowerCase()}">${card.rarity}</div>
      `;

      // Set up click interactions to process upgrades and clean up the overlay
      cardElement.onclick = () => {
        console.log(`Selected Reward Card: ${card.title}`);

        // Apply modification functions directly on targeted parameters
        card.applyReward();

        // Dismiss the overlay layout frame
        overlay.style.display = 'none';

        // Re-display exploration overlay HUD layouts and force metrics redraw
        const htmlHud = document.getElementById('exploration-html-hud');
        if (htmlHud) htmlHud.style.display = 'block';

        if (this.explorationHud) {
          this.explorationHud.updateCoins(state.totalCoins); // Read from synchronized global state
          this.explorationHud.updateFloor(state.currentFloor);
          this.explorationHud.updateXpBar(
            state.currentXp,
            state.xpNeededForLevelUp,
          );
        }

        // Unfreeze player inputs
        this.summoner.canMove = true;
        this.activeEncounterGroup = []; // Clear current group cache safely
        console.log('Reward applied smoothly. Exploration controls restored.');

        // Re-evaluate immediate escape vectors in case player completed battle directly on stairs
        const stairsActor = this.actors.find(
          (actor) => actor.name === 'Stairs',
        );
        if (
          stairsActor &&
          this.summoner &&
          this.summoner.pos.distance(stairsActor.pos) < 40
        ) {
          this.nextFloorSequence();
        }
      };

      cardsRow.appendChild(cardElement);
    });

    // Fade overlay selection grid into view
    overlay.style.display = 'flex';
  }

  onPreUpdate() {
    if (this.isCombatActive) return;

    // Check for Enemy Encounters
    for (const enemy of this.enemies) {
      if (!enemy.isKilled() && this.summoner.pos.distance(enemy.pos) < 40) {
        // --- Group Encounter Logic ---
        const enemyGroup: Enemy[] = [enemy]; // Start with the overworld monster

        // Don't multiply the Boss! Keep boss fights as a solitary challenge.
        if (enemy.enemyName !== 'Boss') {
          // Identify the specific class constructor (e.g., Slime or Ghost)
          const EnemyClass = enemy.constructor as new (
            x: number,
            y: number,
          ) => Enemy;

          // Instantiate 2 extra reinforcement clones of the same type
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
        state.totalCoins += 10; // Read/write directly from state file singleton instance
        this.explorationHud.updateCoins(state.totalCoins);
      }
    });
  }

  /**
   * Sets up collision events for interacting with the pre-rendered floor exit stairs.
   */
  private initStairsCollision(summoner: ex.Actor) {
    summoner.on('collisionstart', (evt) => {
      if (evt.other.owner && evt.other.owner.name === 'Stairs') {
        // Check if there is an active, undefeated Boss on this floor
        const bossIsAlive = this.enemies.some(
          (enemy) => enemy.enemyName === 'Boss' && !enemy.isKilled(),
        );

        if (bossIsAlive) {
          console.log('🔒 The exit stairs are sealed by the Boss guardian!');
          if (Resources.ErrorSound?.isLoaded()) {
            Resources.ErrorSound.play(0.2);
          }
          return; // STOP the sequence here—do not advance to the next floor!
        }

        console.log(
          'Stairs triggered! Initiating floor transition sequence...',
        );
        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);

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
    // 1. CRITICAL CONTEXT SYNC: Increment floor BEFORE layout builds
    state.currentFloor++;

    // 2. Clear out old floor elements from memory while protecting core player and HUD loops
    const actorsToRemove = this.actors.filter((actor) => {
      if (actor === this.summoner || actor.name === 'Summoner') return false;
      if (actor instanceof BattleHUD || actor instanceof ExplorationHUD)
        return false;
      if (this.explorationHud && this.explorationHud.children.includes(actor))
        return false;
      if (this.battleHud && this.battleHud.children.includes(actor))
        return false;
      return true;
    });

    actorsToRemove.forEach((actor) => this.remove(actor));

    // 3. Procedurally build the next level grid configuration (Using 24x24 for better room breathing room)
    const nextEnemies = LevelGenerator.generateFloor(this, 12, 24, 64);
    this.enemies = nextEnemies;
    this.updateCurrentFloorEnemies(nextEnemies);

    // 4. Reposition player character visuals and inputs
    if (this.summoner) {
      this.summoner.z = 10;
      this.summoner.graphics.visible = true;
      this.summoner.canMove = true;

      // Force camera tracking mechanics to bind to the fresh procedural coordinates immediately
      this.camera.pos = this.summoner.pos;
      this.camera.strategy.lockToActor(this.summoner);
      this.camera.zoom = 1.5;
    }

    // 5. Push current data values through to refresh tracking modules
    if (this.explorationHud) {
      this.explorationHud.graphics.visible = true;
      this.explorationHud.z = 100;
      this.explorationHud.updateCoins(state.totalCoins);
      this.explorationHud.updateFloor(state.currentFloor);
      this.explorationHud.updateXpBar(
        state.currentXp,
        state.xpNeededForLevelUp,
      );
    }

    console.log(`Floor B${state.currentFloor} initialized successfully!`);
  }
}
