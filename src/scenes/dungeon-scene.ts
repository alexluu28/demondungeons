import * as ex from 'excalibur';
import { Summoner } from '../actors/summoner';
import { Enemy } from '../actors/enemy';
import { Coin } from '../actors/coin';
import { LevelGenerator } from '../logic/level-generator';
import { BattleHUD } from '../ui/battle-hud';
import { ExplorationHUD } from '../ui/exploration-hud';
import { generateThreeDraftCards } from '../logic/upgrades';
import { Resources } from '../resources';
import { state } from '../state';

export class DungeonScene extends ex.Scene {
  private summoner!: Summoner;
  private battleHud!: BattleHUD;
  private explorationHud!: ExplorationHUD;
  private stageBackground!: ex.Actor; // Tracks combat backdrop
  private enemies: Enemy[] = [];
  private isCombatActive: boolean = false;
  private activeEncounterGroup: Enemy[] = [];

  override onInitialize() {
    // 1. Setup Battle Screen Background Actor
    this.stageBackground = new ex.Actor({
      x: 0,
      y: 0,
      width: this.engine.screen.resolution.width || 800,
      height: this.engine.screen.resolution.height || 600,
      coordPlane: ex.CoordPlane.Screen,
    });
    this.stageBackground.anchor = ex.vec(0, 0);

    if (Resources.BattleBackground && Resources.BattleBackground.isLoaded()) {
      const bgSprite = Resources.BattleBackground.toSprite();
      bgSprite.origin = ex.vec(0, 0);
      this.stageBackground.graphics.use(bgSprite);
    } else {
      console.warn('⚠️ BattleBackground asset is un-loaded or path broken.');
    }

    this.add(this.stageBackground);
    this.stageBackground.z = -100;
    this.stageBackground.graphics.visible = false;

    // 2. Setup Player Instance
    this.summoner = new Summoner(0, 0);
    this.summoner.name = 'Summoner';
    this.add(this.summoner);

    // 3. Persistent UI Modules Setup
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
   * Fires every time this scene becomes active in the engine.
   */
  override onActivate(context: ex.SceneActivationContext<unknown>) {
    super.onActivate(context);
    console.log('DungeonScene activated.');

    // Regenerate layout upon dynamic entrance setups or loading fresh profiles
    if (this.enemies.length === 0 || state.currentFloor % 3 !== 0) {
      this.generateNewFloorLayout();
    }
  }

  /**
   * Clears out old stage components and leverages LevelGenerator return values to cleanly place the player.
   */
  private generateNewFloorLayout() {
    console.log(
      `🎲 Generating dynamic layout for Floor B${state.currentFloor}...`,
    );

    // Purge old stage actors safely
    this.actors.forEach((actor) => {
      if (
        actor !== this.summoner &&
        !(actor instanceof BattleHUD) &&
        !(actor instanceof ExplorationHUD) &&
        actor !== this.stageBackground
      ) {
        actor.kill();
        this.remove(actor);
      }
    });

    // Populate fresh monster arrays and gather structural player vector paths
    const generationResult = LevelGenerator.generateFloor(this, 12, 24, 64);
    this.enemies = generationResult.enemies;

    // Direct structural positioning mapping avoids scene cache collision delays
    if (this.summoner) {
      this.summoner.pos = generationResult.playerSpawnVector.clone();
      console.log(
        `✨ Summoner aligned with active room space at: ${this.summoner.pos.toString()}`,
      );

      this.summoner.z = 10;
      this.summoner.canMove = true;
      this.summoner.graphics.visible = true;
      this.camera.pos = this.summoner.pos;
    }

    // Direct HUD Layer alignment pass
    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'block';

    this.updateXpBarHUD();
  }

  /**
   * Synchronizes experience tracking variables and currency totals to the browser HTML layout context.
   */
  private updateXpBarHUD() {
    const levelText = document.getElementById('hud-level-text');
    const fillElement = document.getElementById('xp-bar-fill');
    const textElement = document.getElementById('xp-bar-text');
    const coinTextElement = document.getElementById('hud-coin-text');

    // 🌟 CONNECTED: Targets the exact ID from your index.html
    const floorTextElement = document.getElementById('hud-floor-text');

    if (levelText) levelText.innerText = `${state.currentLevel}`;
    if (coinTextElement) coinTextElement.innerText = `${state.totalCoins}`;

    // 🌟 UPDATED: Injects the dynamic floor level directly into the DOM
    if (floorTextElement) {
      floorTextElement.innerText = `B${state.currentFloor}`;
    }

    if (fillElement) {
      const xpPercent = Math.min(
        100,
        (state.currentXp / state.xpNeededForLevelUp) * 100,
      );
      fillElement.style.width = `${xpPercent}%`;
    }
    if (textElement) {
      textElement.innerText = `${state.currentXp} / ${state.xpNeededForLevelUp} XP`;
    }
  }

  public startCombat(enemyGroup: Enemy[]) {
    if (this.isCombatActive) return;
    this.isCombatActive = true;
    this.summoner.canMove = false;
    this.activeEncounterGroup = enemyGroup;

    this.stageBackground.graphics.visible = true;

    this.explorationHud.graphics.visible = false;
    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'none';

    this.entities.forEach((entity) => {
      if (
        entity instanceof ex.Actor &&
        !(entity instanceof BattleHUD) &&
        entity !== this.stageBackground
      ) {
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
    this.stageBackground.graphics.visible = false;

    const enemiesDefeated =
      defeatedGroup && defeatedGroup.length > 0 ? defeatedGroup.length : 3;
    console.log(
      `Combat resolved. Processing rewards for ${enemiesDefeated} elements.`,
    );

    // 1. Drop gold tokens
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

    // 2. Clear out defeated entities
    if (defeatedGroup) {
      defeatedGroup.forEach((enemy) => {
        enemy.kill();
        this.remove(enemy);
      });
      this.enemies = this.enemies.filter((e) => !e.isKilled());
    }

    this.battleHud.updateEnemyList([]);
    this.battleHud.setVisible(false);

    // 3. Restore visibility to world survivors
    this.entities.forEach((entity) => {
      if (
        entity instanceof ex.Actor &&
        !entity.isKilled() &&
        !(entity instanceof BattleHUD) &&
        entity !== this.stageBackground
      ) {
        entity.graphics.visible = true;
      }
    });

    // Calculate level progression math loops
    const xpEarned = enemiesDefeated * 35;
    const didLevelUp = state.gainXp(xpEarned);

    this.updateXpBarHUD();

    if (!didLevelUp) {
      state.saveGame();
    }

    if (didLevelUp) {
      this.summoner.canMove = false;

      const overlay = document.getElementById('level-up-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }

      const freshDraftChoices = generateThreeDraftCards();
      this.battleHud.triggerLevelUpUI(freshDraftChoices);
      return;
    }

    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'block';

    this.summoner.canMove = true;
    this.activeEncounterGroup = [];

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

          this.add(reinforcement1);
          this.add(reinforcement2);
          enemyGroup.push(reinforcement1, reinforcement2);
        } else {
          // 🛡️ Kill the overworld boss actor instantly on grid tracking systems
          // so it cannot survive or reappear behind the HTML UI layout.
          enemy.kill();
        }

        this.startCombat(enemyGroup);
        break;
      }
    }

    // Check for Coin Collections
    this.entities.forEach((entity) => {
      if (
        entity instanceof Coin &&
        !entity.isKilled() &&
        this.summoner.pos.distance(entity.pos) < 30
      ) {
        entity.kill();
        this.remove(entity);
        state.totalCoins += 10;
        state.saveGame();
      }
    });
  }

  override onPostUpdate() {
    if (
      this.isCombatActive &&
      this.stageBackground &&
      this.stageBackground.graphics.current
    ) {
      const currentWidth = this.engine.screen.resolution.width;
      const currentHeight = this.engine.screen.resolution.height;
      const activeSprite = this.stageBackground.graphics.current as ex.Sprite;

      if (activeSprite) {
        activeSprite.width = currentWidth;
        activeSprite.height = currentHeight;
        activeSprite.destSize = { width: currentWidth, height: currentHeight };
      }
    }
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

  public resumeOverworldAfterUpgrade() {
    const htmlHud = document.getElementById('exploration-html-hud');
    if (htmlHud) htmlHud.style.display = 'block';

    this.updateXpBarHUD();
    state.saveGame();

    this.summoner.canMove = true;
    this.activeEncounterGroup = [];

    const stairsActor = this.actors.find((actor) => actor.name === 'Stairs');
    if (
      stairsActor &&
      this.summoner &&
      this.summoner.pos.distance(stairsActor.pos) < 40
    ) {
      this.nextFloorSequence();
    }
  }

  private nextFloorSequence() {
    // 1. Check if the floor the player JUST CLEARED is a multiple of 3
    if (state.currentFloor % 3 === 0) {
      console.log(
        `🛒 Floor B${state.currentFloor} cleared! Routing to Shop Intermission...`,
      );

      // Increment the floor tracker so they land on Floor 4 when they leave the shop
      state.currentFloor++;
      state.saveGame();

      this.engine.goToScene('shop');
      return;
    }

    // 2. Otherwise, simply advance to the next standard floor layout
    state.currentFloor++;
    state.saveGame();

    this.generateNewFloorLayout();
    console.log(`Floor B${state.currentFloor} initialized successfully!`);
  }
}
