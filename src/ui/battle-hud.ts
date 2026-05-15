import * as ex from 'excalibur';
import { Enemy } from '../actors/enemy';
import { Resources, game } from '../resources';
import { Element } from '../types/combat';

export class BattleHUD extends ex.ScreenElement {
  private hpBarFills: Map<Enemy, ex.ScreenElement> = new Map();
  private enemyElements: ex.ScreenElement[] = [];
  private partyElements: ex.ScreenElement[] = [];
  private skillButtons: ex.ScreenElement[] = [];

  private currentParty: any[] = [];
  private currentTurnIndex: number = 0;
  private isProcessingVictory: boolean = false;
  private isEnemyTurn: boolean = false;

  // UI Elements
  private turnStatusLabel!: ex.Label;

  public onVictory?: () => void;

  onInitialize() {
    const background = new ex.ScreenElement({
      width: game.drawWidth,
      height: game.drawHeight,
      color: ex.Color.fromHex('#0a0a0a'),
      z: -2,
    });
    this.addChild(background);

    // --- NEW: Turn Status Indicator at the Top ---
    this.turnStatusLabel = new ex.Label({
      text: 'ROLLING INITIATIVE...',
      pos: ex.vec(game.drawWidth / 2, 50),
      font: new ex.Font({
        size: 28,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
        family: 'monospace',
        bold: true,
      }),
    });
    this.addChild(this.turnStatusLabel);

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

  public updateEnemyList(enemies: Enemy[]) {
    const allDynamicElements = [
      ...this.enemyElements,
      ...this.partyElements,
      ...this.skillButtons,
    ];
    allDynamicElements.forEach((el) => this.removeChild(el));

    this.enemyElements = [];
    this.partyElements = [];
    this.skillButtons = [];
    this.hpBarFills.clear();
    this.isProcessingVictory = false;
    this.isEnemyTurn = false;

    if (enemies.length === 0) return;

    enemies.forEach((enemy, i) => {
      const container = new ex.ScreenElement({
        pos: ex.vec(550, 150 + i * 110),
      });

      const portrait = new ex.ScreenElement({ pos: ex.vec(0, 0) });
      portrait.graphics.use(
        enemy.graphics.current?.clone() ?? Resources.EnemySprite.toSprite(),
      );
      container.addChild(portrait);

      const barFill = new ex.ScreenElement({
        pos: ex.vec(60, 10),
        width: 200,
        height: 12,
        color: ex.Color.Red,
        anchor: ex.vec(0, 0.5),
      });
      container.addChild(barFill);
      this.hpBarFills.set(enemy, barFill);

      const label = new ex.Label({
        text: `${enemy.enemyName.toUpperCase()}\nWEAK: ${enemy.weakness}`,
        pos: ex.vec(60, 45),
        font: new ex.Font({
          size: 16,
          color: ex.Color.Cyan,
          family: 'monospace',
        }),
      });
      container.addChild(label);
      this.addChild(container);
      this.enemyElements.push(container);
    });
  }

  public updatePlayerParty(summons: any[]) {
    this.currentParty = summons;
    this.currentTurnIndex = 0;

    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const enemyRoll = Math.floor(Math.random() * 6) + 1;

    if (enemyRoll > playerRoll) {
      this.isEnemyTurn = true;
      this.turnStatusLabel.text = 'ENEMY TURN';
      this.turnStatusLabel.font.color = ex.Color.Red;
      this.refreshPartyUI();
      setTimeout(() => this.enemyTurn(), 400);
    } else {
      this.isEnemyTurn = false;
      const activeDemon = this.currentParty[this.currentTurnIndex];
      this.turnStatusLabel.text = `${activeDemon?.name.toUpperCase()}'S TURN`;
      this.turnStatusLabel.font.color = ex.Color.Cyan;
      this.refreshPartyUI();
    }
  }

  private refreshPartyUI() {
    this.partyElements.forEach((p) => this.removeChild(p));
    this.partyElements = [];

    this.currentParty.forEach((demon, i) => {
      const isCurrent = i === this.currentTurnIndex && !this.isEnemyTurn;

      const container = new ex.ScreenElement({
        pos: ex.vec(250 + i * 200, 550),
      });
      const status = new ex.Label({
        text: `${demon.name.toUpperCase()}\nHP: ${demon.hp}\nMP: ${demon.mp}`,
        font: new ex.Font({
          size: 16,
          color: isCurrent ? ex.Color.Yellow : ex.Color.White,
          family: 'monospace',
          bold: isCurrent,
        }),
      });
      container.addChild(status);
      this.addChild(container);
      this.partyElements.push(container);

      if (isCurrent) this.createSkillMenu(demon.skills);
    });
  }

  private createSkillMenu(skills: string[]) {
    this.skillButtons.forEach((b) => this.removeChild(b));
    this.skillButtons = [];
    skills.forEach((skill, i) => {
      const btn = new ex.ScreenElement({
        pos: ex.vec(80, 320 + i * 55),
        width: 200,
        height: 45,
        color: ex.Color.fromHex('#111111'),
      });
      const label = new ex.Label({
        text: `${i + 1}. ${skill.toUpperCase()}`,
        pos: ex.vec(15, 32),
        font: new ex.Font({
          size: 20,
          color: ex.Color.White,
          family: 'monospace',
        }),
      });
      btn.addChild(label);
      this.addChild(btn);
      this.skillButtons.push(btn);
    });
  }

  private executeSkill(skillIndex: number) {
    const activeDemon = this.currentParty[this.currentTurnIndex];
    if (!activeDemon || !activeDemon.skills[skillIndex]) return;

    const skillName = activeDemon.skills[skillIndex].toLowerCase();
    const aliveEnemies = Array.from(this.hpBarFills.keys()).filter(
      (e) => e.currentHp > 0,
    );
    const target = aliveEnemies[0];

    if (target) {
      let damageType = Element.Physical;
      if (skillName === 'zio') damageType = Element.Electric;
      if (skillName === 'bufu') damageType = Element.Ice;
      if (skillName === 'agi') damageType = Element.Fire;

      target.takeDamage(25, damageType);

      if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.3);

      const stillAlive = Array.from(this.hpBarFills.keys()).filter(
        (e) => e.currentHp > 0,
      );

      if (stillAlive.length === 0) {
        this.showVictoryState();
        return;
      }

      const hitWeakness =
        target.weakness.toLowerCase() === damageType.toLowerCase();

      if (hitWeakness) {
        // Weakness hit: update indicator text to highlight the bonus turn
        this.turnStatusLabel.text = `${activeDemon.name.toUpperCase()} (BONUS TURN)`;
        this.turnStatusLabel.font.color = ex.Color.Yellow;
        this.refreshPartyUI();
      } else {
        this.currentTurnIndex++;

        if (this.currentTurnIndex >= this.currentParty.length) {
          this.skillButtons.forEach((b) => this.removeChild(b));
          this.skillButtons = [];
          this.enemyTurn();
        } else {
          // Update string to show the next dynamic party member's turn
          const nextDemon = this.currentParty[this.currentTurnIndex];
          this.turnStatusLabel.text = `${nextDemon?.name.toUpperCase()}'S TURN`;
          this.turnStatusLabel.font.color = ex.Color.Cyan;
          this.refreshPartyUI();
        }
      }
    }
  }

  public async enemyTurn() {
    this.isEnemyTurn = true;
    this.refreshPartyUI();

    const aliveEnemies = Array.from(this.hpBarFills.keys()).filter(
      (e) => e.currentHp > 0,
    );

    if (aliveEnemies.length === 0) return;

    for (const enemy of aliveEnemies) {
      // Dynamic header updates to specify WHICH enemy is currently acting
      this.turnStatusLabel.text = `${enemy.enemyName.toUpperCase()}'S TURN`;
      this.turnStatusLabel.font.color = ex.Color.Red;

      const target = this.currentParty[0];

      if (target && target.hp > 0) {
        const damage = 10;
        target.hp = Math.max(0, target.hp - damage);

        if (Resources.BlipSound.isLoaded()) Resources.BlipSound.play(0.1);
        this.refreshPartyUI();

        if (target.hp <= 0) {
          this.triggerGameOver();
          return;
        }

        const enemyElement = Element.Physical;
        if (
          target.weakness &&
          target.weakness.toLowerCase() === enemyElement.toLowerCase()
        ) {
          this.turnStatusLabel.text = `${enemy.enemyName.toUpperCase()} (WEAKNESS STRIKE!)`;
          target.hp = Math.max(0, target.hp - 5);
          this.refreshPartyUI();
          if (target.hp <= 0) {
            this.triggerGameOver();
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    this.isEnemyTurn = false;
    this.currentTurnIndex = 0;

    // Hand turn control back over and print out the starting demon's name
    const leadCharacter = this.currentParty[0];
    this.turnStatusLabel.text = `${leadCharacter?.name.toUpperCase()}'S TURN`;
    this.turnStatusLabel.font.color = ex.Color.Cyan;
    this.refreshPartyUI();
  }

  private triggerGameOver() {
    this.isProcessingVictory = true;
    this.turnStatusLabel.text = 'DEFEAT';
    this.turnStatusLabel.font.color = ex.Color.Red;

    const deathLabel = new ex.Label({
      text: 'YOU DIEDD',
      pos: ex.vec(game.drawWidth / 2, game.drawHeight / 2),
      z: 100,
      font: new ex.Font({
        size: 80,
        color: ex.Color.Red,
        family: 'monospace',
        textAlign: ex.TextAlign.Center,
        bold: true,
      }),
    });
    this.addChild(deathLabel);

    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }

  private showVictoryState() {
    this.isProcessingVictory = true;
    this.turnStatusLabel.text = 'VICTORY';
    this.turnStatusLabel.font.color = ex.Color.Yellow;

    const victoryLabel = new ex.Label({
      text: 'VICTORY!',
      pos: ex.vec(game.drawWidth / 2, game.drawHeight / 2),
      z: 100,
      font: new ex.Font({
        size: 60,
        color: ex.Color.Yellow,
        family: 'monospace',
        textAlign: ex.TextAlign.Center,
      }),
    });
    this.addChild(victoryLabel);

    const timer = new ex.Timer({
      interval: 1200,
      fcn: () => {
        this.removeChild(victoryLabel);
        this.onVictory?.();
      },
      repeats: false,
    });

    game.currentScene.add(timer);
    timer.start();
  }

  update() {
    if (!this.graphics.visible) return;
    this.hpBarFills.forEach((fill, enemy) => {
      const ratio = Math.max(0.001, enemy.currentHp / enemy.maxHp);
      if (fill.graphics.current) {
        fill.graphics.current.scale = ex.vec(ratio, 1);
      }
    });
  }

  public setVisible(visible: boolean) {
    this.graphics.visible = visible;
    this.children.forEach((child) => {
      if (child instanceof ex.Actor || child instanceof ex.ScreenElement) {
        child.graphics.visible = visible;
      }
    });
  }
}
