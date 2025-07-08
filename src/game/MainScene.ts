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
  // ---------------------------------------------------------------------------
  // 💰 Currency, Lives & Game State
  // ---------------------------------------------------------------------------
  vineBalance: number = 50; // Starting VINE
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
    fontSize: '18px',
    fontFamily: 'Orbitron',
    color: '#eeeeee',
  };
  this.vineText = this.add.text(40, hudY, '$VINE: 50', textStyle);
  this.waveText = this.add.text(220, hudY, 'Wave: 1', textStyle);
  this.livesText = this.add.text(400, hudY, 'Lives: 10', textStyle);
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
        tile.on('pointerdown', () => this.placeTowerAt(col, row));
      }
    }
  }
  // 🎵 Music Toggle Button

// 🔊 SFX Toggle Button

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
  // 🧠 Tower selector UI buttons
  const types = ['basic', 'cannon', 'rapid'];
  const towerButtons: Phaser.GameObjects.Container[] = [];
  const buttonSpacing = 12;
  const buttonMargin = 24;
  const buttonWidth = 100;
  const buttonHeight = 36;
  const buttonX = screenWidth - buttonMargin - buttonWidth / 2;
  const totalHeight = types.length * buttonHeight + (types.length - 1) * buttonSpacing;
  const buttonYBase = screenHeight - buttonMargin - totalHeight;
  types.forEach((type, index) => {
    const label = this.add.text(0, 0, type.toUpperCase(), {
      fontSize: '16px',
      fontFamily: 'Orbitron',
      color: '#ffffff',
      align: 'center',
    });
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x333333).setStrokeStyle(0);
    label.setPosition(-label.width / 2, -label.height / 2);
    const buttonContainer = this.add.container(0, 0, [bg, label]);
    buttonContainer.setPosition(buttonX, buttonYBase + index * (buttonHeight + buttonSpacing));
    buttonContainer.setSize(bg.width, bg.height);
    buttonContainer.setDepth(1);
    buttonContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, bg.width, bg.height), Phaser.Geom.Rectangle.Contains);
    buttonContainer.on('pointerdown', () => {
      this.currentTowerType = type;
      console.log(`🔧 Selected tower: ${type}`);
      towerButtons.forEach(btn => {
        const bgRect = btn.list[0] as Phaser.GameObjects.Rectangle;
        bgRect.setStrokeStyle(0);
      });
      const strokeColor = type === 'basic' ? 0x3366ff : type === 'cannon' ? 0xff3333 : 0xffff00;
      bg.setStrokeStyle(2, strokeColor);
      this.tweens.add({
        targets: buttonContainer,
        scale: 1.0,
        duration: 100,
        ease: 'Power1',
      });
    });
    towerButtons.push(buttonContainer);
    if (type === this.currentTowerType) {
      const strokeColor = type === 'basic' ? 0x3366ff : type === 'cannon' ? 0xff3333 : 0xffff00;
      bg.setStrokeStyle(2, strokeColor);
    }
  });
  // 🖼️ Selector panel background
  const panelPadding = 10;
  const firstButton = towerButtons[0];
  const lastButton = towerButtons[towerButtons.length - 1];
  const minX = firstButton.x - buttonWidth / 2 - panelPadding;
  const minY = firstButton.y - buttonHeight / 2 - panelPadding;
  const maxX = lastButton.x + buttonWidth / 2 + panelPadding;
  const maxY = lastButton.y + buttonHeight / 2 + panelPadding;
  const panelWidth = maxX - minX;
  const panelHeight = maxY - minY;
  this.add.rectangle(minX, minY, panelWidth, panelHeight, 0x111a12, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(2, 0x2aff84)
    .setDepth(0);
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
  const pauseBtn = this.add.text(0, 0, '⏸ Pause', {
    fontSize: '16px',
    fontFamily: 'Orbitron',
    backgroundColor: '#2a2a2a',
    color: '#e2e619',
    padding: { x: 12, y: 8 },
  })
    .setOrigin(1, 0)
    .setInteractive()
    .on('pointerdown', () => {
      this.isPaused = !this.isPaused;
      pauseBtn.setText(this.isPaused ? '▶️ Resume' : '⏸ Pause');
    });
  // 🔁 Restart Button
  const restartBtn = this.add.text(0, 0, '⟳ Restart', {
    fontSize: '16px',
    fontFamily: 'Orbitron',
    backgroundColor: '#2a2a2a',
    color: '#eb4034',
    padding: { x: 12, y: 8 },
  })
    .setOrigin(1, 0)
    .setInteractive()
    .on('pointerdown', () => this.restartGame());
  // 📍 Position top-right
  const spacing = 12;
  const rightMargin = 24;
  const topY = this.mapOffsetY / 8;
  const startX = Number(this.game.config.width) - rightMargin;
  restartBtn.setPosition(startX, topY);
  pauseBtn.setPosition(startX - restartBtn.width - spacing, topY);
  this.assetsLoaded = true;
  const buttonStyle = {
    fontSize: '28px',
    color: '#ffffff',
    backgroundColor: '#222',
    padding: { left: 8, right: 8, top: 4, bottom: 4 },
    fontFamily: 'sans-serif',
  };
  
  const marginX = 20;
  const marginY = this.scale.height - 90; // Top button Y
  const spacingY = 40;
  
  // 🎵 Music Toggle Button
  const musicButton = this.add.text(marginX, marginY, '🔈', buttonStyle)
    .setOrigin(0, 0.5)
    .setInteractive()
    .setScrollFactor(0)
    .setDepth(1000);
  
    musicButton.on('pointerdown', async () => {
    this.isMusicMuted = !this.isMusicMuted;
    musicButton.setText(this.isMusicMuted ? '🔇' : '🔈');
  
    const existingMusic = this.sound.get('bgMusic');
    if (this.isMusicMuted && existingMusic) {
      existingMusic.pause();
    } else if (!this.isMusicMuted && existingMusic) {
      existingMusic.resume();
    } else if (!existingMusic) {
      await this.loadAudio('bgMusic', 'https://admin.demwitches.xyz/assets/music.mp3');
      this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.4 });
      if (!this.isMusicMuted) this.bgMusic.play();
    }
  });
  
  // 🔊 SFX Toggle Button
  const sfxButton = this.add.text(marginX, marginY + spacingY, '🔔', buttonStyle)
    .setOrigin(0, 0.5)
    .setInteractive()
    .setScrollFactor(0)
    .setDepth(1000);
  
  sfxButton.on('pointerdown', () => {
    this.isSfxMuted = !this.isSfxMuted;
    sfxButton.setText(this.isSfxMuted ? '🔕' : '🔔');
  });
  
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
  let hp = 2 + this.waveNumber;
  let reward = 5;
  if (type === 'fast') {
    speed = 1 / 5000;
    hp = 1 + this.waveNumber * 0.8;
    reward = 3;
  } else if (type === 'tank') {
    speed = 1 / 12000;
    hp = 4 + this.waveNumber * 1.5;
    reward = 8;
  }
  enemy.setData('type', type);
  enemy.setData('hp', hp);
  enemy.setData('maxHp', hp);
  enemy.setData('reward', reward);
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
    case 'cannon':
      bullet.setFillStyle(0xff3300); // Orange-red
      bullet.setScale(1.4);
      break;
    case 'rapid':
      bullet.setFillStyle(0x00ffff); // Cyan
      bullet.setScale(0.75);
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
  this.time.delayedCall(1500, () => bullet.destroy());
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
  let cost = 10;
  if (this.currentTowerType === 'cannon') cost = 15;
  if (this.currentTowerType === 'rapid') cost = 12;
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
} else if (this.currentTowerType === 'cannon') {
  imageKey = 'cannonTowerRight';
  fireRate = 1200;
  range = 250;
  damage = 3;
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
  const levelText = this.add.text(x - 2, y + 12, '1', {
    fontSize: '14px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  tower.setData('levelText', levelText);
  // 🧠 Show upgrade on click
  tower.on('pointerdown', () => {
    if (!this.upgradePanelOpen && tower.getData('type') === this.currentTowerType) {
      this.showUpgradePanel(tower);
    }
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
      volume: 0.4,
      rate: Phaser.Math.FloatBetween(0.95, 1.05),
    });
  } else {
    this.load.audio('pew', 'https://admin.demwitches.xyz/assets/pewpew.mp3');
    this.load.once('complete', () => {
      const pew = this.sound.add('pew');
      pew.play({
        volume: 0.4,
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

        const popupBg = this.add.rectangle(centerX, centerY, 320, 140, 0x000000, 0.8)
          .setOrigin(0.5)
          .setStrokeStyle(2, 0xff3333);

        const gameOverText = this.add.text(centerX, centerY - 30, '💀 Game Over', {
          fontSize: '40px',
          fontFamily: 'Orbitron',
          fontStyle: 'bold',
          align: 'center',
          color: '#ff3333'
        }).setOrigin(0.5);

        const restartBtn = this.add.text(centerX, centerY + 30, '🔁 Restart', {
          fontSize: '20px',
          backgroundColor: '#444444',
          padding: { x: 10, y: 6 },
          color: '#ffffff'
        })
          .setOrigin(0.5)
          .setInteractive()
          .on('pointerdown', () => {
            popupBg.destroy();
            gameOverText.destroy();
            restartBtn.destroy();
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
  const count = 5 + this.waveNumber * 2;
  const queue: string[] = [];
  for (let i = 0; i < count; i++) {
    if (this.waveNumber < 3) {
      queue.push('normal');
    } else if (this.waveNumber < 6) {
      queue.push(Math.random() < 0.8 ? 'normal' : 'fast');
    } else {
      const r = Math.random();
      if (r < 0.6) queue.push('normal');
      else if (r < 0.85) queue.push('fast');
      else queue.push('tank');
    }
  }
  this.enemyQueue = queue;
  this.enemiesPerWave = queue.length;
  // 🪧 Wave banner
  const bannerBg = this.add.rectangle(
    Number(this.game.config.width) / 2,
    Number(this.game.config.height) / 2,
    250, 80,
    0x222222,
    0.85
  ).setOrigin(0.5).setStrokeStyle(2, 0xffff00);
  const bannerText = this.add.text(
    bannerBg.x, bannerBg.y,
    `🌊 Wave ${this.waveNumber}`,
    {
      fontSize: '28px',
      fontFamily: 'Orbitron',
      color: '#2aff84',
      fontStyle: 'bold',
      align: 'center',
    }
  ).setOrigin(0.5);
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
      ['basicTowerRight', 'cannonTower', 'machineTower'].includes(child.texture.key)) {
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
  this.vineBalance = 20;
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
  const panel = this.add.container(x, y).setName('upgradePanel');
  // 🧱 Panel background
  const bg = this.add.rectangle(0, 0, panelWidth, 110, 0x333333)
    .setOrigin(0.5)
    .setStrokeStyle(2, 0xffffff);
  // 🔢 Stats
  const dmg = tower.getData('damage');
  const rng = tower.getData('range');
  const level = tower.getData('level') ?? 1;
  const baseCost = 20;
  const upgradeCost = Math.floor(baseCost * Math.pow(1.3, level - 1));
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
    `🔸 DMG: ${dmg} ➡️ ${nextDmg}\n🔹 RNG: ${rng} ➡️ ${nextRng}`,
    {
      fontSize: '12px',
      fontFamily: 'Orbitron',
      color: '#ffffff',
      align: 'left',
      lineSpacing: 6,
    }
  );
  // 🔼 Upgrade button
  const hasEnough = this.vineBalance >= upgradeCost;
  const upgradeBtn = this.add.text(0, 20, `Upgrade 🔼 (${upgradeCost})`, {
    fontSize: '12px',
    fontFamily: 'Orbitron',
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
      const existingCircle = this.children.getByName('rangeCircle');
      existingCircle?.destroy();
      this.activeUpgradeButton = undefined;
      this.activeUpgradeCost = undefined;
      this.activeTower = undefined;
    });
  });
}
}