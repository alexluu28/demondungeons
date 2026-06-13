import * as ex from 'excalibur';

// 1. Define your asset mappings
export const Resources = {
  FloorSprite: new ex.ImageSource('/sprites/floor.png'),
  WallSprite: new ex.ImageSource('/sprites/wallsprite.png'),
  SummonerSprite: new ex.ImageSource('/sprites/summoner.png'),
  EnemySprite: new ex.ImageSource('/sprites/enemy.png'),
  GhostSprite: new ex.ImageSource('/sprites/ghost.png'),
  CoinSprite: new ex.ImageSource('/sprites/coin.png'), // Add this if you have a coin asset
  PixieSprite: new ex.ImageSource('/sprites/pixie.png'),
  JackFrostSprite: new ex.ImageSource('/sprites/jackfrost.png'),
  BattleBackground: new ex.ImageSource('/sprites/battle-bg.png'),
  SlimeSprite: new ex.ImageSource('/sprites/slime.png'),
  StairsSprite: new ex.ImageSource('/sprites/stairs.png'),
  BossSprite: new ex.ImageSource('/sprites/boss.png'),

  // Audio Tracks
  BlipSound: new ex.Sound('/sounds/blip.wav'),
  ErrorSound: new ex.Sound('/sounds/error.wav'),
};

// 2. Initialize the Engine
export const game = new ex.Engine({
  width: 1024,
  height: 768,
  canvasElementId: 'game',
  displayMode: ex.DisplayMode.FitScreen,
  pointerScope: ex.PointerScope.Canvas,
  snapToPixel: true,
  antialiasing: false, // Keeps your pixel art sharp!
});

// 3. PERMANENT FIX: Pass ALL resources explicitly into the array deck
export const loader = new ex.Loader([
  Resources.FloorSprite,
  Resources.WallSprite,
  Resources.SummonerSprite,
  Resources.EnemySprite,
  Resources.GhostSprite,
  Resources.CoinSprite,
  Resources.BlipSound,
  Resources.ErrorSound,
  Resources.PixieSprite,
  Resources.JackFrostSprite,
  Resources.BattleBackground,
  Resources.SlimeSprite,
  Resources.StairsSprite,
  Resources.BossSprite,
]);
