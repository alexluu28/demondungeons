import * as ex from 'excalibur';

// 1. Define the Engine
export const game = new ex.Engine({
  width: 800,
  height: 600,
  displayMode: ex.DisplayMode.FitScreen,
  backgroundColor: ex.Color.fromHex('#1a1a1a'),
});


export const Resources = {
  // Sprites
  SummonerSprite: new ex.ImageSource('./sprites/summoner.png'),
  EnemySprite: new ex.ImageSource('./sprites/enemy.png'),
  BossSprite: new ex.ImageSource('./sprites/boss.png'),
  CoinSprite: new ex.ImageSource('./sprites/coin.png'),
  StairsSprite: new ex.ImageSource('./sprites/stairs.png'),

  //enemy sprites
  GhostSprite: new ex.ImageSource('./sprites/ghost.png'),
  SlimeSprite: new ex.ImageSource('./sprites/slime.png'),

  // Combat Sounds
  HitSound: new ex.Sound('sounds/hit.wav'),
  WeaknessSound: new ex.Sound('sounds/crit.wav'),
  EnemyDeath: new ex.Sound('sounds/death.wav'),

  //background
  FloorSprite: new ex.ImageSource('./sprites/floor.png'),

  // UI & Loot
  CoinSound: new ex.Sound('sounds/coin.wav'),
  BuySound: new ex.Sound('sounds/buy.wav'),
  BlipSound: new ex.Sound('sounds/blip.wav'),

  // Music
  DungeonMusic: new ex.Sound('sounds/dungeon_theme.mp3'),
};

// Create a loader to handle these assets
export const loader = new ex.Loader();
for (const res in Resources) {
  loader.addResource((Resources as any)[res]);
}
