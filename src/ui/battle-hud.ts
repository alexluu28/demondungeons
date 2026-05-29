import * as ex from 'excalibur';
import { Enemy } from '../actors/enemy';
import { Resources, game } from '../resources';
import { Element } from '../types/combat';
import { state } from '../state'; // Imported state singleton tracking instance

export class BattleHUD extends ex.ScreenElement {
  private currentParty: any[] = [];
  private currentEnemies: Enemy[] = [];
  private currentTurnIndex: number = 0;
  private isProcessingVictory: boolean = false;
  private isEnemyTurn: boolean = false;

  // UI HTML DOM Elements
  private logFeedElement: HTMLElement | null = null;
  private partyRowElement: HTMLElement | null = null;
  private enemyContainerElement: HTMLElement | null = null;
  private turnStatusElement: HTMLElement | null = null;

  public onVictory?: () => void;

  onInitialize() {
    // Reference HTML nodes injected via DOM structure
    this.logFeedElement = document.getElementById('battle-log-feed');
    this.partyRowElement = document.getElementById('battle-party-row');

    // Fallback detection hooks targeting center layout IDs/classes
    this.enemyContainerElement =
      document.getElementById('battle-enemy-container') ||
      document.querySelector('.battle-enemy-container');
    this.turnStatusElement =
      document.getElementById('battle-turn-status') ||
      document.querySelector('.battle-turn-status');

    // Force engine clear color opacity to prevent default canvas backgrounds from bleeding through
    game.backgroundColor = ex.Color.Transparent;

    // Create a dynamic world actor for the custom background image stage
    const backgroundImageActor = new ex.Actor({
      x: game.drawWidth / 2,
      y: game.drawHeight / 2,
      width: game.drawWidth,
      height: game.drawHeight,
      z: -10, // Pushes it completely behind everything else on the canvas
    });

    // Pair the loaded image asset directly onto the background actor layer
    if (Resources.BattleBackground && Resources.BattleBackground.isLoaded()) {
      const bgSprite = Resources.BattleBackground.toSprite();

      // Forces the sprite asset to stretch perfectly across the configured canvas dimensions
      bgSprite.destSize = {
        width: game.drawWidth,
        height: game.drawHeight,
      };

      backgroundImageActor.graphics.use(bgSprite);
    } else {
      // Emergency solid fallback tile color just in case the asset fails to load over network paths
      const fallbackGraphic = new ex.Rectangle({
        width: game.drawWidth,
        height: game.drawHeight,
        color: ex.Color.fromHex('#1a1a24'),
      });
      backgroundImageActor.graphics.use(fallbackGraphic);
    }

    // Add the custom background actor to this screen element hierarchy block
    this.addChild(backgroundImageActor);

    game.input.keyboard.on('press', (evt) => {
      if (
        !this.graphics.visible ||
        this.isProcessingVictory ||
        this.isEnemyTurn
      )
        return;

      if (evt.key === ex.Keys.Digit1 || evt.key === ex.Keys.Num1)
        this.executeSkill(0);
      if (evt.key === ex.Keys.Digit2 || evt.key === ex.Keys.Num2)
        this.executeSkill(1);
    });

    this.graphics.visible = false;
  }

  /**
   * Refreshes and positions enemy actors horizontally across the top-middle canvas stage area.
   * Suppressed: Visual sprites are now fully decoupled from Excalibur canvas layers
   * and rendered inside HTML templates to resolve layout occlusion bugs.
   */
  private syncEnemyCanvasPositions() {
    // Left empty intentionally to prevent rogue canvas actors rendering behind panels
  }

  /**
   * Updates the center-top turn banner status smoothly via HTML stylings.
   */
  private updateTurnStatus(text: string, colorHex: string) {
    if (!this.turnStatusElement) return;
    this.turnStatusElement.innerText = text.toUpperCase();
    this.turnStatusElement.style.color = colorHex;
  }

  /**
   * Helper utility to print combat events directly to the HTML scrolling log frame.
   */
  public pushLog(
    message: string,
    type: 'player' | 'enemy' | 'weak' | 'system' = 'system',
  ) {
    if (!this.logFeedElement) return;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry-${type}`;
    logEntry.style.marginBottom = '4px';
    logEntry.innerText = message;

    this.logFeedElement.appendChild(logEntry);
    this.logFeedElement.scrollTop = this.logFeedElement.scrollHeight;
  }

  public clearLog() {
    if (this.logFeedElement) this.logFeedElement.innerHTML = '';
  }

  public updateEnemyList(enemies: Enemy[]) {
    this.currentEnemies = enemies;
    this.isProcessingVictory = false;
    this.isEnemyTurn = false;

    this.syncEnemyCanvasPositions();
    this.refreshEnemyUI();
  }

  /**
   * Renders enemy layout status cards into a clean, horizontal row mirroring the party UI structure.
   */
  private refreshEnemyUI() {
    if (!this.enemyContainerElement) return;

    const enemyContainer = this.enemyContainerElement;
    enemyContainer.innerHTML = '';

    // Enforce horizontal layout properties matching your original HUD configuration
    enemyContainer.style.display = 'flex';
    enemyContainer.style.flexDirection = 'row';
    enemyContainer.style.gap = '20px';
    enemyContainer.style.position = 'absolute';
    enemyContainer.style.top = '240px';
    enemyContainer.style.left = '160px';

    if (this.currentEnemies.length === 0) return;

    this.currentEnemies.forEach((enemy, i) => {
      if (enemy.currentHp <= 0) return;

      const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);

      const spriteFileName =
        enemy.enemyName.toLowerCase().replace(/\s+/g, '') + '.png';
      const spritePath = `/sprites/${spriteFileName}`;

      const enemyCard = document.createElement('div');
      // Assign the ID to keep your working HTML shake impact animations happy!
      enemyCard.id = `enemy-card-${i}`;

      // Use your exact CSS class names from the party status cards
      enemyCard.className = 'party-status-card';

      // Slight modifications to make it fit your enemy specifications and expand the sprite dimensions
      enemyCard.style.borderColor = '#ff4a4a'; // Red enemy identifier border
      enemyCard.style.boxShadow = '0 4px 10px rgba(20, 0, 0, 0.4)';
      enemyCard.style.display = 'flex';
      enemyCard.style.flexDirection = 'column';

      enemyCard.innerHTML = `
      <div class="card-hero-header" style="display: flex; align-items: center; gap: 10px; width: 100%;">
        <div style="
          background-image: url('${spritePath}');
          width: 64px;
          height: 64px;
          min-width: 64px;
          min-height: 64px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          border: 2px solid #ff4a4a;
          border-radius: 4px;
          background-color: rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
        "></div>
        <div class="card-hero-name" style="color: #ff4a4a; font-family: monospace; font-weight: bold;">${enemy.enemyName.toUpperCase()}</div>
      </div>
      
      <div style="font-size: 10px; color: #8c9ba5; font-family: monospace; margin: 8px 0px 8px 0px; text-transform: uppercase; text-align: left; width: 100%;">
        WEAK: ${enemy.weakness || 'NONE'}
      </div>

      <div class="bar-row" style="width: 100%;">
        <div class="bar-label" style="display: flex; justify-content: space-between; font-family: monospace; font-size: 11px;">
          <span>HP</span>
          <span>${enemy.currentHp}/${enemy.maxHp}</span>
        </div>
        <div class="bar-track" style="border: 1px solid #552222; background: #111; height: 8px; border-radius: 3px; overflow: hidden; margin-top: 4px; width: 100%;">
          <div class="bar-fill-hp" style="width: ${hpPercent}%; background: linear-gradient(90deg, #ff3333, #ff5e5e); height: 100%;"></div>
        </div>
      </div>
    `;

      enemyContainer.appendChild(enemyCard);
    });
  }

  public updatePlayerParty(summons: any[]) {
    this.currentParty = summons;
    this.currentTurnIndex = 0;

    this.clearLog();
    this.pushLog('⚔️ Combat Initiation... Rolling Initiative!', 'system');

    this.isEnemyTurn = false;
    const activeDemon = this.currentParty[this.currentTurnIndex];
    this.updateTurnStatus(`${activeDemon?.name}'s Turn`, '#00ffcc');
    this.pushLog(
      `✦ Player advantage secured! ${activeDemon?.name.toUpperCase()} prepares an action.`,
      'player',
    );
    this.refreshPartyUI();
  }

  private refreshPartyUI() {
    if (!this.partyRowElement) return;
    const partyRow = this.partyRowElement;
    partyRow.innerHTML = '';

    this.currentParty.forEach((demon, i) => {
      const isCurrent = i === this.currentTurnIndex && !this.isEnemyTurn;

      const spriteFileName =
        demon.name.toLowerCase().replace(/\s+/g, '') + '.png';
      const spritePath = `/sprites/${spriteFileName}`;

      const hpPercent = Math.max(0, (demon.hp / (demon.maxHp || 100)) * 100);
      const mpPercent = Math.max(0, (demon.mp / (demon.maxMp || 50)) * 100);

      const card = document.createElement('div');
      card.className = `party-status-card ${isCurrent ? 'active-turn' : ''}`;

      card.innerHTML = `
      <div class="card-hero-header">
        <div class="card-sprite-slot" style="background-image: url('${spritePath}');"></div>
        <div class="card-hero-name">${demon.name.toUpperCase()}</div>
      </div>
      
      <div class="bar-row">
        <div class="bar-label">
          <span>HP</span>
          <span>${demon.hp}/${demon.maxHp || 100}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill-hp" style="width: ${hpPercent}%;"></div>
        </div>
      </div>

      <div class="bar-row">
        <div class="bar-label">
          <span>MP</span>
          <span>${demon.mp}/${demon.maxMp || 50}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill-mp" style="width: ${mpPercent}%;"></div>
        </div>
      </div>
    `;

      partyRow.appendChild(card);

      if (isCurrent) this.createSkillMenu(demon.skills);
    });
  }

  /**
   * Generates localized selection action buttons inside the active player frame space
   */
  private createSkillMenu(skills: string[]) {
    const activeCard = this.partyRowElement?.querySelector(
      '.party-status-card.active-turn',
    );
    if (!activeCard) return;

    const skillMenuWrapper = document.createElement('div');
    skillMenuWrapper.className = 'skill-menu-wrapper';
    skillMenuWrapper.style.marginTop = '10px';
    skillMenuWrapper.style.display = 'flex';
    skillMenuWrapper.style.flexDirection = 'column';
    skillMenuWrapper.style.gap = '4px';

    skills.forEach((skill, i) => {
      const btn = document.createElement('button');
      btn.className = 'battle-skill-btn';
      btn.style.width = '100%';
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '11px';
      btn.style.textAlign = 'left';
      btn.innerText = `${i + 1}. ${skill.toUpperCase()}`;

      btn.onclick = () => this.executeSkill(i);
      skillMenuWrapper.appendChild(btn);
    });

    activeCard.appendChild(skillMenuWrapper);
  }

  private showVictoryState() {
    this.isProcessingVictory = true;
    this.updateTurnStatus('VICTORY', '#ffcc00');

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(10, 25, 20, 0.85)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontSize = '60px';
    overlay.style.color = '#ffcc00';
    overlay.style.fontWeight = 'bold';
    overlay.style.zIndex = '10000';
    overlay.innerText = 'VICTORY!';

    const parentContainer =
      document.getElementById('battle-html-hud') ||
      this.partyRowElement?.parentElement;
    parentContainer?.appendChild(overlay);

    const timer = new ex.Timer({
      interval: 1200,
      fcn: () => {
        overlay.remove();
        this.setVisible(false);
        this.onVictory?.();
      },
      repeats: false,
    });

    game.currentScene.add(timer);
    timer.start();
  }

  private triggerGameOver() {
    this.isProcessingVictory = true;
    this.updateTurnStatus('DEFEAT', '#ff4a4a');
    this.pushLog(`❌ Party wiped out. Defeat...`, 'enemy');

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(20, 0, 0, 0.85)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.fontSize = '60px';
    overlay.style.color = '#ff4a4a';
    overlay.style.fontWeight = 'bold';
    overlay.style.zIndex = '10000';
    overlay.innerText = 'YOU DIED';

    const parentContainer =
      document.getElementById('battle-html-hud') ||
      this.partyRowElement?.parentElement;
    parentContainer?.appendChild(overlay);

    setTimeout(() => {
      state.resetOnDeath();
      window.location.reload();
    }, 3000);
  }

  private executeSkill(skillIndex: number) {
    const activeDemon = this.currentParty[this.currentTurnIndex];
    if (!activeDemon || !activeDemon.skills[skillIndex]) return;

    const skillName = activeDemon.skills[skillIndex].toLowerCase();
    const aliveEnemies = this.currentEnemies.filter((e) => e.currentHp > 0);
    const target = aliveEnemies[0];

    if (target) {
      let damageType = Element.Physical;
      if (skillName === 'zio') damageType = Element.Electric;
      if (skillName === 'bufu') damageType = Element.Ice;
      if (skillName === 'agi') damageType = Element.Fire;

      // Track exact position index of current enemy target
      const targetIndex = this.currentEnemies.indexOf(target);

      this.pushLog(
        `${activeDemon.name.toUpperCase()} casted ${skillName.toUpperCase()} on ${target.enemyName.toUpperCase()}!`,
        'player',
      );
      target.takeDamage(25, damageType);

      if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.3);

      this.refreshEnemyUI();

      // 💥 TRIGGER HTML SHAKE IMPACT EFFECT DIRECTLY ON THE ELEMENT
      const targetCard = document.getElementById(`enemy-card-${targetIndex}`);
      if (targetCard) {
        targetCard.animate(
          [
            { transform: 'translateX(0px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0px)' },
          ],
          {
            duration: 200,
            iterations: 1,
          },
        );
      }

      const stillAlive = this.currentEnemies.filter((e) => e.currentHp > 0);

      if (stillAlive.length === 0) {
        this.pushLog(`🏆 All hostile targets neutralized!`, 'system');
        this.showVictoryState();
        return;
      }

      const hitWeakness =
        target.weakness.toLowerCase() === damageType.toLowerCase();

      if (hitWeakness) {
        this.updateTurnStatus(`${activeDemon.name} (1 MORE)`, '#ffcc00');
        this.pushLog(
          `✨ WEAKNESS STRIKE! ${target.enemyName.toUpperCase()} staggered! 1 More Turn granted!`,
          'weak',
        );
        this.refreshPartyUI();
      } else {
        this.currentTurnIndex++;

        if (this.currentTurnIndex >= this.currentParty.length) {
          this.enemyTurn();
        } else {
          const nextDemon = this.currentParty[this.currentTurnIndex];
          this.updateTurnStatus(`${nextDemon?.name}'s Turn`, '#00ffcc');
          this.refreshPartyUI();
        }
      }
    }
  }

  public async enemyTurn() {
    this.isEnemyTurn = true;
    this.refreshPartyUI();

    const aliveEnemies = this.currentEnemies.filter((e) => e.currentHp > 0);
    if (aliveEnemies.length === 0) return;

    for (const enemy of aliveEnemies) {
      this.updateTurnStatus(`${enemy.enemyName}'s Turn`, '#ff4a4a');

      const target = this.currentParty[0];

      if (target && target.hp > 0) {
        const damage = 10;
        target.hp = Math.max(0, target.hp - damage);
        this.pushLog(
          `💥 ${enemy.enemyName.toUpperCase()} attacks ${target.name.toUpperCase()} for ${damage} DMG.`,
          'enemy',
        );

        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.1);
        this.refreshPartyUI();

        if (target.hp <= 0) {
          this.pushLog(
            `💀 ${target.name.toUpperCase()} collapsed in battle!`,
            'enemy',
          );
          this.triggerGameOver();
          return;
        }

        const enemyElement = Element.Physical;
        if (
          target.weakness &&
          target.weakness.toLowerCase() === enemyElement.toLowerCase()
        ) {
          // Trigger an intense screen shudder when the player takes heavy weakness damage
          game.currentScene.camera.shake(8, 8, 250);

          this.updateTurnStatus(`ENEMY WEAKNESS STRIKE!`, '#ffcc00');
          this.pushLog(
            `⚠️ CRITICAL PUNISHMENT! Weakness struck on ${target.name.toUpperCase()}!`,
            'weak',
          );
          target.hp = Math.max(0, target.hp - 5);
          this.refreshPartyUI();
          if (target.hp <= 0) {
            this.pushLog(
              `💀 ${target.name.toUpperCase()} collapsed in battle!`,
              'enemy',
            );
            this.triggerGameOver();
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    this.isEnemyTurn = false;
    this.currentTurnIndex = 0;

    const leadCharacter = this.currentParty[0];
    this.updateTurnStatus(`${leadCharacter?.name}'s Turn`, '#00ffcc');
    this.pushLog(`✦ Player Phase restored. Choose your actions.`, 'player');
    this.refreshPartyUI();
  }

  update() {
    // Kept as no-op tracking since DOM updates are pushed reactively via UI event loops
  }

  public setVisible(visible: boolean) {
    this.graphics.visible = visible;

    const mainHUD = document.getElementById('battle-html-hud');
    if (mainHUD) {
      mainHUD.style.display = visible ? 'block' : 'none';
    }

    // Direct graphic overrides to ensure clean layers
    this.currentEnemies.forEach((enemy) => {
      if (enemy.currentHp > 0) {
        enemy.graphics.visible = visible;
      }
    });

    this.children.forEach((child) => {
      if (child instanceof ex.Actor || child instanceof ex.ScreenElement) {
        child.graphics.visible = visible;
      }
    });

    if (visible) {
      this.syncEnemyCanvasPositions();
      this.refreshEnemyUI();
      this.refreshPartyUI();
    }
  }

  override onPostKill() {
    this.setVisible(false);
  }
}
