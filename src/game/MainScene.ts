import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
  // ---------------------------------------------------------------------------
  // 📦 Core Game Objects
  // ---------------------------------------------------------------------------
  path!: Phaser.Curves.Path;
  enemyGroup!: Phaser.GameObjects.Group;
  bulletGroup!: Phaser.GameObjects.Group;
  tower!: Phaser.GameObjects.Arc;
  towers: Phaser.GameObjects.Arc[] = [];
  hudBar!: Phaser.GameObjects.Rectangle;

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
  this.load.image('basicTower', 'https://admin.demwitches.xyz/assets/archerturret.svg');
  this.load.image('cannonTower', 'https://admin.demwitches.xyz/assets/cannonturret.svg');
  this.load.image('rapidTower', 'https://admin.demwitches.xyz/assets/rapidturret.svg');
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

  const enemy = this.createEnemyGraphic(type, start.x, start.y);
  this.physics.add.existing(enemy);
  const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
  enemyBody.setImmovable(true);
  enemy.setData('t', 0);

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
createEnemyGraphic(
  type: string,
  x: number,
  y: number
): Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Triangle {
  if (type === 'fast') {
    return this.add.triangle(x, y, 0, 20, 10, 0, 20, 20, 0xffff00); // Yellow triangle
  } else if (type === 'tank') {
    return this.add.rectangle(x, y, 20, 20, 0x3399ff); // Blue square
  } else {
    return this.add.circle(x, y, 10, 0xff0000); // Red circle (default)
  }
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

  // 💨 Auto-destroy after timeout
  this.time.delayedCall(1500, () => bullet.destroy());
}
  // ---------------------------------------------------------------------------
// 🧱 placeTowerAt(): Places a tower on a buildable tile
// ---------------------------------------------------------------------------
placeTowerAt(col: number, row: number) {
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
  let fireRate = 700, range = 200, damage = 1;
  let imageKey: string | null = null;

  if (this.currentTowerType === 'basic') imageKey = 'basicTower';
  else if (this.currentTowerType === 'cannon') imageKey = 'cannonTower';
  else if (this.currentTowerType === 'rapid') imageKey = 'rapidTower';

  if (imageKey) {
    tower = this.add.image(x, y, imageKey)
      .setScale(0.075)
      .setInteractive({ useHandCursor: true });
    tower.setData('baseScale', 0.075);
  } else {
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
}

// ---------------------------------------------------------------------------
// 🔁 update(): Main game loop
// ---------------------------------------------------------------------------
update(_: number, delta: number) {
  const baseSpeed = 1 / 8000;
  if (this.isPaused) return;

  this.enemyGroup.getChildren().forEach((enemyObj) => {
    const enemy = enemyObj as Phaser.GameObjects.Arc;
    let t = enemy.getData('t') ?? 0;
    const speed = enemy.getData('speed') ?? baseSpeed;
    t += speed * delta;

    if (t >= 1) {
      // Enemy escaped
      enemy.getData('hpBar')?.destroy();
      enemy.getData('hpBarBg')?.destroy();
      enemy.destroy();
      this.lives--;
      this.livesText.setText(`Lives: ${this.lives}`);
      this.enemiesEscaped++;

      if (!this.gameOver && this.enemyGroup.countActive() === 0) {
        this.time.delayedCall(1000, () => this.startNextWave());
      }

      if (this.lives <= 0 && !this.gameOver) {
        this.gameOver = true;
        this.enemySpawnEvent.remove(false);
        this.isPaused = true;
        this.physics.pause();

        // ⛔ Stop tower shooting
        this.towers.forEach(tower => {
          const timer = tower.getData('shootTimer');
          timer?.remove(false);
        });

        // 💀 Show Game Over popup
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
    }

    // 🧭 Move enemy along path
    const vec = new Phaser.Math.Vector2();
    this.path.getPoint(t, vec);
    enemy.setPosition(vec.x, vec.y);

    const bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;
    const barBg = enemy.getData('hpBarBg') as Phaser.GameObjects.Rectangle;
    bar?.setPosition(vec.x, vec.y - 16);
    barBg?.setPosition(vec.x, vec.y - 16);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.reset(vec.x, vec.y);

    // 🎯 Track and steer bullets
    this.bulletGroup.getChildren().forEach((bulletObj) => {
      const bullet = bulletObj as Phaser.GameObjects.Arc;
      const target = bullet.getData('target') as Phaser.GameObjects.Arc;
      if (!target || !target.active) return;

      const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
      const velocity = this.physics.velocityFromRotation(angle, 500);
      (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
    });

    enemy.setData('t', t);
  });

  // 💡 Update upgrade button color based on VINE balance
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
    tower.getData('shootTimer')?.remove(false);
    const levelText = tower.getData('levelText') as Phaser.GameObjects.Text;
    levelText?.destroy();
    tower.destroy();
  });
  this.towers = [];

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