import Phaser from 'phaser';
import { getWalletClient } from '@wagmi/core';
import { recoverMessageAddress } from 'viem';

type TowerNFT = {
  id: number;
  type: 'basic' | 'rapid' | 'cannon';
  level: number;
  damage: number;
  range: number;
  speed: number;
  imageUrl: string;
  used?: boolean;
  fireRate?:number;
};
const towerTypes = ['basic', 'rapid', 'cannon'] as const;
type TowerType = typeof towerTypes[number];
export default class Survival extends Phaser.Scene {
// ---------------------------------------------------------------------------
// 📦 Core Game Objects
// ---------------------------------------------------------------------------
assetsLoaded: boolean = false;
selectedTileHighlight?: Phaser.GameObjects.Rectangle;
bulletGroup!: Phaser.GameObjects.Group;
enemyGroup!: Phaser.GameObjects.Group;
grid!: { hasTower: boolean }[][];
sessionToken?: string;
gameId?: string;
currentLevel: number = 1; // You can later update this if you support multi-level
waveCount: number = 0;
totalEnemiesKilled: number = 0;
hudBar!: Phaser.GameObjects.Rectangle;
MAX_WAVE: number = 500;
path!: Phaser.Curves.Path;
selectedTile?: { col: number, row: number };
selectedTilePos?: { x: number; y: number };
tower!: Phaser.GameObjects.Arc;
towerSelectHighlight?: Phaser.GameObjects.Rectangle;
towerSelectPanel?: Phaser.GameObjects.Container;
towers: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform)[] = [];
walletAddress: string = '';
ownedTowers: TowerNFT[] = [];
towerNFTs: {
  id: number;
  type: 'basic' | 'rapid' | 'cannon';
  level: number;
  damage: number;
  range: number;
  speed: number;
  imageUrl: string;
  used?: boolean;
}[] = [];
// ---------------------------------------------------------------------------
// 💰 Currency, Lives & Game State
// ---------------------------------------------------------------------------
currentEnemyHP: Partial<Record<string, number>> = {};
currentEnemyReward: Partial<Record<string, number>> = {};
gameOver: boolean = false;
hasSavedVine: boolean = false;
isPaused: boolean = false;
levelNumber: number = 1; // default, can be overridden
lives: number = 10;
livesText!: Phaser.GameObjects.Text;
totalEnemiesDestroyed = 0;
totalEnemiesKilledByPhysics = 0;
vineBalance: number = 40; // Starting MOO
vineText!: Phaser.GameObjects.Text;
waveText!: Phaser.GameObjects.Text;
// ---------------------------------------------------------------------------
// 🗺️ Grid & Map
// ---------------------------------------------------------------------------
heartIcons: Phaser.GameObjects.Text[] = [];
mapCols: number = 10;
mapOffsetX: number = 0;
mapOffsetY: number = 0;
mapRows: number = 8;
tileMap: number[][] = [];
tileSize: number = 64;
tileSprites: Phaser.GameObjects.Rectangle[][] = [];
// ---------------------------------------------------------------------------
// 📈 Wave & Enemy Tracking
// ---------------------------------------------------------------------------
canSpawnEnemies: boolean = false;
enemyQueue: string[] = []; // Enemies to spawn this wave
enemySpawnEvent!: Phaser.Time.TimerEvent;
enemiesEscaped: number = 0;
enemiesKilled: number = 0;
enemiesPerWave: number = 5;
enemiesSpawned: number = 0;
waveNumber: number = 0;
// ---------------------------------------------------------------------------
// 🏹 Towers & Upgrades
// ---------------------------------------------------------------------------
activeTower?: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & { getData: Function };
activeUpgradeButton?: Phaser.GameObjects.Text;
activeUpgradeCost?: number;
canSelectTile: boolean = true;
currentTowerType: string = 'basic'; // Default selected tower type
nextRangeCircle?: Phaser.GameObjects.Arc;
rangeCircle?: Phaser.GameObjects.Arc;
upgradePanelOpen: boolean = false;
// ---------------------------------------------------------------------------
// Constructor: Initializes the main game scene
// ---------------------------------------------------------------------------
constructor() {
  super('Survival');
}
// ---------------------------------------------------------------------------
// preload(): Loads all required image assets before the game starts
// ---------------------------------------------------------------------------
preload() {
  this.load.image('basicTowerRight', 'https://admin.demwitches.xyz/assets/archerturret.png');
  this.load.image('basicTowerLeft', 'https://admin.demwitches.xyz/assets/archerturretleft.png');
  this.load.image('cannonTowerRight', 'https://admin.demwitches.xyz/assets/cannonturret.png');
  this.load.image('cannonTowerLeft', 'https://admin.demwitches.xyz/assets/cannonturretleft.png');
  this.load.image('rapidTowerRight', 'https://admin.demwitches.xyz/assets/rapidturret.png');
  this.load.image('rapidTowerLeft', 'https://admin.demwitches.xyz/assets/rapidturretleft.png');
  this.load.image('enemyNormal', 'https://admin.demwitches.xyz/assets/normalenemy.png');
  this.load.image('enemyFast', 'https://admin.demwitches.xyz/assets/fastenemy.png');
  this.load.image('enemyTank', 'https://admin.demwitches.xyz/assets/tankenemy.png');
  this.load.image('basicTower', 'assets/towers/basic.png');
  this.load.image('rapidTower', 'assets/towers/rapid.png');
  this.load.image('cannonTower', 'assets/towers/cannon.png');

  // Callback once all assets are loaded
  this.load.once('complete', () => {
    console.log('✅ All assets loaded.');
    this.assetsLoaded = true;
  });
}
// ---------------------------------------------------------------------------
// showRewardText(): Displays a floating reward text at a given position
// ---------------------------------------------------------------------------
getNextAvailableTower(type: 'basic' | 'rapid' | 'cannon') {
  return this.ownedTowers.find((tower) => tower.type === type && !tower.used);
}

showToast(message: string) {
  const toast = this.add.text(this.scale.width / 2, 40, message, {
    fontSize: '18px',
    fontFamily: 'Outfit',
    color: '#FF4F66',
    backgroundColor: '#1A1F2B',
    padding: { x: 12, y: 6 },
  })
    .setOrigin(0.5)
    .setDepth(2000)
    .setAlpha(0);

  this.tweens.add({
    targets: toast,
    alpha: 1,
    duration: 200,
    ease: 'Power1',
    yoyo: true,
    hold: 1500,
    onComplete: () => toast.destroy(),
  });
}
markTowerAsUsed(towerId: number) {
  const tower = this.ownedTowers.find(t => t.id === towerId);
  if (tower) {
    tower.used = true;
    console.log(`🛠️ Marked tower ${towerId} as used`);
  }
}

placeTowerFromNFT(col: number, row: number, towerNFT: any) {
  // 🧠 Safety: Ensure the grid is defined and tile is valid
  if (!this.grid || !this.grid[col] || this.grid[col][row] === undefined) {
    console.warn(`❌ Invalid tile coords: col=${col}, row=${row}`);
    return;
  }

  const x = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
  const y = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;

  // 🖼️ Choose image based on type + right-facing
  const imageKey = `${towerNFT.type.toLowerCase()}TowerRight`;
  if (!this.textures.exists(imageKey)) {
    console.warn(`⚠️ Missing tower texture: ${imageKey}`);
    return;
  }

  const speed = towerNFT.speed ?? 1000; // default to 1000ms if missing
  const tower = this.add.image(x, y, imageKey)
    .setScale(0.069)
    .setDepth(1)
    .setData('towerId', towerNFT.id)
    .setData('type', towerNFT.type)
    .setData('level', towerNFT.level)
    .setData('damage', towerNFT.damage)
    .setData('range', towerNFT.range)
    .setData('speed', speed)
    .setData('lastFired', 0);


  this.towers.push(tower);
  this.grid[col][row].hasTower = true;

  // ✅ Mark as used so it can't be reused
  this.markTowerAsUsed(towerNFT.id);
}
resetUsedTowers() {
  this.ownedTowers.forEach(tower => {
    tower.used = false;
  });
}
getTowerAtTile(col: number, row: number): Phaser.GameObjects.Image | undefined {
  const tileX = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
  const tileY = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;

  return this.towers.find((tower) =>
    Math.abs(tower.x - tileX) < 1 &&
    Math.abs(tower.y - tileY) < 1
  ) as Phaser.GameObjects.Image | undefined;
}

showRewardText(x: number, y: number, amount: number) {
  const rewardText = this.add.text(x, y - 12, `+${amount} $MOO`, {
    fontSize: '18px',
    fontFamily: 'Outfit',
    fontStyle: 'bold',
    color: '#00FF66',
    backgroundColor: '',
    padding: { left: 6, right: 6, top: 2, bottom: 2 }
  }).setOrigin(0.5).setAlpha(1).setDepth(5000);
  this.tweens.add({
    targets: rewardText,
    y: rewardText.y - 20,
    alpha: 0,
    duration: 1000,
    ease: 'Cubic.easeOut',
    onComplete: () => rewardText.destroy()
  });
}
// ---------------------------------------------------------------------------
// killEnemy(): Handles logic when an enemy is killed, including rewards
// ---------------------------------------------------------------------------
killEnemy(enemy: Phaser.GameObjects.Arc) {
  const reward = enemy.getData('reward') || 0;
  this.vineBalance += reward;
  const { x, y } = enemy.getCenter();
  this.showRewardText(x, y, reward);
  this.vineText.setText(`$MOO: ${this.vineBalance}`);
  const bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;
  const barBg = enemy.getData('hpBarBg') as Phaser.GameObjects.Rectangle;
  bar?.destroy();
  barBg?.destroy();
  enemy.destroy();
  this.enemiesKilled++;
  this.checkWaveOver();
  console.log(`✅ killEnemy() executed at (${x}, ${y}) with reward ${reward}`);
}
// ---------------------------------------------------------------------------
// cleanupGameObjects(): Resets and clears all active game objects and state
// ---------------------------------------------------------------------------
cleanupGameObjects(fullReset = false) {
  this.waveNumber = 0;
  this.waveCount = 0;  // Add this line to reset wave count
  this.enemySpawnEvent?.remove(false);
  this.time.clearPendingEvents();
  this.time.removeAllEvents();
  this.hasSavedVine = false;
  this.resetUsedTowers();    // 👈 reset tower usage here
  this.enemyGroup.getChildren().forEach((enemyObj) => {
    const hpBar = enemyObj.getData?.('hpBar');
    const hpBarBg = enemyObj.getData?.('hpBarBg');
    hpBar?.destroy();
    hpBarBg?.destroy();
    enemyObj.destroy();
  });
  // Destroy any lingering health bars
  this.children.getAll().forEach(child => {
    if (child.name === 'hpBar' || child.name === 'hpBarBg') child.destroy();
  });
  // Destroy tower selection UI
  this.towerSelectPanel?.destroy();
  this.towerSelectPanel = undefined;
  this.towerSelectHighlight?.destroy();
  this.towerSelectHighlight = undefined;
  this.enemyGroup.clear(true, true);
  this.bulletGroup.getChildren().forEach(b => b.destroy());
  this.bulletGroup.clear(true, true);
  this.towers.forEach(tower => {
    const timer = tower.getData?.('shootTimer');
    timer?.remove(true);
    tower.getData?.('levelText')?.destroy();
    tower.disableInteractive?.();
    tower.destroy();
  });
  this.towers = [];
  // Reset map tile visuals
  this.tileMap.forEach((row, r) => {
    row.forEach((tile, c) => {
      if (tile === 2) this.tileMap[r][c] = 1;
      this.tileSprites[r][c].setFillStyle(tile === 0 ? 0x00B3FF : 0x00FFE7);
    });
  });
  if (fullReset) {
    this.resetUsedTowers();    // 👈 reset tower usage here
    this.vineBalance = 40;
    this.lives = 10;
    this.waveNumber = 0;
    this.waveCount = 0;  // Add this line to reset wave count    this.gameOver = false;
    this.isPaused = false;
    this.updateLivesDisplay(this.lives);
    this.vineText.setText(`$MOO: ${this.vineBalance}`);
    this.waveText.setText(`Wave: 1`);
  } else {
    this.physics.pause();
    this.isPaused = true;
  }
  this.canSelectTile = false;
  if (fullReset) {
    this.rangeCircle?.destroy();
    this.rangeCircle = undefined;
    this.nextRangeCircle?.destroy();
    this.nextRangeCircle = undefined;
    const upgradePanel = this.children.getByName('upgradePanel');
    upgradePanel?.destroy();
    this.upgradePanelOpen = false;
    this.activeTower = undefined;
    this.activeUpgradeButton = undefined;
    this.activeUpgradeCost = undefined;
  }
}
// ---------------------------------------------------------------------------
// create(): Sets up the game scene — map, HUD, path, selectors, towers, UI
// ---------------------------------------------------------------------------
async create() {
  console.log('✅ survival created');
  console.log('🧠 NFT Towers Loaded:', this.towerNFTs);
  this.hasSavedVine = false;
  // 🔐 Fetch sessionToken and gameId
try {
  const res = await fetch('https://metadata-server-production.up.railway.app/api/start-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet: this.walletAddress })
  });
  const { sessionToken, gameId } = await res.json();
  this.sessionToken = sessionToken;
  this.gameId = gameId;
  console.log('🎟️ Game session started:', this.gameId);
} catch (err) {
  console.error('❌ Failed to start game session', err);
}
  // Screen and Map Dimensions
  const screenWidth = Number(this.game.config.width);
  const screenHeight = Number(this.game.config.height);
  const mapWidth = this.mapCols * this.tileSize;
  const mapHeight = this.mapRows * this.tileSize;
  this.mapOffsetX = (screenWidth - mapWidth) / 2;
  this.mapOffsetY = (screenHeight - mapHeight) / 2;
  this.grid = Array.from({ length: this.mapCols }, () =>
    Array.from({ length: this.mapRows }, () => ({ hasTower: false }))
  );
  

  // External Pause / Resume Game Functions
  (window as any).pauseGameFromUI = () => {
    this.isPaused = true;
    this.canSelectTile = false; // ⛔ Disable tile selection
    this.physics.pause();
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.paused = true;
    }
    this.towers.forEach(t => {
      const timer = t.getData('shootTimer');
      if (timer) timer.paused = true;
    });
    this.bulletGroup.getChildren().forEach(b => {
      const timer = b.getData('despawnTimer');
      if (timer) timer.paused = true;
    });
  };
  (window as any).resumeGameFromUI = () => {
    this.isPaused = false;
    this.canSelectTile = true; // Enable tile selection
    this.physics.resume();
    if (this.enemySpawnEvent) this.enemySpawnEvent.paused = false;
    this.towers.forEach(t => {
      const timer = t.getData('shootTimer');
      if (timer) timer.paused = false;
    });
    this.bulletGroup.getChildren().forEach(b => {
      const timer = b.getData('despawnTimer');
      if (timer) timer.paused = false;
    });
  };
  // Define Enemy Path
  const pathTiles = [
    [0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 6], [3, 6],
    [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4],
    [5, 5], [5, 6], [6, 6], [7, 6], [7, 5], [7, 4], [7, 3], [7, 2], [7, 1], [8, 1], [9, 1]
  ];
  const [startCol, startRow] = pathTiles[0];
  this.path = this.add.path(
    this.mapOffsetX + startCol * this.tileSize + this.tileSize / 2,
    this.mapOffsetY + startRow * this.tileSize + this.tileSize / 2
  );
  for (let i = 1; i < pathTiles.length; i++) {
    const [col, row] = pathTiles[i];
    this.path.lineTo(
      this.mapOffsetX + col * this.tileSize + this.tileSize / 2,
      this.mapOffsetY + row * this.tileSize + this.tileSize / 2
    );
  }
  // HUD: MOO, Wave, Lives, Heart Icons
  const hudY = 10;
  const textStyle = {
  fontSize: '45px',
  fontFamily: 'Outfit',
  color: '#DFFBFF',
  resolution: window.devicePixelRatio || 1
  };
  const vineText = this.add.text(0, 0, '$MOO: 40', textStyle).setScale(0.5);
  const waveText = this.add.text(0, 0, 'Wave: 1', textStyle).setScale(0.5);
  const livesLabel = this.add.text(0, 0, 'Lives:', textStyle).setScale(0.5);
  const padding = 64;
  const heartSpacing = 22;
  const heartWidth = 5 * heartSpacing;
  const totalWidth =
  vineText.displayWidth +
  waveText.displayWidth +
  livesLabel.displayWidth +
  heartWidth +
  padding * 3;
  const centerX = Number(this.game.config.width) / 2;
  let startX = centerX - totalWidth / 2;
  vineText.setPosition(startX, hudY); startX += vineText.displayWidth + padding;
  waveText.setPosition(startX, hudY); startX += waveText.displayWidth + padding;
  livesLabel.setPosition(startX, hudY); startX += livesLabel.displayWidth + 8;
  this.heartIcons = [];
  for (let i = 0; i < 10; i++) {
  const col = i % 5;
  const row = Math.floor(i / 5);
  const x = startX + col * heartSpacing;
  const y = hudY + row * 18 - 4;
  const heart = this.add.text(x, y, '❤️', { fontSize: '20px' })
  .setInteractive({ useHandCursor: false })
  .setData('originalY', y)
  .on('pointerover', () => {
    if (heart.alpha === 1) {
      this.tweens.killTweensOf(heart); // 🔪 Kill any existing tweens first
      this.tweens.add({
        targets: heart,
        y: heart.getData('originalY') - 8,
        ease: 'Sine.easeOut',
        duration: 100,
        yoyo: true,
        onComplete: () => {
          heart.setY(heart.getData('originalY')); // 🧲 Force reset
        }
      });
    }
  })
  .on('pointerout', () => {
    if (heart.alpha === 1 && heart.y !== heart.getData('originalY')) {
      this.tweens.killTweensOf(heart);
      this.tweens.add({
        targets: heart,
        y: heart.getData('originalY'),
        ease: 'Sine.easeInOut',
        duration: 80
      });
    }
  });
  this.heartIcons.push(heart);
  }
  this.vineText = vineText;
  this.waveText = waveText;
  this.updateLivesDisplay(10);
  // Tile Map Setup
  this.tileMap = Array.from({ length: this.mapRows }, () => Array(this.mapCols).fill(1));
  for (const [col, row] of pathTiles) this.tileMap[row][col] = 0;
  for (let row = 0; row < this.mapRows; row++) {
  this.tileSprites[row] = [];
  for (let col = 0; col < this.mapCols; col++) {
  const x = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
  const y = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;
  const type = this.tileMap[row][col];
  const color = type === 0 ? 0x00B3FF : 0x00FFE7;
  const tile = this.add.rectangle(x, y, this.tileSize - 2, this.tileSize - 2, color)
  .setInteractive()
  .setAlpha(0.2);
  this.tileSprites[row][col] = tile;
  if (type === 1) {
    tile.on('pointerdown', () => {
      if (this.canSelectTile && !this.towerSelectPanel) {
        this.canSelectTile = false;
        
        const tower = this.getTowerAtTile(col, row);
        if (tower) {
          this.showUpgradePanel(tower);
        } else {
          this.showTowerSelectPanel(col, row);
        }
      }
    });    
  }}
  }
  // Enemy and Bullet Groups + Collision Handling
  this.enemyGroup = this.add.group();
  this.bulletGroup = this.add.group();
  this.enemySpawnEvent = this.time.addEvent({
    delay: 1000,
    callback: this.spawnEnemy,
    callbackScope: this,
    loop: true
  });
  this.physics.add.overlap(this.bulletGroup, this.enemyGroup, (bulletObj, enemyObj) => {
    const bullet = bulletObj as Phaser.GameObjects.Arc;
    const enemy = enemyObj as Phaser.GameObjects.Arc;
    const damage = bullet.getData('damage');
    let hp = enemy.getData('hp');
    if (typeof damage !== 'number') return;
    hp -= damage;
    const hit = this.add.circle(enemy.x, enemy.y, 10, 0x00FFE7).setAlpha(0.6);
    this.tweens.add({
      targets: hit,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => hit.destroy(),
    });
    bullet.destroy();
    console.log(`🎯 Bullet hit: enemy HP before = ${hp + damage}, damage = ${damage}`);
    if (hp <= 0) {
      console.log(`✅ Entered kill block at (${enemy.x}, ${enemy.y})`);
      this.totalEnemiesKilled++;
      const reward = enemy.getData('reward') || 0;
      this.vineBalance += reward;
      const { x, y } = enemy.getCenter();
      this.showRewardText(x, y, reward);
      this.vineText.setText(`$MOO: ${this.vineBalance}`);
      enemy.getData('hpBar')?.destroy();
      enemy.getData('hpBarBg')?.destroy();
      enemy.destroy();
      this.enemiesKilled++;
      this.checkWaveOver();
    } else {
      enemy.setData('hp', hp);
      const maxHp = enemy.getData('maxHp');
      const bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;
      if (bar) {
        const percent = hp / maxHp;
        bar.width = 20 * percent;
        bar.setFillStyle(percent > 0.5 ? 0x00FFE7 : percent > 0.25 ? 0xffa500 : 0xff0000);
      }
    }
  });
  // Start First Wave
  this.startNextWave();
  const buttonRadius = 24;
  const marginX = 20 + buttonRadius;
  const marginY = this.scale.height - 90;
  const spacingY = 60;
// Helper to create a circular emoji button
const createCircleButton = (
  x: number,
  y: number,
  emoji: string,
  onClick: () => void
) => {
  const buttonRadius = 24;
  const circle = this.add.circle(0, 0, buttonRadius, 0x1A1F2B)
    .setStrokeStyle(2, 0x00B3FF)
    .setDepth(1000);
  const xOffset = ['⟳', '🔈', '🔇'].includes(emoji) ? 2 : 0;
  const yOffset = ['⟳'].includes(emoji) ? -2 : 0;
  const icon = this.add.text(xOffset, yOffset, emoji, {
    fontSize: emoji === '⟳' ? '35px' : emoji === '⏸' || emoji === '▶️' ? '26px' : '20px',
    fontFamily: 'Outfit',
    color: '#00B3FF',
    resolution: window.devicePixelRatio || 1
  }).setOrigin(0.5)
    .setDepth(1001);
  const container = this.add.container(x, y, [circle, icon])
    .setSize(buttonRadius * 2, buttonRadius * 2)
    .setDepth(1000)
    .setScrollFactor(0)
    .setInteractive(
      new Phaser.Geom.Circle(20, 20, buttonRadius),
      Phaser.Geom.Circle.Contains
    );
  // 🖱 Hover scale
  container.on('pointerover', () => {
    this.tweens.add({
      targets: container,
      scale: 1.1,
      duration: 150,
      ease: 'Power2'
    });
  });
  // ❌ Exit hover
  container.on('pointerout', () => {
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 150,
      ease: 'Power2'
    });
  });
  // 👆 Click squish + fire
  container.on('pointerdown', () => {
    this.tweens.add({
      targets: container,
      scale: 0.95,
      duration: 80,
      ease: 'Power1',
      yoyo: true,
      onComplete: onClick
    });
  });

  return { container, icon };
};


// Move buttons to the right side
const buttonX = this.cameras.main.width - marginX;
// 🧭 Main Menu Button (blue, rounded, text-based, above pause button)
const menuButtonSize = 48;
const menuButtonBg = this.add.rectangle(
  buttonX + 6,
  marginY - 5 - spacingY * 2,
  menuButtonSize,
  menuButtonSize,
  0x00B3FF // 🔵 Matching blue button color
)
  .setStrokeStyle(2, 0xffffff)
  .setOrigin(0.5)
  .setDepth(1000)
  .setInteractive({ useHandCursor: true });

// Add "Menu" label directly
this.add.text(
  buttonX + 6,
  marginY - 5 - spacingY * 2,
  'Menu',
  {
    fontFamily: 'Outfit',
    fontSize: '14px',
    color: '#1A1F2B', // 🖋️ readable dark text on blue
    align: 'center'
  }
)
  .setOrigin(0.5)
  .setDepth(1001);

// 🔁 Hover animation
menuButtonBg.on('pointerover', () => {
  this.tweens.add({
    targets: menuButtonBg,
    scale: 1.1,
    duration: 150,
    ease: 'Power2'
  });
});
menuButtonBg.on('pointerout', () => {
  this.tweens.add({
    targets: menuButtonBg,
    scale: 1,
    duration: 150,
    ease: 'Power2'
  });
});

// 👆 Click squish + go to menu
menuButtonBg.on('pointerdown', () => {
  this.tweens.add({
    targets: menuButtonBg,
    scale: 0.95,
    duration: 80,
    ease: 'Power1',
    yoyo: true,
    onComplete: () => {
      // Reset
      this.cleanupGameObjects(true);
      console.log('📣 Dispatching request-refresh-towers...');
      window.dispatchEvent(new Event('request-refresh-towers'));
      // 🚪 Transition to menu scene
      this.scene.start('MainMenuScene');
    }
  });
});

// 🟢 Pause Button (Toggle)
let isPaused = this.isPaused;
const { icon: pauseIcon } = createCircleButton.call(this, buttonX + 6, marginY - 6, '⏸', () => {
  isPaused = !isPaused;
  this.isPaused = isPaused;
  pauseIcon.setText(isPaused ? '▶️' : '⏸');

  if (isPaused) {
    this.physics.pause();
  } else {
    this.physics.resume();
  }

  if (this.enemySpawnEvent) {
    this.enemySpawnEvent.paused = isPaused;
  }

  this.towers.forEach(t => {
    const timer = t.getData('shootTimer');
    if (timer) timer.paused = isPaused;
  });

  this.bulletGroup.getChildren().forEach(b => {
    const timer = b.getData('despawnTimer');
    if (timer) timer.paused = isPaused;
  });
});

// 🔁 Restart Button
createCircleButton.call(this, buttonX + 6, marginY - 6 - spacingY, '⟳', () => {
  this.restartGame();
});

}
updateLivesDisplay(livesLeft: number) {
  this.heartIcons.forEach((heart, i) => {
    const isAlive = i < livesLeft;
    heart.setAlpha(isAlive ? 1 : 0.2);
    heart.y = heart.getData('originalY'); // 🔥 Always reset to original Y
  });
}


createStyledButton(
  x: number,
  y: number,
  label: string,
  bgColor: number,
  onClick: () => void,
  hoverColor?: number
): Phaser.GameObjects.Container {
  const paddingX = 16;
  const paddingY = 8;
  const fontSize = 18;
  const borderRadius = 4; // 🟦 Matching all buttons

  const text = this.add.text(0, 0, label, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Outfit',
    color: '#1A1F2B',
    align: 'center',
  }).setOrigin(0.5);

  const width = text.width + paddingX * 2;
  const height = text.height + paddingY * 2;

  const hitbox = this.add.rectangle(0, 0, width, height)
    .setOrigin(0.5)
    .setVisible(false);

  const bg = this.add.graphics();
  bg.fillStyle(bgColor, 1);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);

  const button = this.add.container(x, y, [hitbox, bg, text])
    .setSize(width, height)
    .setDepth(1020)
    .setInteractive()
    .on('pointerdown', onClick)
    .on('pointerover', () => {
      bg.clear();
      const fill = hoverColor ?? (bgColor + 0x202020);
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
      this.input.setDefaultCursor('pointer');

      // 🌀 Squish Animation on Hover
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Power1',
      });
    })
    .on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
      this.input.setDefaultCursor('default');

      // 🔙 Shrink back on mouse out
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power1',
      });
    });

  return button;
}


showTowerSelectPanel(col: number, row: number) {
  console.log('[🟢 showTowerSelectPanel]', {
    inputEnabled: this.input.enabled,
    towerSelectPanel: !!this.towerSelectPanel,
  });

  const towerCosts: Record<string, number> = {
    basic: 20,
    rapid: 15,
    cannon: 35,
  };

  const screenX = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
  const screenY = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;

  this.selectedTile = { col, row };

  // 🟨 Tile highlight
  const highlightX = this.mapOffsetX + col * this.tileSize;
  const highlightY = this.mapOffsetY + row * this.tileSize;

  const tileHighlight = this.add.rectangle(
    highlightX + this.tileSize / 2,
    highlightY + this.tileSize / 2,
    this.tileSize,
    this.tileSize,
    0xffff00,
    0.3
  ).setStrokeStyle(2, 0xffff00).setDepth(500);

  this.towerSelectHighlight = tileHighlight;

  this.isPaused = true;
  this.physics.pause();
  this.enemySpawnEvent.paused = true;

  // Clear any existing panel
  this.towerSelectPanel?.destroy();
  const panelWidth = 120;
  const panelHeight = 140;
  
  const canvasWidth = this.scale.width;
  const canvasHeight = this.scale.height;
  
  const panelOffsetX = 100;
  const panelOffsetY = 60;
  
  // Default position: to the right and below the tile
  let adjustedX = screenX + panelOffsetX;
  let adjustedY = screenY + panelOffsetY;
  
  // 🔄 Flip to left of tile if too close to right edge
  if (adjustedX + panelWidth / 2 > canvasWidth) {
    adjustedX = screenX - panelOffsetX;
  }
  
  // 🔽 Clamp Y so panel doesn’t overflow below screen
  if (adjustedY + panelHeight / 2 > canvasHeight) {
    adjustedY = canvasHeight - panelHeight / 2 - 10;
  }
  
  const container = this.add.container(adjustedX, adjustedY);
  
  container.setDepth(1000);
  const availableTowers = this.ownedTowers.filter(t => !t.used);
  const buttonWidth = 100;
  const buttonHeight = 36;
  const buttonSpacing = 10;
  
  const backgroundWidth = 140;
  const backgroundHeight = availableTowers.length * buttonHeight + (availableTowers.length - 1) * buttonSpacing + 40;
  
  const background = this.add.rectangle(0, 0, backgroundWidth, backgroundHeight, 0x1A1F2B, 1)
    .setStrokeStyle(2, 0x00B3FF)
    .setOrigin(0.5);
  container.add(background);

  if (availableTowers.length === 0) {
    const warningWidth = 220;
    const warningHeight = 100;
  
    const background = this.add.rectangle(0, 0, warningWidth, warningHeight, 0x1A1F2B, 1)
      .setStrokeStyle(2, 0xFF4F66)
      .setOrigin(0.5);
  
    const warningText = this.add.text(0, 0, '❌ No towers left to place!', {
      fontSize: '16px',
      fontFamily: 'Outfit',
      color: '#FF4F66',
      align: 'center',
      wordWrap: { width: warningWidth - 20 }
    }).setOrigin(0.5);
  
    container.add([background, warningText]);
  
    this.towerSelectPanel = container;
  
    const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
      .setOrigin(0)
      .setDepth(999)
      .setInteractive();
  
    const cleanup = () => {
      container.destroy();
      blocker.destroy();
      this.towerSelectPanel = undefined;
      this.towerSelectHighlight?.destroy();
      this.towerSelectHighlight = undefined;
      this.isPaused = false;
      this.physics.resume();
      this.enemySpawnEvent.paused = false;
      this.canSelectTile = true;
    };
  
    blocker.on('pointerdown', cleanup);
  
    // ⏳ Auto close after 3 seconds
    this.time.delayedCall(3000, cleanup);
  
    return;
  }  
  const totalHeight = availableTowers.length * buttonHeight + (availableTowers.length - 1) * buttonSpacing;
  const startY = -totalHeight / 2 + buttonHeight / 2;


  availableTowers.forEach((towerNFT, index) => {
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x1A1F2B)
      .setStrokeStyle(0)
      .setOrigin(0.5);
  
    const labelName = this.add.text(0, -8, towerNFT.type.toUpperCase(), {
      fontSize: '14px',
      fontFamily: 'Outfit',
      color: '#DFFBFF',
      align: 'center',
    }).setOrigin(0.5);
  
    const labelCost = this.add.text(0, 10, `LVL ${towerNFT.level}`, {
      fontSize: '16px',
      fontFamily: 'Outfit',
      color: '#00FFE7',
      align: 'center',
    }).setOrigin(0.5);
  
    const buttonContainer = this.add.container(0, 0, [bg, labelName, labelCost]);
    buttonContainer.setPosition(0, startY + index * (buttonHeight + buttonSpacing));
    buttonContainer.setSize(buttonWidth, buttonHeight);
    buttonContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    buttonContainer.on('pointerdown', () => {
      if (!this.selectedTile) {
        this.showToast?.('No tile selected!');
        return;
      }
    
      this.placeTowerFromNFT(this.selectedTile.col, this.selectedTile.row, towerNFT); // ✅ Safe call
    
      this.towerSelectPanel?.destroy();
      this.towerSelectPanel = undefined;
      this.towerSelectHighlight?.destroy();
      this.towerSelectHighlight = undefined;
      blocker.destroy();
      this.isPaused = false;
      this.physics.resume();
      this.enemySpawnEvent.paused = false;
      this.canSelectTile = true;
    });
    
  
    container.add(buttonContainer);
  });  

  this.towerSelectPanel = container;

// 🛡️ Blocker (must be declared before it's destroyed inside button clicks)
const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1A1F2B, 0.001)
  .setOrigin(0)
  .setInteractive()
  .setDepth(998);
  blocker.once('pointerdown', () => {
    console.log('[🔴 Blocker clicked]');
    this.towerSelectPanel?.destroy();
    this.towerSelectPanel = undefined;
    this.towerSelectHighlight?.destroy();
    this.towerSelectHighlight = undefined;
    blocker.destroy();
    this.isPaused = false;
    this.physics.resume();
    this.enemySpawnEvent.paused = false;

    this.time.delayedCall(16, () => {
      this.input.enabled = true;
      this.canSelectTile = true; // ✅ make sure this is also true from cancel
    });
  });
}
// ---------------------------------------------------------------------------
// 🧟 spawnEnemy(): Spawns one enemy with stats based on type
// ---------------------------------------------------------------------------
spawnEnemy() {
  if (!this.canSpawnEnemies) return;
  if (this.enemiesSpawned >= this.enemyQueue.length) return;
  const type = this.enemyQueue[this.enemiesSpawned];
  const start = this.path.getStartPoint();
  const enemy = this.createEnemyGraphic(type, start.x, start.y) as Phaser.GameObjects.Image;
this.physics.add.existing(enemy);
const body = enemy.body as Phaser.Physics.Arcade.Body;
body.setImmovable(true);
body.setSize(enemy.displayWidth, enemy.displayHeight);
body.setOffset(-enemy.displayWidth / 2, -enemy.displayHeight / 2);
  // 🎯 Set enemy stats by type
  let speed = 1 / 8000;
  if (type === 'fast') {
    speed = 1 / 5000;
  } else if (type === 'tank') {
    speed = 1 / 12000;
  }
  enemy.setData('type', type);
  enemy.setData('hp', this.currentEnemyHP[type]);
  enemy.setData('maxHp', this.currentEnemyHP[type]);
  enemy.setData('reward', this.currentEnemyReward[type]);
  
  enemy.setData('speed', speed);
  // 🩸 Health bar UI
  const barBg = this.add.rectangle(enemy.x, enemy.y - 16, 20, 4, 0x222222);
  barBg.name = 'hpBarBg';
  const bar = this.add.rectangle(enemy.x, enemy.y - 16, 20, 4, 0x00FFE7);
  bar.name = 'hpBar';
  enemy.setData('hpBar', bar);
  enemy.setData('hpBarBg', barBg);
  this.enemyGroup.add(enemy);
  this.enemiesSpawned++;
}
// ---------------------------------------------------------------------------
// 🎨 createEnemyGraphic(): Shape varies by enemy type
// ---------------------------------------------------------------------------
createEnemyGraphic(type: string, x: number, y: number): Phaser.GameObjects.Image {
  let imageKey = 'enemyNormal';
  if (type === 'fast') {
    imageKey = 'enemyFast';
  } else if (type === 'tank') {
    imageKey = 'enemyTank';
  }
  const enemy = this.add.image(x, y, imageKey)
    .setScale(0.075) // adjust scale to fit your tile size
    .setOrigin(0.5);
  return enemy;
}
// ---------------------------------------------------------------------------
// 🎯 shootFromTower(): Fires bullet at closest enemy in range
// ---------------------------------------------------------------------------
shootFromTower(tower: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform) {
  const enemies = this.enemyGroup.getChildren() as Phaser.GameObjects.Image[];
  if (!enemies.length) return;

  const range = tower.getData('range') ?? 200;
  const damage = tower.getData('damage') ?? 1;
  const towerType = tower.getData('type') ?? 'basic';
  const baseScale = tower.getData('baseScale') ?? 0.075;

  let closestEnemy: Phaser.GameObjects.Image | null = null;
  let minDist = range;

  for (const enemy of enemies) {
    const dist = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
    if (dist < minDist) {
      closestEnemy = enemy;
      minDist = dist;
    }
  }
  if (!closestEnemy) return;

  // 🧭 Face Left or Right only
  if (tower instanceof Phaser.GameObjects.Image) {
    const textureKey = tower.texture.key;
    const enemyX = closestEnemy.x;
    const towerX = tower.x;

    const shouldFaceLeft = enemyX < towerX;
    const shouldFaceRight = enemyX > towerX;

    if (shouldFaceLeft && !textureKey.endsWith('Left')) {
      tower.setTexture(textureKey.replace('Right', 'Left'));
    } else if (shouldFaceRight && !textureKey.endsWith('Right')) {
      tower.setTexture(textureKey.replace('Left', 'Right'));
    }
  }
  console.log(`🔫 Firing from ${towerType} → DMG: ${damage}, RANGE: ${range}`);

  // 🌀 Visual fire animation
  if (tower instanceof Phaser.GameObjects.Image) {
    this.tweens.add({
      targets: tower,
      scale: baseScale * 1.15,
      yoyo: true,
      duration: 80,
      ease: 'Sine.easeInOut',
    });
  } else if (tower instanceof Phaser.GameObjects.Arc) {
    const originalColor = tower.fillColor;
    tower.setFillStyle(0xffffff); // flash white
    this.time.delayedCall(80, () => tower.setFillStyle(originalColor));
  }

  // 🎯 Create bullet
  let bulletColor = 0xffffff;
  let bulletScale = 1;

  const bullet = this.add.circle(tower.x, tower.y, 4, bulletColor)
    .setScale(bulletScale)
    .setDepth(5);
  
  bullet.setData('target', closestEnemy);
  bullet.setData('damage', damage);
  bullet.setData('towerType', towerType);

  this.physics.add.existing(bullet);
  const angle = Phaser.Math.Angle.Between(tower.x, tower.y, closestEnemy.x, closestEnemy.y);
  const velocity = this.physics.velocityFromRotation(angle, 500);
  (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
  this.bulletGroup.add(bullet);
  console.log(`🎯 Tower type: ${towerType}`);

  switch (towerType) {
    case 'basic':
      bullet.setFillStyle(0xffff00); // Yellow
      bullet.setScale(1);
      break;
    case 'rapid':
      bullet.setFillStyle(0x00ffff); // Cyan
      bullet.setScale(0.75);
      break;
    case 'cannon':
      bullet.setFillStyle(0xff3300); // Orange-red
      bullet.setScale(1.4);
      break;
    default:
      bullet.setFillStyle(0xffffff);
      bullet.setScale(1);
  }
  
  // 💨 Bullet expires
  const bulletTimer = this.time.delayedCall(1500, () => bullet.destroy(), [], this);
  bullet.setData('despawnTimer', bulletTimer);
 
}
// ---------------------------------------------------------------------------
// 🔁 update(): Main game loop
// ---------------------------------------------------------------------------
update(_: number, delta: number) {
  const baseSpeed = 1 / 8000;
  if (this.isPaused) return;
  if (!this.enemyGroup) return;

  for (const enemyObj of this.enemyGroup.getChildren()) {
    const enemy = enemyObj as Phaser.GameObjects.Image;
    let t = enemy.getData('t') ?? 0;
    const speed = enemy.getData('speed') ?? baseSpeed;
    t += speed * delta;

    if (t >= 1) {
      // 🛑 Enemy reached the end of the path
      enemy.getData('hpBar')?.destroy();
      enemy.getData('hpBarBg')?.destroy();
      this.totalEnemiesDestroyed++;
console.log(`🚫 Non-HP enemy destroy #${this.totalEnemiesDestroyed}`);

      enemy.destroy();
      this.lives--;
      this.updateLivesDisplay(this.lives);

      this.enemiesEscaped++;

      // 🧠 If no enemies left, start next wave
      if (!this.gameOver && this.enemyGroup.countActive() === 0) {
        this.time.delayedCall(1000, () => this.startNextWave());
      }
      // 💀 Game Over condition
      if (this.lives <= 0 && !this.gameOver) {
        (async () => {
          this.cleanupGameObjects();
      
          const centerX = Number(this.game.config.width) / 2;
          const centerY = Number(this.game.config.height) / 2;
      
          const overlay = this.add.rectangle(centerX, centerY, this.game.config.width as number, this.game.config.height as number, 0x1A1F2B, 0.4)
            .setOrigin(0.5)
            .setDepth(1005);
      
          const popupBg = this.add.rectangle(centerX, centerY, 340, 230, 0x1A1F2B, 0.8)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xFF4F66)
            .setDepth(1006);
      
          const gameOverText = this.add.text(centerX, centerY - 60, '💀 Game Over 💀', {
            fontSize: '36px',
            fontFamily: 'Outfit',
            fontStyle: 'bold',
            color: '#FF4F66'
          }).setOrigin(0.5).setDepth(1006);
      
          const vineText = this.add.text(centerX, centerY - 20, `You still earned ${this.vineBalance} $MOO`, {
            fontSize: '20px',
            fontFamily: 'Outfit',
            color: '#5CFFA3'
          }).setOrigin(0.5).setDepth(1006);
      
          // 📡 Publish results now
          if (this.walletAddress && this.sessionToken && this.gameId) {
            const eventDetail = {
              wallet: this.walletAddress,
              gameId: this.gameId,
              sessionToken: this.sessionToken,
              mooEarned: this.vineBalance,
              levelBeat: this.currentLevel,
              wavesSurvived: this.waveCount,
              enemiesKilled: this.totalEnemiesKilled,
              livesRemaining: this.lives,
            };
          
            window.dispatchEvent(new CustomEvent('request-publish-game-results', { detail: eventDetail }));
          }
          
      
          const restartBtn = this.createStyledButton(
            centerX,
            centerY + 25,
            '🔁 Play Again',
            0x00B3FF,
            () => {
              popupBg.destroy();
              gameOverText.destroy();
              vineText.destroy();
              restartBtn.destroy();
              mainMenuBtn.destroy();
              overlay.destroy();
              this.restartGame();
            },
            0x3CDFFF
          );
      
          const mainMenuBtn = this.createStyledButton(
            centerX,
            centerY + 75,
            '🏠 Main Menu',
            0x00B3FF,
            () => {
              this.cleanupGameObjects(true);
              console.log('📣 Dispatching request-refresh-towers...');
              window.dispatchEvent(new Event('request-refresh-towers'));
              if (this.enemySpawnEvent) {
                this.enemySpawnEvent.remove(false);
              }
              this.time.clearPendingEvents();
              this.time.removeAllEvents();
              this.waveNumber = 0;
              this.lives = 10;
              this.vineBalance = 40;
              this.gameOver = false;
              this.isPaused = false;
              this.scene.start('MainMenuScene');
            },
            0x3CDFFF
          );
        })();
      }
      
      // ✅ Important: Skip remaining logic for this enemy
      continue;
    }
    // 🧭 Move enemy along the path
    const vec = new Phaser.Math.Vector2();
    this.path.getPoint(t, vec);
    enemy.setPosition(vec.x, vec.y);

    const bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;
    const barBg = enemy.getData('hpBarBg') as Phaser.GameObjects.Rectangle;
    bar?.setPosition(vec.x, vec.y - 16);
    barBg?.setPosition(vec.x, vec.y - 16);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.reset(vec.x, vec.y);

    // 🎯 Move bullets toward targets
    this.bulletGroup.getChildren().forEach((bulletObj) => {
      const bullet = bulletObj as Phaser.GameObjects.Arc;
      const target = bullet.getData('target') as Phaser.GameObjects.Image;
    
      if (!target || !target.active || typeof target.x !== 'number' || typeof target.y !== 'number') {
        bullet.destroy(); // cleanup stray bullet
        return;
      }
    
      const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
      const velocity = this.physics.velocityFromRotation(angle, 500);
      (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
    
      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, target.x, target.y);
      if (dist < 10) {
        // 💥 Hit! Apply damage
        const currentHp = target.getData('hp') ?? 1;
        const damage = bullet.getData('damage') ?? 1;
        const newHp = currentHp - damage;
        target.setData('hp', newHp);
        target.getData('hpBar')?.setScale(newHp / (target.getData('maxHp') || 1), 1);
    
        if (newHp <= 0) {
          const rewardAmount = target.getData('reward') || 0;
          this.vineBalance += rewardAmount;
          this.vineText.setText(`$MOO: ${this.vineBalance}`);
    
          // 💸 Floating reward popup
          const popup = this.add.text(target.x, target.y - 20, `+${rewardAmount} $MOO`, {
            fontSize: '16px',
            fontFamily: 'Outfit',
            color: '#5CFFA3'
          }).setOrigin(0.5).setDepth(1000);
    
          this.tweens.add({
            targets: popup,
            y: target.y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power1',
            onComplete: () => popup.destroy()
          });
    
          target.getData('hpBar')?.destroy();
          target.getData('hpBarBg')?.destroy();
          target.destroy();
          bullet.destroy();
          this.enemiesKilled++;
          this.checkWaveOver();
        } else {
          bullet.destroy(); // Not dead, but hit
        }
      }
    });
    
    if (!this.input.enabled && !this.upgradePanelOpen && !this.towerSelectPanel) {
      console.warn('🛠 Auto-reenabling input');
      this.input.enabled = true;
    }
    for (const tower of this.towers) {
      const range = tower.getData('range') ?? 100;
      const damage = tower.getData('damage') ?? 1;
      const towerType = (tower.getData('type') ?? 'basic').toLowerCase();
      const speed = tower.getData('speed') ?? 1000;
      const lastFired = tower.getData('lastFired') ?? 0;
      const now = this.time.now;
    
      if (now - lastFired < speed) continue;
    
      let nearestEnemy: Phaser.GameObjects.Image | null = null;
      let minDist = Infinity;
    
      for (const enemyObj of this.enemyGroup.getChildren()) {
        const enemy = enemyObj as Phaser.GameObjects.Image;
        const dist = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
        if (dist <= range && dist < minDist) {
          nearestEnemy = enemy;
          minDist = dist;
        }
      }
    
      if (nearestEnemy) {
        // 🧠 Debug logs
        console.log(`🚀 Tower firing | Type: ${towerType} | Rate: ${speed}/s | Damage: ${damage}`);
    
        // 🎯 Create bullet
        const bullet = this.add.circle(tower.x, tower.y, 4, 0xffffff)
          .setDepth(2)
          .setData('target', nearestEnemy)
          .setData('damage', damage)
          .setData('towerType', towerType);
    
        // 🧪 Bullet styling by tower type
        switch (towerType) {
          case 'basic':
            bullet.setFillStyle(0xffff00); // Yellow
            bullet.setScale(1);
            break;
          case 'rapid':
            bullet.setFillStyle(0x00ffff); // Cyan
            bullet.setScale(0.75);
            break;
          case 'cannon':
            bullet.setFillStyle(0xff3300); // Orange-red
            bullet.setScale(1.4);
            break;
          default:
            bullet.setFillStyle(0xffffff); // Fallback white
            bullet.setScale(1);
        }
    
        this.physics.add.existing(bullet);
        this.bulletGroup.add(bullet);
    
        tower.setData('lastFired', now);
    
        // 🔄 Flip tower image based on enemy position
        if (tower instanceof Phaser.GameObjects.Image) {
          const isEnemyLeft = nearestEnemy.x < tower.x;
          const textureKey = tower.texture.key;
    
          if (isEnemyLeft && textureKey.endsWith('Right')) {
            tower.setTexture(textureKey.replace('Right', 'Left'));
          } else if (!isEnemyLeft && textureKey.endsWith('Left')) {
            tower.setTexture(textureKey.replace('Left', 'Right'));
          }
        }
    
        // 🔊 Optional: add muzzle flash or bounce animation here
      }
    }
    
    // 💾 Save progress
    enemy.setData('t', t);
  }

  // 🔄 Update upgrade button color
  if (this.activeUpgradeButton && this.activeUpgradeCost !== undefined) {
    if (this.vineBalance >= this.activeUpgradeCost) {
      this.activeUpgradeButton.setColor('#00FFE7');
    } else {
      this.activeUpgradeButton.setColor('#FF4F66');
    }
    this.activeUpgradeButton.setText(`Upgrade 🔼 (${this.activeUpgradeCost})`);
  }
}

  // ---------------------------------------------------------------------------
  // 🔁 checkWaveOver(): Ends wave and starts next if ready
  // ---------------------------------------------------------------------------
  checkWaveOver() {
    const activeEnemies = this.enemyGroup.getChildren().filter(enemy => enemy.active);
    const allSpawned = this.enemiesSpawned >= this.enemiesPerWave;
  
    if (allSpawned && activeEnemies.length === 0 && !this.gameOver) {
      this.time.delayedCall(1000, () => this.startNextWave());
    }  
  }
  
  // ---------------------------------------------------------------------------
  // 🌊 startNextWave(): Sets up the enemy queue and wave banner
  // ---------------------------------------------------------------------------
  startNextWave() {
    this.enemiesEscaped = 0;
    this.waveNumber++;
    this.waveCount++;
    if (this.waveNumber > this.MAX_WAVE) {
    this.triggerVictory();
    return;
   }  
    this.waveText.setText(`Wave: ${this.waveNumber}`);
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    // 📦 Generate enemy queue
    // ✅ Full Wave Progression for Level 1
// 📈 Dynamic scaling: increase total enemies and HP with each wave
const baseEnemies = 6;
const growthRate = 1.12; // Slight exponential growth
const totalEnemies = Math.floor(baseEnemies * Math.pow(growthRate, this.waveNumber - 1));

const tankChance = Math.min(0.05 + 0.01 * this.waveNumber, 0.25);  // Up to 25%
const fastChance = Math.min(0.2 + 0.02 * this.waveNumber, 0.6);     // Up to 60%
const normalChance = 1 - tankChance - fastChance;

const config = {
  total: totalEnemies,
  spawnDelay: Math.max(500, 1500 - this.waveNumber * 50), // faster spawns
  mix: { normal: normalChance, fast: fastChance, tank: tankChance },
  hp: {
    normal: 5 + Math.floor(this.waveNumber * 1.5),
    fast: 3 + Math.floor(this.waveNumber * 1.2),
    tank: 15 + Math.floor(this.waveNumber * 2.5),
  },
  reward: {
    normal: 3 + Math.floor(this.waveNumber / 5),
    fast: 3 + Math.floor(this.waveNumber / 4),
    tank: 5 + Math.floor(this.waveNumber / 3),
  }
};
const queue: string[] = [];
for (const [type, ratio] of Object.entries(config.mix)) {
  const count = Math.round(ratio * config.total);
  for (let i = 0; i < count; i++) {
    queue.push(type);
  }
}
Phaser.Utils.Array.Shuffle(queue); // Optional: mix it up
this.enemyQueue = queue;
this.enemiesPerWave = queue.length;
// Set spawn interval dynamically from config
const spawnDelay = Math.max(500, 1500 - this.waveNumber * 100);

if (this.enemySpawnEvent) {
  this.enemySpawnEvent.remove(false); // Clear previous one
}

this.enemySpawnEvent = this.time.addEvent({
  delay: spawnDelay,
  callback: this.spawnEnemy,
  callbackScope: this,
  loop: true,
});

// Set current HP and rewards for spawnEnemy()
this.currentEnemyHP = config.hp;
this.currentEnemyReward = config.reward;

  // 🪧 Wave banner
  const bannerBg = this.add.rectangle(
    Number(this.game.config.width) / 2,
    Number(this.game.config.height) / 2,
    250, 150,
    0x222222,
    0.85
  ).setOrigin(0.5).setDepth(1005).setStrokeStyle(2, 0xDFFBFF);
  this.canSelectTile = false;
  this.canSpawnEnemies = false;
  const bannerText = this.add.text(
    bannerBg.x, bannerBg.y,
   `Wave ${this.waveNumber}`,
    {
      fontSize: '28px',
      fontFamily: 'Outfit',
      color: '#00B3FF',
      fontStyle: 'bold',
      align: 'center',
    }
  ).setOrigin(0.5).setDepth(2000);
  bannerText.setAlpha(0).setScale(0.9);
  bannerBg.setAlpha(0).setScale(0.9);
  this.tweens.add({
    targets: [bannerText, bannerBg],
    alpha: { from: 0, to: 1 },
    scale: { from: 0.9, to: 1 },
    duration: 300,
    ease: 'Back',
    yoyo: true,
    hold: 1400,
  });
  this.time.delayedCall(2000, () => {
    bannerBg.destroy();
    bannerText.destroy();
    this.canSelectTile = true;
    this.canSpawnEnemies = true; // ✅ Allow enemies to spawn now
  });  
  console.log(`🚨 Wave ${this.waveNumber} starting...`);
}
  // ---------------------------------------------------------------------------
  // 🔁 restartGame(): Full reset of game state and visuals
  // ---------------------------------------------------------------------------
  async restartGame() {
    console.log('🔁 Restarting game...');
  
    try {
      const res = await fetch('https://metadata-server-production.up.railway.app/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: this.walletAddress })
      });
      const { sessionToken, gameId } = await res.json();
      this.sessionToken = sessionToken;
      this.gameId = gameId;
      console.log('🎟️ New game session started (restart):', this.gameId);
    } catch (err) {
      console.error('❌ Failed to start new game session on restart', err);
      return; // Don't continue if session failed
    }
  
    this.cleanupGameObjects(true);
    this.startNextWave();
    this.physics.resume();
    this.load.start();
  }  
// ---------------------------------------------------------------------------
// 🔼 showUpgradePanel(): Displays tower upgrade UI
// ---------------------------------------------------------------------------
showUpgradePanel(tower: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & { getData: Function }) {
  if (this.gameOver) return;
  const existing = this.children.getByName('upgradePanel');
  if (existing) existing.destroy();
  this.upgradePanelOpen = true;
  this.isPaused = true;
  this.physics.pause();
  this.enemySpawnEvent.paused = true;
  // 🧹 Cleanup any previous range indicators
  this.rangeCircle?.destroy();
  this.nextRangeCircle?.destroy();
  this.input.enabled = false;
  this.time.delayedCall(150, () => {
    this.input.enabled = true;
  });
  // 📦 Panel position
  const panelWidth = 170;
  const padding = 10;
  let x = tower.x + panelWidth / 2 + padding;
  if (x + panelWidth / 2 > Number(this.game.config.width)) {
    x = tower.x - panelWidth / 2 - padding;
  }
  const y = tower.y;
  const panel = this.add.container(x, y).setName('upgradePanel').setDepth(1000);
  // 🧱 Panel background
  const bg = this.add.rectangle(0, 0, panelWidth, 130, 0x1A1F2B)
  .setOrigin(0.5)
    .setStrokeStyle(2, 0x00FFE7);
  // 🔢 Stats & upgrade logic
  const dmgRaw = tower.getData('damage');
  const dmg = dmgRaw % 1 !== 0 ? dmgRaw.toFixed(1) : dmgRaw;
  const rng = tower.getData('range');
  const level = tower.getData('level') ?? 1;
  const baseCost = 25;
  const upgradeCost = Math.floor(baseCost * Math.pow(1.4, level - 1));
  const nextDmg = dmg + 1;
  const nextRng = rng + 20;
  // 🔵 Current & next range indicators
  this.rangeCircle = this.add.circle(tower.x, tower.y, rng, 0x00B3FF, 0.2)
    .setStrokeStyle(1, 0x00B3FF)
    .setDepth(-1);
  this.nextRangeCircle = this.add.circle(tower.x, tower.y, nextRng, 0x00B3FF, 0.15)
    .setStrokeStyle(1, 0x00B3FF)
    .setDepth(-1);
    const spd = tower.getData('speed');
    const shotsPerSecond = (1000 / spd).toFixed(2);
    const statsText = this.add.text(0, 0,
      `LEVEL: ${level}\nDAMAGE: ${dmg}\nRANGE: ${rng}\nSPEED: ${shotsPerSecond} F/s`,
      {
        fontSize: '16px',
        fontFamily: 'Outfit',
        color: '#DFFBFF',
        align: 'center',
        lineSpacing: 10,
      }
    ).setOrigin(0.5);
    
  // 🔼 Upgrade button
  panel.add([bg, statsText]);
  // ❌ Dismiss on outside click
  this.time.delayedCall(100, () => {
    this.input.once('pointerdown', () => {
      panel.destroy();
      this.rangeCircle?.destroy();
      this.nextRangeCircle?.destroy();
      this.rangeCircle = undefined;
      this.nextRangeCircle = undefined;
      this.upgradePanelOpen = false;
      this.isPaused = false;
      const shootTimer = tower.getData('shootTimer');
      shootTimer.paused = false;
      const existingCircle = this.children.getByName('rangeCircle');
      existingCircle?.destroy();
      this.activeUpgradeButton = undefined;
      this.activeUpgradeCost = undefined;
      this.activeTower = undefined;
    });
  });
  const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1A1F2B, 0.001)
    .setOrigin(0)
    .setInteractive()
    .setDepth(999);
  blocker.once('pointerdown', () => {
    console.log('[🔴 Blocker clicked]');
    this.towerSelectPanel?.destroy();
    this.towerSelectPanel = undefined;
    this.towerSelectHighlight?.destroy();
    this.towerSelectHighlight = undefined;
    blocker.destroy();
    this.isPaused = false;
    this.physics.resume();
    this.enemySpawnEvent.paused = false;
    this.time.delayedCall(16, () => {
      this.input.enabled = true;
      this.canSelectTile = true;
    });
  });
}
///////////////////////////
// 🏆 TRIGGER VICTORY 🏆 //
///////////////////////////
async triggerVictory() {
    // 📡 Publish results now
    if (this.walletAddress && this.sessionToken && this.gameId) {
      const eventDetail = {
        wallet: this.walletAddress,
        gameId: this.gameId,
        sessionToken: this.sessionToken,
        mooEarned: this.vineBalance + 1000,
        levelBeat: this.currentLevel,
        wavesSurvived: this.waveCount,
        enemiesKilled: this.totalEnemiesKilled,
        livesRemaining: this.lives,
      };
    
      window.dispatchEvent(new CustomEvent('request-publish-game-results', { detail: eventDetail }));
    }
  // Victory RESET Game
  this.cleanupGameObjects(true); // not full reset
  const cx = Number(this.game.config.width) / 2;
  const cy = Number(this.game.config.height) / 2;
  // 🔲 Dim background
  const victoryOverlay = this.add.rectangle(cx, cy, this.game.config.width as number, this.game.config.height as number, 0x1A1F2B, 0.4)
    .setOrigin(0.5)
    .setDepth(-1);
  // Victory Popup Background
  const victoryPopupBg = this.add.rectangle(cx, cy, 340, 240, 0x1A1F2B, 0.8)
    .setOrigin(0.5)
    .setStrokeStyle(2, 0x00B3FF)
    .setDepth(1006);
  // Victory Title
  const victoryText = this.add.text(cx, cy - 64, '🏆 You Win 🏆', {
    fontSize: '36px',
    fontFamily: 'Outfit',
    fontStyle: 'bold',
    align: 'center',
    color: '#5CFFA3'
  }).setOrigin(0.5).setDepth(1006);
  // Victory Earnings Message
  const vineAmount = this.add.text(cx, cy - 18, `${this.vineBalance + 1000} $MOO`, {
    fontSize: '22px',
    fontFamily: 'Outfit',
    fontStyle: 'bold',
    align: 'center',
    color: '#5CFFA3'
  }).setOrigin(0.5).setDepth(1006);
  const vineMessage = this.add.text(cx, cy + 10, `was added to your profile`, {
    fontSize: '18px',
    fontFamily: 'Outfit',
    align: 'center',
    color: '#DFFBFF'
  }).setOrigin(0.5).setDepth(1006);
  // Victory Campaign Button
  const campaignBtn = this.createStyledButton(
    cx,
    cy + 48,
    'Campaign',
    0x00B3FF,
    () => {
      console.log('📦 Saving moo from victory (to campaign)...');
      if (this.walletAddress && this.vineBalance > 0) {
        window.dispatchEvent(new CustomEvent('upgrade-campaign', {
          detail: { level: 2 }
        }));
      }
      [victoryOverlay, victoryPopupBg, victoryText, vineAmount, vineMessage, campaignBtn, mainMenuBtn].forEach(e => e.destroy());
      this.cleanupGameObjects(true);
      this.scene.stop();
      
      this.scene.start('CampaignMapScene');
    },
    0x3CDFFF
  );
  // ✨ Add squish animation for hover
  campaignBtn.setInteractive()
    .on('pointerover', () => {
      this.tweens.add({
        targets: campaignBtn,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Power1'
      });
    })
    .on('pointerout', () => {
      this.tweens.add({
        targets: campaignBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power1'
      });
    });
  // Victory Main Menu Button
  const mainMenuBtn = this.createStyledButton(cx,cy + 94,'Main Menu', 0x00B3FF,
    () => {
      console.log('📦 Saving MOO from victory (to campaign)...');
      if (this.walletAddress && this.vineBalance > 0) {
        window.dispatchEvent(new CustomEvent('upgrade-campaign', {
          detail: { level: 2 }
        }));
      }
      this.cleanupGameObjects(true);
      console.log('📣 Dispatching request-refresh-towers...');
      window.dispatchEvent(new Event('request-refresh-towers'));
      window.location.reload();
    },
    0x3CDFFF
  );
    // ⛔ Disable input when profile modal is open
    (window as any).disableMainSceneInput = () => {
      this.input.enabled = false;
    };
    
    // ✅ Re-enable it when modal is closed
    (window as any).enableMainSceneInput = () => {
      this.input.enabled = true;
    };
    
}
}