import Phaser from 'phaser';
export default class MainScene extends Phaser.Scene {
  // ---------------------------------------------------------------------------
  // 📦 Core Game Objects
  // ---------------------------------------------------------------------------
  path!: Phaser.Curves.Path;
  enemyGroup!: Phaser.GameObjects.Group;
  bulletGroup!: Phaser.GameObjects.Group;
  tower!: Phaser.GameObjects.Arc;
  towers: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform)[] = [];
  hudBar!: Phaser.GameObjects.Rectangle;
  assetsLoaded: boolean = false;
  isMusicMuted: boolean = false;
  isSfxMuted: boolean = false;
  bgMusic!: Phaser.Sound.BaseSound;
  selectedTilePos?: { x: number; y: number };
  selectedTile?: { col: number, row: number };
  towerSelectPanel?: Phaser.GameObjects.Container;
  towerSelectHighlight?: Phaser.GameObjects.Rectangle;
  canSelectTile: boolean = true;
  claimButton?: Phaser.GameObjects.Container;
  canSpawnEnemies: boolean = false;
  // ---------------------------------------------------------------------------
  // 💰 Currency, Lives & Game State
  // ---------------------------------------------------------------------------
  vineBalance: number = 40; // Starting VINE
  currentEnemyHP: Partial<Record<string, number>> = {};
  currentEnemyReward: Partial<Record<string, number>> = {};  
  vineText!: Phaser.GameObjects.Text;
  waveText!: Phaser.GameObjects.Text;
  livesText!: Phaser.GameObjects.Text;
  lives: number = 10;
  gameOver: boolean = false;
  isPaused: boolean = false;
  
  // ---------------------------------------------------------------------------
  // 🗺️ Grid & Map
  // ---------------------------------------------------------------------------
  tileSize: number = 64;
  mapCols: number = 10;
  mapRows: number = 8;
  tileMap: number[][] = [];
  tileSprites: Phaser.GameObjects.Rectangle[][] = [];
  mapOffsetX: number = 0;
  mapOffsetY: number = 0;
  // ---------------------------------------------------------------------------
  // 📈 Wave & Enemy Tracking
  // ---------------------------------------------------------------------------
  waveNumber: number = 0;
  enemyQueue: string[] = []; // Enemies to spawn this wave
  enemiesPerWave: number = 5;
  enemiesSpawned: number = 0;
  enemiesKilled: number = 0;
  enemiesEscaped: number = 0;
  enemySpawnEvent!: Phaser.Time.TimerEvent;
  // ---------------------------------------------------------------------------
  // 🏹 Towers & Upgrades
  // ---------------------------------------------------------------------------
  currentTowerType: string = 'basic'; // Default selected tower type
  activeTower?: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & { getData: Function };
  activeUpgradeButton?: Phaser.GameObjects.Text;
  activeUpgradeCost?: number;
  rangeCircle?: Phaser.GameObjects.Arc;
  nextRangeCircle?: Phaser.GameObjects.Arc;
  upgradePanelOpen: boolean = false;
  // ---------------------------------------------------------------------------
  // 🛠️ Constructor
  // ---------------------------------------------------------------------------
  constructor() {
    super('MainScene');
  }
 
  // ---------------------------------------------------------------------------
  // 🔁 preload(): Load assets
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
  
  }
  
  // ---------------------------------------------------------------------------
  // 🎮 create(): Setup the map, UI, path, selectors, towers, collisions
  // ---------------------------------------------------------------------------
  create() {
    
  console.log('✅ MainScene created');
  const screenWidth = Number(this.game.config.width);
  const screenHeight = Number(this.game.config.height);
  const mapWidth = this.mapCols * this.tileSize;
  const mapHeight = this.mapRows * this.tileSize;
  this.load.audio('bgMusic', ['https://admin.demwitches.xyz/assets/music.mp3']);
this.load.once('complete', () => {
  const music = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
  music.play();
});
this.load.start();
  this.mapOffsetX = (screenWidth - mapWidth) / 2;
  this.mapOffsetY = (screenHeight - mapHeight) / 2;

  // External Pause Function from UI
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
  // EXTERNAL RESUME FUNCTION
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
  
  
  // 🧿 Generate enemy texture as red circle
  const circle = this.add.graphics();
  circle.fillStyle(0xff0000, 1);
  circle.fillCircle(0, 0, 10);
  circle.generateTexture('enemy', 20, 20);
  circle.destroy();
  // 🛤️ Define path through tile grid
  const pathTiles = [
    [0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 6], [3, 6],
    [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4],
    [5, 5], [5, 6], [6, 6], [7, 6], [7, 5], [7, 4], [7, 3], [7, 2], [7, 1], [8, 1], [9, 1]
  ];
  // 🧭 Create path curve
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
  // 💬 HUD Text
  const hudY = 10;
  const textStyle = {
    fontSize: '45px', // 2x original size
    fontFamily: 'Outfit',
    color: '#eeeeee',
    resolution: window.devicePixelRatio || 1 // 🔍 High DPI support
  };
  
  this.vineText = this.add.text(40, hudY, '$VINE: 40', textStyle).setScale(0.5);
  this.waveText = this.add.text(220, hudY, 'Wave: 1', textStyle).setScale(0.5).setDepth(20);
  this.livesText = this.add.text(400, hudY, 'Lives: 10', textStyle).setScale(0.5);  
  // 🧱 Initialize tile map (1 = buildable, 0 = path)
  this.tileMap = Array.from({ length: this.mapRows }, () => Array(this.mapCols).fill(1));
  for (const [col, row] of pathTiles) this.tileMap[row][col] = 0;
  // 🔲 Generate tile visuals
  for (let row = 0; row < this.mapRows; row++) {
    this.tileSprites[row] = [];
    for (let col = 0; col < this.mapCols; col++) {
      const x = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
      const y = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;
      const type = this.tileMap[row][col];
      const color = type === 0 ? 0x555555 : 0x228b22;
      const tile = this.add.rectangle(x, y, this.tileSize - 2, this.tileSize - 2, color)
        .setInteractive()
        .setAlpha(0.2);
      this.tileSprites[row][col] = tile;
      if (type === 1) {
        tile.on('pointerdown', () => {
          // prevent placing over existing tower
          if (this.canSelectTile && !this.towerSelectPanel) {
            this.canSelectTile = false;
            this.showTowerSelectPanel(col, row);
          }
          
        });
      }
      
    }
  }
 
  // 👾 Create enemy and bullet groups
  this.enemyGroup = this.add.group();
  this.bulletGroup = this.add.group();
  // 🔁 Spawn enemies on interval
  this.enemySpawnEvent = this.time.addEvent({
    delay: 1000,
    callback: this.spawnEnemy,
    callbackScope: this,
    loop: true,
  });
 
  // 💥 Bullet + Enemy collision logic
  this.physics.add.overlap(
    this.bulletGroup,
    this.enemyGroup,
    (bulletObj, enemyObj) => {
      const bullet = bulletObj as Phaser.GameObjects.Arc;
      const enemy = enemyObj as Phaser.GameObjects.Arc;
      const damage = bullet.getData('damage');
      let hp = enemy.getData('hp');
      if (typeof damage !== 'number') return;
      hp -= damage;
      // ✨ Hit flash effect
      const hit = this.add.circle(enemy.x, enemy.y, 10, 0xffffff).setAlpha(0.6);
      this.tweens.add({
        targets: hit,
        alpha: 0,
        scale: 2,
        duration: 200,
        onComplete: () => hit.destroy(),
      });
      bullet.destroy();
      if (hp <= 0) {
        const reward = enemy.getData('reward') || 0;
        this.vineBalance += reward;
        this.vineText.setText(`$VINE: ${this.vineBalance}`);
        const bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;
        const barBg = enemy.getData('hpBarBg') as Phaser.GameObjects.Rectangle;
        bar?.destroy();
        barBg?.destroy();
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
          bar.setFillStyle(percent > 0.5 ? 0x00ff00 : percent > 0.25 ? 0xffa500 : 0xff0000);
        }
      }
    }
  );
  // 🎬 Start wave
  this.startNextWave();
  // ⏸ Pause Button
  // Draw rounded rectangle background
const pauseBg = this.add.graphics();
const pauseWidth = 104;
const pauseHeight = 35;
const pauseRadius = 10;
const pauseX = Number(this.game.config.width) - 24 - pauseWidth * 2 - 12;
const pauseY = this.mapOffsetY / 8;

pauseBg.fillStyle(0x2a2a2a, 1);
pauseBg.fillRoundedRect(pauseX, pauseY, pauseWidth, pauseHeight, pauseRadius);
pauseBg.lineStyle(2, 0xe2e619, 1);
pauseBg.strokeRoundedRect(pauseX, pauseY, pauseWidth, pauseHeight, pauseRadius);

// Add text on top
const pauseBtnText = this.add.text(
  pauseX + pauseWidth / 2,
  pauseY + pauseHeight / 2,
  '⏸ Pause',
  {
    fontSize: '40px',
    fontFamily: 'Outfit',
    color: '#e2e619',
    resolution: window.devicePixelRatio || 1 // 👈 makes it crisp
  }
).setOrigin(0.5).setScale(0.5)
 .setInteractive({ useHandCursor: true });


// Hover effect
pauseBtnText.on('pointerover', () => {
  pauseBg.clear();
  pauseBg.fillStyle(0x3a3a3a, 1);
  pauseBg.fillRoundedRect(pauseX, pauseY, pauseWidth, pauseHeight, pauseRadius);
  pauseBg.lineStyle(2, 0xe2e619, 1);
  pauseBg.strokeRoundedRect(pauseX, pauseY, pauseWidth, pauseHeight, pauseRadius);
});
pauseBtnText.on('pointerout', () => {
  pauseBg.clear();
  pauseBg.fillStyle(0x2a2a2a, 1);
  pauseBg.fillRoundedRect(pauseX, pauseY, pauseWidth, pauseHeight, pauseRadius);
  pauseBg.lineStyle(2, 0xe2e619, 1);
  pauseBg.strokeRoundedRect(pauseX, pauseY, pauseWidth, pauseHeight, pauseRadius);
});

// Click logic
pauseBtnText.on('pointerdown', () => {
  this.isPaused = !this.isPaused;
  pauseBtnText.setText(this.isPaused ? '▶️ Resume' : '⏸ Pause');

  if (this.isPaused) {
    this.physics.pause();
  } else {
    this.physics.resume();
  }

  if (this.enemySpawnEvent) {
    this.enemySpawnEvent.paused = this.isPaused;
  }

  this.towers.forEach(tower => {
    const timer = tower.getData('shootTimer');
    if (timer) timer.paused = this.isPaused;
  });

  this.bulletGroup.getChildren().forEach(bullet => {
    const timer = bullet.getData('despawnTimer');
    if (timer) timer.paused = this.isPaused;
  });
});

  // 🔁 Restart Button
  // Draw rounded rectangle background for Restart
const restartBg = this.add.graphics();
const restartWidth = 100;
const restartHeight = 35;
const restartRadius = 10;

// Position: right of pause button
const restartX = pauseX + pauseWidth + 12;
const restartY = pauseY;

restartBg.fillStyle(0x2a2a2a, 1);
restartBg.fillRoundedRect(restartX, restartY, restartWidth, restartHeight, restartRadius);
restartBg.lineStyle(2, 0xeb4034, 1); // Red border
restartBg.strokeRoundedRect(restartX, restartY, restartWidth, restartHeight, restartRadius);

// Add Restart button text
const restartBtnText = this.add.text(restartX + restartWidth / 2, restartY + restartHeight / 2, '⟳ Restart',  {
    fontSize: '40px',
    fontFamily: 'Outfit',
    color: '#eb4034',
    resolution: window.devicePixelRatio || 1 // 👈 makes it crisp
  }
).setOrigin(0.5).setScale(0.5).setDepth(1008)
 .setInteractive({ useHandCursor: true });

// Hover effect
restartBtnText.on('pointerover', () => {
  restartBg.clear();
  restartBg.fillStyle(0x3a3a3a, 1);
  restartBg.fillRoundedRect(restartX, restartY, restartWidth, restartHeight, restartRadius);
  restartBg.lineStyle(2, 0xeb4034, 1);
  restartBg.strokeRoundedRect(restartX, restartY, restartWidth, restartHeight, restartRadius);
});
restartBtnText.on('pointerout', () => {
  restartBg.clear();
  restartBg.fillStyle(0x2a2a2a, 1);
  restartBg.fillRoundedRect(restartX, restartY, restartWidth, restartHeight, restartRadius);
  restartBg.lineStyle(2, 0xeb4034, 1);
  restartBg.strokeRoundedRect(restartX, restartY, restartWidth, restartHeight, restartRadius);
});

// Click logic
restartBtnText.on('pointerdown', () => this.restartGame());

  // 📍 Position top-right
 
  this.assetsLoaded = true;
  
  const buttonRadius = 24;
  const marginX = 20 + buttonRadius;
  const marginY = this.scale.height - 90;
  const spacingY = 60;
  
  // Helper to create a circular button
  const createCircleButton = (
    x: number,
    y: number,
    emoji: string,
    onClick: () => void
  ) => {
    const circle = this.add.circle(0, 0, buttonRadius, 0x2a2a2a)
      .setStrokeStyle(2, 0x2aff84)
      .setDepth(1000);
  
    const icon = this.add.text(0, 0, emoji, {
      fontSize: '20px',
      fontFamily: 'Outfit',
      color: '#ffffff',
      resolution: window.devicePixelRatio || 1
    }).setOrigin(0.5)
      .setDepth(1000);
  
    const container = this.add.container(x, y, [circle, icon])
      .setSize(buttonRadius * 2, buttonRadius * 2)
      .setDepth(1000)
      .setScrollFactor(0)
      .setInteractive(
        new Phaser.Geom.Circle(20, 20, buttonRadius), // Hit area centered
        Phaser.Geom.Circle.Contains
      )
      .on('pointerdown', onClick);
  
    // ✅ DO NOT use `.setOrigin()` on the container
    return { container, icon };
  };
  // 🎵 Music Toggle Button
  let isMusicMuted = this.isMusicMuted;
  const { icon: musicIcon } = createCircleButton(marginX, marginY, '🔈', async () => {
    isMusicMuted = !isMusicMuted;
    this.isMusicMuted = isMusicMuted;
    musicIcon.setText(isMusicMuted ? '🔇' : '🔈');
  
    const existingMusic = this.sound.get('bgMusic');
    if (isMusicMuted && existingMusic) {
      existingMusic.pause();
    } else if (!isMusicMuted && existingMusic) {
      existingMusic.resume();
    } else if (!existingMusic) {
      await this.loadAudio('bgMusic', 'https://admin.demwitches.xyz/assets/music.mp3');
      this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.3 });
      if (!isMusicMuted) this.bgMusic.play();
    }
  });
  
  // 🔊 SFX Toggle Button
  let isSfxMuted = this.isSfxMuted;
  const { icon: sfxIcon } = createCircleButton(marginX, marginY + spacingY, '🔔', () => {
    isSfxMuted = !isSfxMuted;
    this.isSfxMuted = isSfxMuted;
    sfxIcon.setText(isSfxMuted ? '🔕' : '🔔');
  });

}
createStyledButton(
  x: number,
  y: number,
  label: string,
  bgColor: number,
  onClick: () => void
): Phaser.GameObjects.Container {
  const paddingX = 16;
  const paddingY = 8;
  const fontSize = 18;
  const borderRadius = 12;

  const text = this.add.text(0, 0, label, {
    fontSize: `${fontSize}px`,
    fontFamily: 'Outfit',
    color: '#ffffff',
    align: 'center',
  }).setOrigin(0.5);

  const width = text.width + paddingX * 2;
  const height = text.height + paddingY * 2;

  // 🔲 Add invisible hitbox rectangle
  const hitbox = this.add.rectangle(0, 0, width, height)
    .setOrigin(0.5)
    .setVisible(false);

  // 🎨 Draw button background
  const bg = this.add.graphics();
  bg.fillStyle(bgColor, 1);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);

  // 📦 Container
  const button = this.add.container(x, y, [hitbox, bg, text])
    .setSize(width, height) // Defines bounds for default hit area
    .setDepth(1020)
    .setInteractive() // ✅ No custom geometry here!
    .on('pointerdown', onClick)
    .on('pointerover', () => {
      bg.clear();
      bg.fillStyle(bgColor + 0x202020, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
      this.input.setDefaultCursor('pointer');
    })
    .on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
      this.input.setDefaultCursor('default');
    });

  return button;
}




loadAudio(key: string, url: string): Promise<void> {
  return new Promise((resolve) => {
    if (this.sound.get(key)) {
      resolve();
      return;
    }
    this.load.audio(key, url);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    this.load.start();
  });
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

  const container = this.add.container(screenX + 100, screenY + 60);
  container.setDepth(1000);
  const background = this.add.rectangle(0, 0, 120, 140, 0x111a12, 1)
    .setStrokeStyle(2, 0x2aff84)
    .setOrigin(0.5);
  container.add(background);

  const towerTypes = ['basic', 'rapid', 'cannon'];
  const buttonWidth = 100;
  const buttonHeight = 36;
  const buttonSpacing = 10;
  const totalHeight = towerTypes.length * buttonHeight + (towerTypes.length - 1) * buttonSpacing;
  const startY = -totalHeight / 2 + buttonHeight / 2;

  towerTypes.forEach((type, index) => {
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x333333)
      .setStrokeStyle(0)
      .setOrigin(0.5);

    const cost = towerCosts[type];
    const canAfford = this.vineBalance >= cost;
    const costColor = canAfford ? '#00ff00' : '#ff3333';

    const labelName = this.add.text(0, -8, type.toUpperCase(), {
      fontSize: '14px',
      fontFamily: 'Outfit',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    const labelCost = this.add.text(0, 10, `${cost} $VINE`, {
      fontSize: '16px',
      fontFamily: 'Outfit',
      color: costColor,
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
      console.log('[🔴 Upgrade clicked]');
      if (this.vineBalance < cost) return;
      this.currentTowerType = type;
      this.placeTowerAt(col, row);
      this.towerSelectPanel?.destroy();
      this.towerSelectPanel = undefined;
      this.towerSelectHighlight?.destroy();
      this.towerSelectHighlight = undefined;
      blocker.destroy();
      this.isPaused = false;
      this.physics.resume();
      this.enemySpawnEvent.paused = false;
      this.canSelectTile = true; // ✅ fix: allow immediate next tile selection
    });

    container.add(buttonContainer);
  });

  this.towerSelectPanel = container;

  const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.001)
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
      this.canSelectTile = true; // ✅ make sure this is also true from cancel
    });
  });
}

// ---------------------------------------------------------------------------
// ☠️ Unused legacy function (still present for potential future use)
// ---------------------------------------------------------------------------
handleBulletHit(
  bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
) {
  const bullet = bulletObj as Phaser.GameObjects.Arc;
  const enemy = enemyObj as Phaser.GameObjects.PathFollower;
  bullet.destroy();
  enemy.destroy();
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
  const bar = this.add.rectangle(enemy.x, enemy.y - 16, 20, 4, 0x00ff00);
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
  const enemies = this.enemyGroup.getChildren() as Phaser.GameObjects.Arc[];
  if (!enemies.length) return;
  const range = tower.getData('range') ?? 200;
  let closestEnemy: Phaser.GameObjects.Arc | null = null;
  let minDist = range;
  for (const enemy of enemies) {
    const dist = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
    if (dist < minDist) {
      closestEnemy = enemy;
      minDist = dist;
    }
  }
  if (!closestEnemy) return;
  // 🔄 Update tower facing direction
  if (tower instanceof Phaser.GameObjects.Image) {
    const textureKey = tower.texture.key;
    const towerX = tower.x;
    const enemyX = closestEnemy.x;
  
    if (enemyX < towerX && !textureKey.endsWith('Left')) {
      tower.setTexture(textureKey.replace('Right', 'Left'));
      console.log('🟢 Switched to LEFT');
    } else if (enemyX > towerX && !textureKey.endsWith('Right')) {
      tower.setTexture(textureKey.replace('Left', 'Right'));
      console.log('🟢 Switched to RIGHT');
    } else if (enemyX === towerX) {
      // Decide which way to face when perfectly aligned
      if (!textureKey.endsWith('Right')) {
        tower.setTexture(textureKey.replace('Left', 'Right'));
        console.log('🟢 Defaulting to RIGHT');
      }
    }
  }
  
  // 🌀 Flash or bounce effect
  if (tower instanceof Phaser.GameObjects.Arc) {
    const originalColor = tower.fillColor;
    tower.setFillStyle(0xffffff); // Flash white
    this.time.delayedCall(80, () => tower.setFillStyle(originalColor));
  } else if (tower instanceof Phaser.GameObjects.Image) {
    const baseScale = tower.getData('baseScale') ?? 0.075;
    this.tweens.add({
      targets: tower,
      scale: baseScale * 1.15,
      yoyo: true,
      duration: 80,
      ease: 'Sine.easeInOut',
    });
  }
  // 🎯 Create bullet
  const towerType = tower.getData('type');
  const bullet = this.add.circle(tower.x, tower.y, 4, 0xffffff);
  bullet.setData('target', closestEnemy);
  bullet.setData('damage', tower.getData('damage'));
  bullet.setData('towerType', towerType);
  // 💠 Style by tower type
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
  }
  this.physics.add.existing(bullet);
  const velocity = this.physics.velocityFromRotation(
    Phaser.Math.Angle.Between(tower.x, tower.y, closestEnemy.x, closestEnemy.y),
    500
  );
  (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
  this.bulletGroup.add(bullet);
  this.playPewSound();

  // 💨 Auto-destroy after timeout
  const bulletTimer = this.time.delayedCall(1500, () => bullet.destroy(), [], this);
bullet.setData('despawnTimer', bulletTimer);
}
  // ---------------------------------------------------------------------------
  // 🧱 placeTowerAt(): Places a tower on a buildable tile
  // ---------------------------------------------------------------------------
  placeTowerAt(col: number, row: number) {
    if (!this.assetsLoaded) {
      console.warn('⏳ Assets not fully loaded yet. Skipping tower placement.');
      return;
    }
    if (this.upgradePanelOpen) return;
    if (this.tileMap[row][col] !== 1) return;
  // 💰 Set tower cost based on type
  let cost = 20;
  if (this.currentTowerType === 'rapid') cost = 15;
  if (this.currentTowerType === 'cannon') cost = 35;
  if (this.vineBalance < cost) {
    const warning = this.add.text(Number(this.game.config.width) / 2, 40, '❌ Not enough $VINE', {
      fontSize: '16px',
      color: '#ff3333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.time.delayedCall(1200, () => warning.destroy());
    return;
  }
  this.vineBalance -= cost;
  this.vineText.setText(`$VINE: ${this.vineBalance}`);
  const x = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
  const y = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;
  let tower: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
  let fireRate: number, range: number, damage: number;
let imageKey: string | null = null;

if (this.currentTowerType === 'basic') {
  imageKey = 'basicTowerRight';
  fireRate = 700;
  range = 200;
  damage = 1;
} else if 

(this.currentTowerType === 'cannon') {
  imageKey = 'cannonTowerRight';
  fireRate = 1200;
  range = 250;
  damage = 2;
} else if (this.currentTowerType === 'rapid') {
  imageKey = 'rapidTowerRight';
  fireRate = 400;
  range = 150;
  damage = 0.5;
} else {
  // 🛡️ Safety fallback (shouldn't happen)
  imageKey = 'basicTowerRight';
  fireRate = 700;
  range = 200;
  damage = 1;
}

if (imageKey !== null) {
  tower = this.add.image(x, y, imageKey)
    .setScale(0.075)
    .setInteractive({ useHandCursor: true });
  tower.setData('baseScale', 0.075);
} else {
  // fallback for unknown types
  
  tower = this.add.circle(x, y, 15, 0xffffff);
  this.physics.add.existing(tower);
}
  tower.setDataEnabled();
  tower.setData('range', range);
  tower.setData('level', 1);
  tower.setData('damage', damage);
  tower.setData('type', this.currentTowerType);
  tower.setData('tileX', col);
  tower.setData('tileY', row);

  const levelText = this.add.text(x - 2, y + 12, '1', {
    fontSize: '14px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  tower.setData('levelText', levelText);
  // 🧠 Show upgrade on click
  tower.on('pointerdown', () => {
    this.activeTower = tower;
    
      this.showUpgradePanel(tower);
      
    
  });
  // 🌀 Hover scale effect
  const baseScale = tower.scale;
  tower.on('pointerover', () => {
    this.tweens.add({ targets: tower, scale: baseScale * 1.15, duration: 100 });
  });
  tower.on('pointerout', () => {
    this.tweens.add({ targets: tower, scale: baseScale, duration: 100 });
  });
  // 🧱 Update tilemap + tile color
  this.tileMap[row][col] = 2;
  this.tileSprites[row][col].setFillStyle(0x555555).setAlpha(0.3);
  // 🔁 Fire bullets at interval
  const shootTimer = this.time.addEvent({
    delay: fireRate,
    callback: () => {
      if (!this.isPaused) this.shootFromTower(tower);
    },
    loop: true
    
  });
  tower.setData('shootTimer', shootTimer);
  // 🧠 Track this tower so we can clean it up later
this.towers.push(tower);

}

playPewSound() {
  if (this.isSfxMuted) return;

  if (this.sound.get('pew')) {
    this.sound.play('pew', {
      volume: 0.8,
      rate: Phaser.Math.FloatBetween(0.95, 1.05),
    });
  } else {
    this.load.audio('pew', 'https://admin.demwitches.xyz/assets/pewpew.mp3');
    this.load.once('complete', () => {
      const pew = this.sound.add('pew');
      pew.play({
        volume: 0.8,
        rate: Phaser.Math.FloatBetween(0.95, 1.05),
      });
    });
    this.load.start();
  }
}

// ---------------------------------------------------------------------------
// 🔁 update(): Main game loop
// ---------------------------------------------------------------------------
update(_: number, delta: number) {
  const baseSpeed = 1 / 8000;
  if (this.isPaused) return;

  for (const enemyObj of this.enemyGroup.getChildren()) {
    const enemy = enemyObj as Phaser.GameObjects.Image;
    let t = enemy.getData('t') ?? 0;
    const speed = enemy.getData('speed') ?? baseSpeed;
    t += speed * delta;

    if (t >= 1) {
      // 🛑 Enemy reached the end of the path
      enemy.getData('hpBar')?.destroy();
      enemy.getData('hpBarBg')?.destroy();
      enemy.destroy();
      this.lives--;
      this.livesText.setText(`Lives: ${this.lives}`);
      this.enemiesEscaped++;

      // 🧠 If no enemies left, start next wave
      if (!this.gameOver && this.enemyGroup.countActive() === 0) {
        this.time.delayedCall(1000, () => this.startNextWave());
      }

      // 💀 Game Over condition
      if (this.lives <= 0 && !this.gameOver) {
        this.gameOver = true;
        this.enemySpawnEvent.remove(false);
        this.isPaused = true;
        this.physics.pause();

        // ⛔ Stop towers from firing
        this.towers.forEach(tower => {
          const timer = tower.getData('shootTimer');
          timer?.remove(false);
        });

        // 🚨 Display Game Over popup
        const centerX = Number(this.game.config.width) / 2;
        const centerY = Number(this.game.config.height) / 2;

        const overlay = this.add.rectangle(centerX, centerY, this.game.config.width as number, this.game.config.height as number, 0x000000, 0.4).setOrigin(0.5);
        overlay.setDepth(-1);

      // 🟥 Game Over Background (make taller to fit buttons)
const popupBg = this.add.rectangle(centerX, centerY, 320, 180, 0x000000, 0.8)
  .setOrigin(0.5)
  .setStrokeStyle(2, 0xff3333).setDepth(1006);

// 🧠 Game Over Text
const gameOverText = this.add.text(centerX, centerY - 50, '💀 Game Over', {
  fontSize: '36px',
  fontFamily: 'Outfit',
  fontStyle: 'bold',
  align: 'center',
  color: '#ff3333'
}).setOrigin(0.5).setDepth(1006);
// 🟩 Restart Button
const restartBtn = this.createStyledButton(centerX, centerY + 5, '🔁 Restart', 0x444444, () => {
  popupBg.destroy();
  gameOverText.destroy();
  restartBtn.destroy();
  this.claimButton?.destroy();
  this.restartGame();
});

// 🌿 Claim $VINE Button (spaced lower)
this.claimButton = this.createStyledButton(centerX, centerY + 52, '🌿 Claim $VINE', 0x2ecc71, () => {
  popupBg.destroy();
  gameOverText.destroy();
  restartBtn.destroy();
  this.claimButton?.destroy();


  window.dispatchEvent(new CustomEvent('claim-vine', {
    detail: { amount: this.vineBalance }
  }));
  this.restartGame();
});
        return;
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
          this.vineBalance += target.getData('reward') || 0;
          this.vineText.setText(`$VINE: ${this.vineBalance}`);
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
    
    // 💾 Save progress
    enemy.setData('t', t);
  }

  // 🔄 Update upgrade button color
  if (this.activeUpgradeButton && this.activeUpgradeCost !== undefined) {
    if (this.vineBalance >= this.activeUpgradeCost) {
      this.activeUpgradeButton.setColor('#00ff00');
    } else {
      this.activeUpgradeButton.setColor('#ff3333');
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
  this.waveText.setText(`Wave: ${this.waveNumber}`);
  this.enemiesSpawned = 0;
  this.enemiesKilled = 0;
  // 📦 Generate enemy queue
  // 📦 Use explicit wave config
const waveConfig = [
  { total: 5,  mix: { normal: 1.0 },                           hp: { normal: 5 },       reward: { normal: 4 } },
  { total: 6,  mix: { normal: 1.0 },                           hp: { normal: 5 },       reward: { normal: 5 } },
  { total: 8,  mix: { normal: 0.75, fast: 0.25 },              hp: { normal: 5, fast: 4 }, reward: { normal: 5, fast: 6 } },
  { total: 9,  mix: { normal: 0.6, fast: 0.4 },                hp: { normal: 5, fast: 4 }, reward: { normal: 6, fast: 7 } },
  { total: 10, mix: { normal: 0.6, fast: 0.3, tank: 0.1 },     hp: { normal: 5, fast: 4, tank: 18 }, reward: { normal: 6, fast: 7, tank: 12 } },
  { total: 12, mix: { normal: 0.5, fast: 0.3, tank: 0.2 },     hp: { normal: 5, fast: 4, tank: 18 }, reward: { normal: 7, fast: 8, tank: 14 } },
  { total: 14, mix: { normal: 0.4, fast: 0.3, tank: 0.3 },     hp: { normal: 5, fast: 4, tank: 18 }, reward: { normal: 8, fast: 8, tank: 15 } },
  { total: 16, mix: { normal: 0.3, fast: 0.3, tank: 0.4 },     hp: { normal: 5, fast: 4, tank: 18 }, reward: { normal: 8, fast: 9, tank: 16 } },
  { total: 18, mix: { normal: 0.2, fast: 0.4, tank: 0.4 },     hp: { normal: 5, fast: 4, tank: 18 }, reward: { normal: 9, fast: 10, tank: 18 } },
  { total: 20, mix: { fast: 0.2, tank: 0.8 },                  hp: { fast: 4, tank: 18 }, reward: { fast: 10, tank: 20 } }
];


const config = waveConfig[this.waveNumber - 1] ?? waveConfig[waveConfig.length - 1];
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

// Set current HP and rewards for spawnEnemy()
this.currentEnemyHP = config.hp;
this.currentEnemyReward = config.reward;

  // 🪧 Wave banner
  const bannerBg = this.add.rectangle(
    Number(this.game.config.width) / 2,
    Number(this.game.config.height) / 2,
    250, 80,
    0x222222,
    0.85
  ).setOrigin(0.5).setDepth(1005).setStrokeStyle(2, 0xffff00);
  this.canSelectTile = false;
  this.canSpawnEnemies = false;
  const bannerText = this.add.text(
    bannerBg.x, bannerBg.y,
    `🌊 Wave ${this.waveNumber}`,
    {
      fontSize: '28px',
      fontFamily: 'Outfit',
      color: '#2aff84',
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
  restartGame() {
  console.log('🔁 Restarting game...');
  // 🧹 Destroy enemies and health bars
  this.enemyGroup.getChildren().forEach((enemyObj) => {
    const enemy = enemyObj as Phaser.GameObjects.GameObject;
    if (!enemy?.active) return;
    const hpBar = enemy.getData('hpBar');
    const hpBarBg = enemy.getData('hpBarBg');
    hpBar?.destroy();
    hpBarBg?.destroy();
    enemy.destroy();
    this.bulletGroup.getChildren().forEach((bulletObj) => {
      const bullet = bulletObj as Phaser.GameObjects.Arc;
      const target = bullet.getData('target');
      if (target === enemy) {
        bullet.destroy();
      }
    });    
  });
// 🛑 Clear previous enemy spawn loop
if (this.enemySpawnEvent) {
  this.enemySpawnEvent.remove(false);
}
  this.enemyGroup.clear(true, true);
  // 🔥 Extra health bar cleanup
  this.children.getAll().forEach(child => {
    if (child.name === 'hpBar' || child.name === 'hpBarBg') {
      child.destroy();
    }
  });
  this.bulletGroup.clear(true, true);
// 🧹 Destroy towers
this.towers.forEach(tower => {
  const timer = tower.getData('shootTimer');
  if (timer) timer.remove(true); // 🧼 Fully remove timer

  const levelText = tower.getData('levelText') as Phaser.GameObjects.Text;
  levelText?.destroy(); // 🧹 Destroy level badge

  tower.destroy(); // 🧹 Destroy tower image
});

// 🔨 Extra brute-force cleanup for debug
this.children.getAll().forEach(child => {
  if (child instanceof Phaser.GameObjects.Image &&
      ['basicTowerRight','machineTower', 'cannonTower'].includes(child.texture.key)) {
    child.destroy();
  }
});

this.towers = []; // Clear tower references

  // 🔲 Reset map tiles
  for (let row = 0; row < this.mapRows; row++) {
    for (let col = 0; col < this.mapCols; col++) {
      if (this.tileMap[row][col] === 2) this.tileMap[row][col] = 1;
      this.tileSprites[row][col].setFillStyle(
        this.tileMap[row][col] === 0 ? 0x555555 : 0x228b22
      );
    }
  }
  // 🔁 Reset game values
  this.waveNumber = 0;
  this.vineBalance = 40;
  this.lives = 10;
  this.gameOver = false;
  // 🧾 Reset HUD
  this.vineText.setText(`$VINE: ${this.vineBalance}`);
  this.waveText.setText(`Wave: 1`);
  this.livesText.setText(`Lives: 10`);
  this.startNextWave();
  this.isPaused = false;
  this.physics.resume();
  
  // 🔁 Resume enemy spawns
  this.enemySpawnEvent = this.time.addEvent({
    delay: 1000,
    callback: this.spawnEnemy,
    callbackScope: this,
    loop: true,
  });
}
  // ---------------------------------------------------------------------------
  // 🔼 showUpgradePanel(): Displays tower upgrade UI
  // ---------------------------------------------------------------------------
  showUpgradePanel(tower: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & { getData: Function }) {
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
  const bg = this.add.rectangle(0, 0, panelWidth, 110, 0x333333)
    .setOrigin(0.5)
    .setStrokeStyle(2, 0xffffff);
  // 🔢 Stats
  const dmg = tower.getData('damage');
  const rng = tower.getData('range');
  const level = tower.getData('level') ?? 1;
  const baseCost = 25;
  const upgradeCost = Math.floor(baseCost * Math.pow(1.4, level - 1));
  const nextDmg = dmg + 1;
  const nextRng = rng + 20;
  // 🔵 Current & next range indicators
  this.rangeCircle = this.add.circle(tower.x, tower.y, rng, 0x88ccff, 0.2)
    .setStrokeStyle(1, 0x88ccff)
    .setDepth(-1);
  this.nextRangeCircle = this.add.circle(tower.x, tower.y, nextRng, 0x88ccff, 0.15)
    .setStrokeStyle(1, 0x88ccff)
    .setDepth(-1);
  const statsText = this.add.text(-panelWidth / 2 + 10, -40,
    `Damage: ${dmg} ➡️ ${nextDmg}\nRange: ${rng}  ➡️ ${nextRng}`,
    {
      fontSize: '16px',
      fontFamily: 'Outfit',
      color: '#ffffff',
      align: 'left',
      lineSpacing: 6,
    }
  );
  // 🔼 Upgrade button
  const hasEnough = this.vineBalance >= upgradeCost;
  const upgradeBtn = this.add.text(0, 30, `Upgrade 🔼 (${upgradeCost})`, {
    fontSize: '16px',
    fontFamily: 'Outfit',
    backgroundColor: hasEnough ? '#555555' : '#552222',
    padding: { x: 10, y: 6 },
    color: hasEnough ? '#00ff00' : '#ff3333',
  })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
      if (this.vineBalance >= upgradeCost) {
        this.vineBalance -= upgradeCost;
        this.vineText.setText(`$VINE: ${this.vineBalance}`);
        tower.setData('level', level + 1);
        tower.setData('damage', nextDmg);
        tower.setData('range', nextRng);

        const levelText = tower.getData('levelText') as Phaser.GameObjects.Text;
        levelText?.setText(String(level + 1));
        // ♻️ Clean and refresh panel
        this.rangeCircle?.destroy();
        this.nextRangeCircle?.destroy();
        this.rangeCircle = undefined;
        this.nextRangeCircle = undefined;
        this.showUpgradePanel(tower);
      } else {
        upgradeBtn.setText('❌ Not enough $VINE');
      }
    });
  this.activeUpgradeButton = upgradeBtn;
  this.activeUpgradeCost = upgradeCost;
  this.activeTower = tower;
  panel.add([bg, statsText, upgradeBtn]);
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
  
      // ✅ FIX: Resume the selected tower’s shooting timer (if it exists)
      const shootTimer = tower.getData('shootTimer');
      shootTimer.paused = false;
  
      const existingCircle = this.children.getByName('rangeCircle');
      existingCircle?.destroy();
      this.activeUpgradeButton = undefined;
      this.activeUpgradeCost = undefined;
      this.activeTower = undefined;
    });
  });  
  const blocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.001)
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
    this.canSelectTile = true; // ✅ make sure this is also true from cancel
  });
});
}
}