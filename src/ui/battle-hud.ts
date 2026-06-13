import * as ex from 'excalibur';
import { Enemy } from '../actors/enemy';
import { Resources, game } from '../resources';
import { Element } from '../types/combat';
import { state } from '../state'; // Imported state singleton tracking instance
import { Card, CardValidator } from '../logic/card-validator';
import { UpgradeCard } from '../logic/upgrades';

export class BattleHUD extends ex.ScreenElement {
  private currentParty: any[] = [];
  private currentEnemies: Enemy[] = [];
  private currentTurnIndex: number = 0;
  private isProcessingVictory: boolean = false;
  private isEnemyTurn: boolean = false;

  // 🃏 Card Battler System States
  private playerHand: Card[] = [];
  private selectedCards: Card[] = [];

  // UI HTML DOM Elements
  private logFeedElement: HTMLElement | null = null;
  private partyRowElement: HTMLElement | null = null;
  private enemyContainerElement: HTMLElement | null = null;
  private turnStatusElement: HTMLElement | null = null;
  private cardsContainerElement: HTMLElement | null = null;
  private playHandButton: HTMLButtonElement | null = null;
  private passTurnButton: HTMLButtonElement | null = null;

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

    // 🃏 Core Card UI DOM Bindings
    this.cardsContainerElement = document.getElementById(
      'cards-in-hand-container',
    );
    this.playHandButton = document.getElementById(
      'btn-play-hand',
    ) as HTMLButtonElement;
    this.passTurnButton = document.getElementById(
      'btn-pass-turn',
    ) as HTMLButtonElement;

    // Clear background properties to let underlying scene graphics pass through cleanly
    game.backgroundColor = ex.Color.Transparent;

    // Set up standalone button action bindings
    if (this.playHandButton) {
      this.playHandButton.onclick = () => this.executeCardComboAttack();
    }
    if (this.passTurnButton) {
      this.passTurnButton.onclick = () => {
        if (
          !this.graphics.visible ||
          this.isProcessingVictory ||
          this.isEnemyTurn
        )
          return;
        this.pushLog('✦ Player decided to pass strategy phase.', 'system');
        this.enemyTurn();
      };
    }

    this.graphics.visible = false;
  }

  /**
   * Generates a fully randomized, pre-sorted opening hand of 13 cards matching Vietnamese rules.
   */
  private generateOpeningHand() {
    this.selectedCards = [];
    this.playerHand = [];

    const suits: Card['suit'][] = ['SPADES', 'CLUBS', 'DIAMONDS', 'HEARTS'];
    const suitSymbols = { SPADES: '♠', CLUBS: '♣', DIAMONDS: '♦', HEARTS: '♥' };

    for (let i = 0; i < 13; i++) {
      const randomValue = Math.floor(Math.random() * 13) + 3; // Card values from 3 to 15 (2)
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];

      this.playerHand.push({
        id: `card_${i}_${Date.now()}_${Math.random()}`,
        suit: randomSuit,
        value: randomValue,
        name: `${CardValidator.getCardName(randomValue)}${suitSymbols[randomSuit]}`,
      });
    }

    // Natively organize hand rank ascending on deal
    this.playerHand = CardValidator.sortCards(this.playerHand);
  }

  /**
   * Refreshes the HTML Card HUD Row, syncing click listeners, hover transforms, and selection calculations.
   */
  private renderPlayerHandUI() {
    if (!this.cardsContainerElement) return;

    const container = this.cardsContainerElement;
    container.innerHTML = '';

    // Suppress drawing layout changes if it is the enemy's phase
    if (this.isEnemyTurn) {
      if (this.playHandButton) this.playHandButton.disabled = true;
      container.innerHTML = `<div style="color: #8c9ba5; font-size: 12px; margin-bottom: 40px; letter-spacing: 1px;">ENEMY COMBAT RESOLUTION IN PROGRESS...</div>`;
      return;
    }

    this.playerHand.forEach((card) => {
      const cardEl = document.createElement('div');
      const isSelected = this.selectedCards.some((c) => c.id === card.id);

      cardEl.className = `game-card card-suit-${card.suit} ${isSelected ? 'selected' : ''}`;

      // Safely slice suite components for the visual display track center node
      const suitSymbol =
        card.name.length > 0 ? card.name.substring(card.name.length - 1) : '';

      cardEl.innerHTML = `
        <div class="card-corner-top">${card.name}</div>
        <div class="card-center-icon">${suitSymbol}</div>
        <div class="card-corner-bottom" style="transform: rotate(180deg);">${card.name}</div>
      `;

      // Interactive Toggle Loop
      cardEl.onclick = () => {
        if (isSelected) {
          this.selectedCards = this.selectedCards.filter(
            (c) => c.id !== card.id,
          );
        } else {
          this.selectedCards.push(card);
        }

        // Live-evaluate combo properties on click to update buttons reactively
        const evaluation = CardValidator.evaluateHand(this.selectedCards);
        if (this.playHandButton) {
          this.playHandButton.disabled = evaluation.type === 'INVALID';
          this.playHandButton.innerText =
            evaluation.type !== 'INVALID'
              ? `PLAY ${evaluation.type} (${evaluation.element})`
              : 'PLAY SELECTION';
        }

        this.renderPlayerHandUI();
      };

      container.appendChild(cardEl);
    });

    // Handle button reset defaults for empty states
    if (this.selectedCards.length === 0 && this.playHandButton) {
      this.playHandButton.disabled = true;
      this.playHandButton.innerText = 'PLAY SELECTION';
    }
  }

  private syncEnemyCanvasPositions() {
    // Left empty intentionally to prevent rogue canvas actors rendering behind panels
  }

  private updateTurnStatus(text: string, colorHex: string) {
    if (!this.turnStatusElement) return;
    this.turnStatusElement.innerText = text.toUpperCase();
    this.turnStatusElement.style.color = colorHex;
  }

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

  private refreshEnemyUI() {
    if (!this.enemyContainerElement) return;

    const enemyContainer = this.enemyContainerElement;
    enemyContainer.innerHTML = '';

    enemyContainer.style.display = 'flex';
    enemyContainer.style.flexDirection = 'row';
    enemyContainer.style.gap = '24px';
    enemyContainer.style.position = 'absolute';

    // 🎯 RE-POSITIONED GRID ANCHORS FOR THE 1024x768 REWORK
    enemyContainer.style.top = '270px';
    enemyContainer.style.left =
      '260px'; /* Shifted rightwards to center perfectly inside 1024 width */

    if (this.currentEnemies.length === 0) return;

    this.currentEnemies.forEach((enemy, i) => {
      if (enemy.currentHp <= 0) return;

      const hpPercent = Math.max(0, (enemy.currentHp / enemy.maxHp) * 100);
      const spriteFileName =
        enemy.enemyName.toLowerCase().replace(/\s+/g, '') + '.png';
      const spritePath = `/sprites/${spriteFileName}`;

      const enemyCard = document.createElement('div');
      enemyCard.id = `enemy-card-${i}`;
      enemyCard.className = 'party-status-card';
      enemyCard.style.borderColor = '#ff4a4a';
      enemyCard.style.boxShadow = '0 4px 10px rgba(20, 0, 0, 0.4)';
      enemyCard.style.display = 'flex';
      enemyCard.style.flexDirection = 'column';
      enemyCard.style.width = '140px';
      enemyCard.style.boxSizing = 'border-box';

      enemyCard.innerHTML = `
      <div class="card-hero-header" style="display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box;">
        <div style="
          background-image: url('${spritePath}');
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          border: 2px solid #ff4a4a;
          border-radius: 4px;
          background-color: rgba(0, 0, 0, 0.5);
          box-sizing: border-box;
          image-rendering: pixelated;
        "></div>
        <div class="card-hero-name" style="color: #ff4a4a; font-family: monospace; font-weight: bold; font-size: 11px; overflow: hidden; text-overflow: ellipsis;">${enemy.enemyName.toUpperCase()}</div>
      </div>
      
      <div style="font-size: 10px; color: #8c9ba5; font-family: monospace; margin: 4px 0px 8px 0px; text-transform: uppercase; text-align: left; width: 100%;">
        WEAK: ${enemy.weakness || 'NONE'}
      </div>

      <div class="bar-row" style="width: 100%; box-sizing: border-box;">
        <div class="bar-label" style="display: flex; justify-content: space-between; font-family: monospace; font-size: 10px;">
          <span>HP</span>
          <span>${enemy.currentHp}/${enemy.maxHp}</span>
        </div>
        <div class="bar-track" style="border: 1px solid #552222; background: #111; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 4px; width: 100%;">
          <div class="bar-fill-hp" style="width: ${hpPercent}%; background: linear-gradient(90deg, #ff3333, #ff5e5e); height: 100%;"></div>
        </div>
      </div>
    `;

      enemyContainer.appendChild(enemyCard);
    });
  }

  public updatePlayerParty(summons: any[]) {
    this.currentParty = Array.isArray(summons) ? summons : [];
    this.currentTurnIndex = 0;

    // Safety synchronization: Enforce selection gateway priority immediately over default structures
    if (this.currentParty[0]) {
      this.currentParty[0].name =
        (window as any).ACTIVE_DEMON_PARTNER ||
        this.currentParty[0].name ||
        'Pixie';
    }

    this.clearLog();
    this.pushLog('⚔️ Card Battle Initiated... Hand Dealt!', 'system');

    this.isEnemyTurn = false;

    // Deal 13 fresh cards to open up combat
    this.generateOpeningHand();

    const activeDemon = this.currentParty[this.currentTurnIndex];
    const demonName = activeDemon?.name || 'Partner';

    this.updateTurnStatus(`${demonName}'s Turn`, '#00ffcc');
    this.pushLog(
      `✦ Player advantaged phase. Assemble card combos to direct ${demonName.toUpperCase()}'s attacks.`,
      'player',
    );

    this.refreshPartyUI();
    this.renderPlayerHandUI();
  }

  public refreshPartyUI() {
    if (!this.partyRowElement) return;
    this.partyRowElement.innerHTML = '';

    // 1. Fetch our active live-tracked companion data block from the loop array
    const demon = this.currentParty[0];
    if (!demon) return;

    // 2. Force the selection gateway to take priority over instance-level fallbacks
    const chosenPartner =
      (window as any).ACTIVE_DEMON_PARTNER || demon.name || 'Pixie';

    // Ensure the underlying object instance updates its name to match immediately
    if (demon) {
      demon.name = chosenPartner;
    }

    // Resolve the asset path cleanly
    const spritePath = `/sprites/${chosenPartner.toLowerCase().replace(/\s+/g, '')}.png`;

    // 3. Dynamically calculate health & mana bar filling coefficients right now
    const maxHp = demon.maxHp || 100;
    const maxMp = demon.maxMp || 50;

    const hpPercent = Math.max(0, (demon.hp / maxHp) * 100);
    const mpPercent = Math.max(0, (demon.mp / maxMp) * 100);

    // 4. Inject dynamically mapped metrics directly into your template frame
    const partyCardHTML = `
    <div class="party-status-card ${!this.isEnemyTurn ? 'active-turn' : ''}">
      <div class="card-hero-header">
        <div class="card-sprite-slot" style="background-image: url('${spritePath}')"></div>
        <div class="card-hero-name">${chosenPartner.toUpperCase()}</div>
      </div>
      
      <div class="bar-row">
        <div class="bar-label">
          <span>HP</span>
          <span id="party-hp-text">${demon.hp}/${maxHp}</span>
        </div>
        <div class="bar-track" style="border: 1px solid #552222; background: #111; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 4px; width: 100%;">
          <div class="bar-fill-hp" style="width: ${hpPercent}%; background: linear-gradient(90deg, #ff3333, #ff5e5e); height: 100%;"></div>
        </div>
      </div>

      <div class="bar-row">
        <div class="bar-label">
          <span>MP</span>
          <span id="party-mp-text">${demon.mp}/${maxMp}</span>
        </div>
        <div class="bar-track" style="border: 1px solid #222255; background: #111; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 4px; width: 100%;">
          <div class="bar-fill-mp" style="width: ${mpPercent}%; background: linear-gradient(90deg, #2980b9, #3498db); height: 100%;"></div>
        </div>
      </div>
    </div>
  `;

    this.partyRowElement.innerHTML = partyCardHTML;
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

  public triggerLevelUpUI(upgrades: UpgradeCard[]) {
    const overlay = document.getElementById('level-up-overlay');
    let cardsRow = document.getElementById('cards-row');

    if (!overlay) {
      console.error("Could not find '#level-up-overlay' container element.");
      return;
    }

    // Centering fixes to lock it to the canvas viewport bounds
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.backgroundColor = 'rgba(10, 10, 15, 0.9)';
    overlay.style.boxSizing = 'border-box';

    if (cardsRow && cardsRow.parentElement !== overlay) {
      overlay.appendChild(cardsRow);
    }
    if (!cardsRow) {
      cardsRow = document.createElement('div');
      cardsRow.id = 'cards-row';
      overlay.appendChild(cardsRow);
    }

    cardsRow.innerHTML = '';

    cardsRow.style.display = 'flex' as any;
    cardsRow.style.setProperty('display', 'flex', 'important');
    cardsRow.style.flexDirection = 'row';
    cardsRow.style.justifyContent = 'center';
    cardsRow.style.alignItems = 'center';
    cardsRow.style.gap = '16px';
    cardsRow.style.width = '100%';
    cardsRow.style.height = 'auto';
    cardsRow.style.marginTop = '24px';
    cardsRow.style.boxSizing = 'border-box';

    // Loop directly over your actual randomized upgrade data pool
    upgrades.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'upgrade-card-choice-override';

      cardEl.style.display = 'flex';
      cardEl.style.flexDirection = 'column';
      cardEl.style.justifyContent = 'space-between'; // Balanced stack spacing
      cardEl.style.alignItems = 'center';
      cardEl.style.cursor = 'pointer';
      cardEl.style.width = '175px';
      cardEl.style.height = '155px';
      cardEl.style.padding = '14px';
      cardEl.style.backgroundColor = '#151518';
      cardEl.style.border = '2px solid #ffcc00';
      cardEl.style.borderRadius = '8px';
      cardEl.style.boxSizing = 'border-box';
      cardEl.style.textAlign = 'center';

      // Map color tints to your rarities dynamically
      const rarityColor = card.rarity === 'Rare' ? '#00ccff' : card.rarity === 'Epic' ? '#cc00ff' : '#8c9ba5';

      cardEl.innerHTML = `
        <div>
          <div style="color: #ffcc00 !important; font-family: monospace; font-weight: bold; font-size: 13px; margin-bottom: 6px; pointer-events: none;">
            ${card.title.toUpperCase()}
          </div>
          <div style="color: #ffffff !important; font-family: monospace; font-size: 11px; line-height: 1.3; pointer-events: none; margin-bottom: 8px;">
            ${card.description}
          </div>
        </div>
        <div style="color: ${rarityColor} !important; font-family: monospace; font-size: 10px; font-weight: bold; text-transform: uppercase; pointer-events: none;">
          ${card.rarity}
        </div>
      `;

      cardEl.onmouseenter = () => {
        cardEl.style.transform = 'translateY(-4px)';
        cardEl.style.boxShadow = '0 0 12px rgba(255, 204, 0, 0.4)';
      };
      cardEl.onmouseleave = () => {
        cardEl.style.transform = 'translateY(0px)';
        cardEl.style.boxShadow = 'none';
      };

      cardEl.onclick = (e) => {
        e.stopPropagation();

        // 🌟 FIRE THE CORE LOGIC DIRECTLY EMBEDDED IN THE CARD POOL DATA
        card.applyReward();

        if (cardsRow) cardsRow.innerHTML = '';
        overlay.style.display = 'none';

        if (this.scene && (this.scene as any).resumeOverworldAfterUpgrade) {
          (this.scene as any).resumeOverworldAfterUpgrade();
        }
      };

      cardsRow.appendChild(cardEl);
    });
  }

  // private applyUpgradeReward(upgrade: any) {
  //   const activeDemon = this.currentParty[0];
  //   if (activeDemon) {
  //     if (upgrade.stat === 'maxHp') {
  //       activeDemon.maxHp = (activeDemon.maxHp || 100) + upgrade.value;
  //       activeDemon.hp = activeDemon.maxHp; // Heal to full capacity on level up
  //     } else if (upgrade.stat === 'maxMp') {
  //       activeDemon.maxMp = (activeDemon.maxMp || 50) + upgrade.value;
  //       activeDemon.mp = activeDemon.maxMp;
  //     }
  //     this.pushLog(
  //       `✨ Upgraded ${activeDemon.name || 'Partner'}: Gained ${upgrade.title}!`,
  //       'weak',
  //     );
  //   }
  //
  //   this.refreshPartyUI();
  // }

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

  /**
   * Evaluates the selected cards, calculates the damage payload, and executes the attack.
   * Hooks into window.ACTIVE_DEMON_PARTNER to process unique double damage passives.
   */
  private executeCardComboAttack() {
    if (this.isEnemyTurn || this.isProcessingVictory) return;

    const activeDemon = this.currentParty[this.currentTurnIndex];
    if (!activeDemon) return;

    const evaluation = CardValidator.evaluateHand(this.selectedCards);
    if (evaluation.type === 'INVALID') return;

    const aliveEnemies = this.currentEnemies.filter((e) => e.currentHp > 0);
    const target = aliveEnemies[0];

    if (target) {
      // Map the card valuation elements to your system affinity rules
      let elementAffinity = Element.Physical;
      if (evaluation.element === 'ZIO') elementAffinity = Element.Electric;
      if (evaluation.element === 'BUFUX') elementAffinity = Element.Ice;
      if (evaluation.element === 'AGI') elementAffinity = Element.Fire;

      const targetIndex = this.currentEnemies.indexOf(target);

      // Calculate final power footprint factoring draft modifications
      let calculatedPower = evaluation.power;
      const globalPartner = (window as any).ACTIVE_DEMON_PARTNER;

      if (globalPartner === 'Pixie' && evaluation.type === 'PAIR') {
        calculatedPower *= 2.0;
        this.pushLog(
          `✨ [PASSIVE COGNITION] Pixie's Faerie Synergy triggered! Double Combo Damage!`,
          'weak',
        );
      } else if (
        globalPartner === 'Jack Frost' &&
        evaluation.type === 'STRAIGHT'
      ) {
        calculatedPower *= 2.0;
        this.pushLog(
          `✨ [PASSIVE COGNITION] Jack Frost's Hee-Ho Surge triggered! Double Combo Damage!`,
          'weak',
        );
      }

      const finalDamage = Math.round(calculatedPower);
      const activeDemonName = activeDemon.name
        ? activeDemon.name.toUpperCase()
        : 'PARTNER';

      this.pushLog(
        `🃏 ${activeDemonName} plays a ${evaluation.type} (${evaluation.element}) dealing ${finalDamage} DMG to ${target.enemyName.toUpperCase()}!`,
        'player',
      );

      target.takeDamage(finalDamage, elementAffinity);

      if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.3);

      // Discard played cards out of player's hand state
      this.playerHand = this.playerHand.filter(
        (card) =>
          !this.selectedCards.some((selected) => selected.id === card.id),
      );

      this.selectedCards = [];
      this.refreshEnemyUI();

      // Trigger structural HTML shake animation on target element card
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
          { duration: 200, iterations: 1 },
        );
      }

      const stillAlive = this.currentEnemies.filter((e) => e.currentHp > 0);
      if (stillAlive.length === 0) {
        this.pushLog(`🏆 All hostile targets neutralized!`, 'system');
        this.showVictoryState();
        return;
      }

      const hitWeakness =
        target.weakness.toLowerCase() === elementAffinity.toLowerCase();

      if (hitWeakness) {
        this.updateTurnStatus(
          `${activeDemon.name || 'Partner'} (1 MORE)`,
          '#ffcc00',
        );
        this.pushLog(
          `✨ WEAKNESS BREAKTHROUGH! ${target.enemyName.toUpperCase()} staggered! 1 Extra Combo permitted!`,
          'weak',
        );
        this.refreshPartyUI();
        this.renderPlayerHandUI();
      } else {
        this.currentTurnIndex++;

        // If your cards run dry mid-fight, force-rotate priority to the enemy phase
        if (
          this.currentTurnIndex >= this.currentParty.length ||
          this.playerHand.length === 0
        ) {
          this.enemyTurn();
        } else {
          const nextDemon = this.currentParty[this.currentTurnIndex];
          this.updateTurnStatus(
            `${nextDemon?.name || 'Partner'}'s Turn`,
            '#00ffcc',
          );
          this.refreshPartyUI();
          this.renderPlayerHandUI();
        }
      }
    }
  }

  public async enemyTurn() {
    this.isEnemyTurn = true;
    this.selectedCards = []; // Wipe any unresolved selection buffers
    this.refreshPartyUI();
    this.renderPlayerHandUI();

    const aliveEnemies = this.currentEnemies.filter((e) => e.currentHp > 0);
    if (aliveEnemies.length === 0) return;

    for (const enemy of aliveEnemies) {
      this.updateTurnStatus(`${enemy.enemyName}'s Turn`, '#ff4a4a');

      const target = this.currentParty[0];

      if (target && target.hp > 0) {
        const damage = 10;
        target.hp = Math.max(0, target.hp - damage);

        const targetName = target.name ? target.name.toUpperCase() : 'PARTNER';
        this.pushLog(
          `💥 ${enemy.enemyName.toUpperCase()} attacks ${targetName} for ${damage} DMG.`,
          'enemy',
        );

        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.1);
        this.refreshPartyUI();

        if (target.hp <= 0) {
          this.pushLog(`💀 ${targetName} collapsed in battle!`, 'enemy');
          this.triggerGameOver();
          return;
        }

        const enemyElement = Element.Physical;
        if (
          target.weakness &&
          target.weakness.toLowerCase() === enemyElement.toLowerCase()
        ) {
          game.currentScene.camera.shake(8, 8, 250);
          this.updateTurnStatus(`ENEMY WEAKNESS STRIKE!`, '#ffcc00');
          this.pushLog(
            `⚠️ CRITICAL PUNISHMENT! Weakness struck on ${targetName}!`,
            'weak',
          );

          target.hp = Math.max(0, target.hp - 5);
          this.refreshPartyUI();

          if (target.hp <= 0) {
            this.pushLog(`💀 ${targetName} collapsed in battle!`, 'enemy');
            this.triggerGameOver();
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    // Top up card reserves back to full hand capacity if it dropped too low for structural combinations
    if (this.playerHand.length < 5) {
      this.pushLog(
        '🃏 Low card inventory detected. Replenishing deck reserves...',
        'system',
      );
      this.generateOpeningHand();
    }

    this.isEnemyTurn = false;
    this.currentTurnIndex = 0;

    const leadCharacter = this.currentParty[0];
    this.updateTurnStatus(
      `${leadCharacter?.name || 'Partner'}'s Turn`,
      '#00ffcc',
    );
    this.pushLog(`✦ Player Phase restored. Choose your actions.`, 'player');

    this.refreshPartyUI();
    this.renderPlayerHandUI();
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

    this.currentEnemies.forEach((enemy) => {
      enemy.graphics.visible = false;
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
      this.renderPlayerHandUI();
    }
  }

  override onPostKill() {
    this.setVisible(false);
  }
}
