// src/actors/boss.ts
import * as ex from 'excalibur';
import { Enemy } from './enemy';
import { Summoner } from './summoner';

export class Boss extends Enemy {
  constructor(x: number, y: number) {
    super(x, y);
    this.maxHp = 100;
    this.currentHp = 100; // Standard enemies have ~15-20
    this.color = ex.Color.Red;
    this.scale = ex.vec(1.5, 1.5); // Make him physically imposing
  }

  // Override attack to be more punishing
  public override attackSummoner(summoner: Summoner) {
    console.log('BOSS SMASH!');
    summoner.takeDamage(25); // Standard enemies do ~10
  }
}
