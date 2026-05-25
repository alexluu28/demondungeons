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
  private summoner!: Summoner;
  private battleHud!: BattleHUD;
  private explorationHud!: ExplorationHUD;
  private enemies: Enemy[] = [];
  private isCombatActive: boolean = false;
  private activeEncounterGroup: Enemy[] = [];

  override onInitialize() {
    // 1. Player Setup (Instantiated once)
    this.summoner = new Summoner(0, 0);
    this.summoner.name = 'Summoner';
    this.add(this.summoner);

    // 2. Persistent UI Elements Setup
    this.explorationHud = new ExplorationHUD();
    this.add(this.explorationHud);

    this.battleHud = new BattleHUD();
    this.battleHud.onVictory = () => this.endCombat(this.activeEncounterGroup);
    this.add(this.battleHud);

    // Camera Configuration
    this.camera.pos = this.summoner.pos;
    this.camera.strategy.lockToActor(this.summoner);
    this.camera.zoom = 1.5;

    this.initStairsCollision(this.summoner);
  }

  /**
   * Fires EVERY time this scene becomes active.
   * This guarantees that resources are 100% ready before any tiles are placed.
   */
  override onActivate(context: ex.SceneActivationContext<unknown>) {
    super.onActivate(context);
    console.log('DungeonScene activated. Safe asset injection ready.');

    // Generate the initial floor structure now that resources are definitively in memory
    if (this.enemies.length === 0) {
      // Cast 'this' as any to seamlessly match Excalibur's generic typing structure
      this.enemies = LevelGenerator.generateFloor(this as any, 12, 24, 64);
    }
  }

  public startCombat(enemyGroup: Enemy[]) {
    if (this.isCombatActive) return;
    this.isCombatActive = true;
    this.summoner.canMove = false;
    this.activeEncounterGroup = enemyGroup;

    // Hide world visuals and persistent HTML exploration HUD elements
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

  public endCombat(defeatedGroup?: Enemy[]) {
    this.isCombatActive = false;
    this.explorationHud.graphics.visible = true;

    const enemiesDefeated =
      defeatedGroup && defeatedGroup.length > 0 ? defeatedGroup.length : 3;
    console.log(
      `Combat resolved. Processing rewards for ${enemiesDefeated} elements.`,
    );

    // 1. Drop loot tokens at the coordinate anchor points
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

    // 2. Clean out old overworld encounter targets from memory
    if (defeatedGroup) {
      defeatedGroup.forEach((enemy) => {
        enemy.kill(); // Safely flag for removal from engine tracking
        this.remove(enemy);
      });
      // Filter out killed enemies from the main tracking list
      this.enemies = this.enemies.filter((e) => !e.isKilled());
    }

    this.battleHud.updateEnemyList([]);
    this.battleHud.setVisible(false);

    // 3. Restore Visibility to survivors
    this.entities.forEach((entity) => {
      if (
        entity instanceof ex.Actor &&
        !entity.isKilled() &&
        !(entity instanceof BattleHUD)
      ) {
        entity.graphics.visible = true;
      }
    });

    // --- Experience Modifications Track ---
    const xpEarned = enemiesDefeated * 35;
    const didLevelUp = state.gainXp(xpEarned);

    // Synchronize global metrics out to the HTML layout container
    const levelText = document.getElementById('hud-level-text');
    const fillElement = document.getElementById('xp-bar-fill');
    const textElement = document.getElementById('xp-bar-text');

    if (levelText) levelText.innerText = `${state.currentLevel}`;
    if (fillElement) {
      fillElement.style.width = `${Math.min(100, (state.currentXp / state.xpNeededForLevelUp) * 100)}%`;
    }
    if (textElement) {
      textElement.innerText = `${state.currentXp} / ${state.xpNeededForLevelUp} XP`;
    }

    // Capture standard post-fight rewards immediately in local storage tracking loop
    if (!didLevelUp) {
      state.saveGame();
    }

    if (didLevelUp) {
      this.summoner.canMove = false;
      this.showLevelUpDraftOverlay();
      return;
    }

    // Restore persistent exploration HTML layout if no level up intercepted control flow
    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'block';

    this.summoner.canMove = true;
    this.activeEncounterGroup = [];

    // Evaluate structural transitions if player won right on the exit tile
    const stairsActor = this.actors.find((actor) => actor.name === 'Stairs');
    if (
      stairsActor &&
      this.summoner &&
      this.summoner.pos.distance(stairsActor.pos) < 40
    ) {
      if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);
      this.nextFloorSequence();
    }
  }

  private showLevelUpDraftOverlay() {
    const overlay = document.getElementById('level-up-overlay');
    const cardsRow = document.getElementById('cards-row');
    if (!overlay || !cardsRow) return;

    cardsRow.innerHTML = '';
    const options = generateThreeDraftCards();

    options.forEach((card: UpgradeCard) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'upgrade-card';

      cardElement.innerHTML = `
        <div class="card-title">${card.title}</div>
        <div class="card-description">${card.description}</div>
        <div class="card-rarity rarity-${card.rarity.toLowerCase()}">${card.rarity}</div>
      `;

      cardElement.onclick = () => {
        card.applyReward();
        overlay.style.display = 'none';

        const htmlHud = document.getElementById('exploration-html-hud');
        if (htmlHud) htmlHud.style.display = 'block';

        const levelText = document.getElementById('hud-level-text');
        const fillElement = document.getElementById('xp-bar-fill');
        const textElement = document.getElementById('xp-bar-text');

        if (levelText) levelText.innerText = `${state.currentLevel}`;
        if (fillElement) {
          fillElement.style.width = `${Math.min(100, (state.currentXp / state.xpNeededForLevelUp) * 100)}%`;
        }
        if (textElement) {
          textElement.innerText = `${state.currentXp} / ${state.xpNeededForLevelUp} XP`;
        }

        // Commit save cleanly after draft card has mutated attributes
        state.saveGame();

        this.summoner.canMove = true;
        this.activeEncounterGroup = [];

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

    overlay.style.display = 'flex';
  }

  override onPreUpdate() {
    if (this.isCombatActive) return;

    // Check for Enemy Encounters
    for (const enemy of this.enemies) {
      if (!enemy.isKilled() && this.summoner.pos.distance(enemy.pos) < 40) {
        const enemyGroup: Enemy[] = [enemy];

        if (enemy.enemyName !== 'Boss') {
          const EnemyClass = enemy.constructor as new (
            x: number,
            y: number,
          ) => Enemy;

          const reinforcement1 = new EnemyClass(enemy.pos.x, enemy.pos.y);
          const reinforcement2 = new EnemyClass(enemy.pos.x, enemy.pos.y);

          // Register reinforcements directly into the scene tracking array
          this.add(reinforcement1);
          this.add(reinforcement2);

          enemyGroup.push(reinforcement1, reinforcement2);
        }

        this.startCombat(enemyGroup);
        break;
      }
    }

    // Check for Coin Collection
    this.entities.forEach((entity) => {
      if (
        entity instanceof Coin &&
        !entity.isKilled() &&
        this.summoner.pos.distance(entity.pos) < 30
      ) {
        entity.kill();
        this.remove(entity);
        state.totalCoins += 10;

        // Autosave on item pickup so dynamic gold gains persist immediately
        state.saveGame();
      }
    });
  }

  private initStairsCollision(summoner: ex.Actor) {
    summoner.on('collisionstart', (evt) => {
      if (evt.other.owner && evt.other.owner.name === 'Stairs') {
        const bossIsAlive = this.enemies.some(
          (enemy) => enemy.enemyName === 'Boss' && !enemy.isKilled(),
        );

        if (bossIsAlive) {
          console.log('🔒 The exit stairs are sealed by the Boss guardian!');
          if (Resources.ErrorSound?.isLoaded()) Resources.ErrorSound.play(0.2);
          return;
        }

        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.2);
        this.nextFloorSequence();
      }
    });
  }

  public updateCurrentFloorEnemies(enemies: Enemy[]) {
    this.enemies = enemies;
  }

  private nextFloorSequence() {
    state.currentFloor++;

    // Commit progress to browser storage immediately upon advancing layout levels
    state.saveGame();

    const actorsToRemove = this.actors.filter((actor) => {
      if (actor === this.summoner || actor.name === 'Summoner') return false;
      if (actor instanceof BattleHUD || actor instanceof ExplorationHUD)
        return false;
      return true;
    });

    actorsToRemove.forEach((actor) => {
      actor.kill();
      this.remove(actor);
    });

    // Cast 'this' as any to match generic signature tracks smoothly
    const nextEnemies = LevelGenerator.generateFloor(this as any, 12, 24, 64);
    this.enemies = nextEnemies;

    if (this.summoner) {
      this.summoner.z = 10;
      this.summoner.graphics.visible = true;
      this.summoner.canMove = true;

      this.camera.pos = this.summoner.pos;
      this.camera.strategy.lockToActor(this.summoner);
      this.camera.zoom = 1.5;
    }

    console.log(`Floor B${state.currentFloor} initialized successfully!`);
  }
}
