import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
  // 📦 Game Data
  path!: Phaser.Curves.Path;
  enemyGroup!: Phaser.GameObjects.Group;
  bulletGroup!: Phaser.GameObjects.Group;
  tower!: Phaser.GameObjects.Arc;
  towers: Phaser.GameObjects.Arc[] = [];

  vineBalance: number = 50; // 💰 Start with 50 VINE
  vineText!: Phaser.GameObjects.Text;
  waveText!: Phaser.GameObjects.Text;
  livesText!: Phaser.GameObjects.Text;
  rangeCircle?: Phaser.GameObjects.Arc;
  nextRangeCircle?: Phaser.GameObjects.Arc;
  mapOffsetX = 0;
  mapOffsetY = 0;
  isPaused: boolean = false;
  activeUpgradeButton?: Phaser.GameObjects.Text;
  activeUpgradeCost?: number;
  activeTower?: Phaser.GameObjects.Arc;

  tileSize = 64;
  mapCols = 10;
  mapRows = 8;
  tileMap: number[][] = [];
  tileSprites: Phaser.GameObjects.Rectangle[][] = [];

  waveNumber = 0;
  enemyQueue: string[] = []; // List of enemy types to spawn this wave
  enemiesPerWave = 5;
  enemiesSpawned = 0;
  enemiesKilled = 0;
  enemiesEscaped = 0;
  lives = 10;
  gameOver = false;

  enemySpawnEvent!: Phaser.Time.TimerEvent;
  currentTowerType: string = 'basic'; // 🔧 default tower
  
  upgradePanelOpen: boolean = false;

  constructor() {
    super('MainScene');
  }

  preload() {
    // 🔹 Load assets if needed
  }

  create() {
    console.log('✅ MainScene created');
    
    const screenWidth = Number(this.game.config.width);
    const screenHeight = Number(this.game.config.height);
    const mapWidth = this.mapCols * this.tileSize;
    const mapHeight = this.mapRows * this.tileSize;
    
    this.mapOffsetX = (screenWidth - mapWidth) / 2;
    this.mapOffsetY = (screenHeight - mapHeight) / 2;

    
    // 🧿 Create enemy texture
    const circle = this.add.graphics();
    circle.fillStyle(0xff0000, 1);
    circle.fillCircle(0, 0, 10);
    circle.generateTexture('enemy', 20, 20);
    circle.destroy();

    // 🛤️ Draw jungle path
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

    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x00ff00, 1);
    this.path.draw(graphics);

    // 💬 UI Text
    const hudY = this.mapOffsetY / 4;

this.vineText = this.add.text(40, hudY, '$VINE: 50', { fontSize: '20px', color: '#ffffff' });
this.waveText = this.add.text(220, hudY, 'Wave: 1', { fontSize: '20px', color: '#ffffff' });
this.livesText = this.add.text(400, hudY, 'Lives: 10', { fontSize: '20px', color: '#ffffff' });


    // 🧱 Tilemap logic (1 = buildable, 0 = path)
    this.tileMap = Array.from({ length: this.mapRows }, () => Array(this.mapCols).fill(1));
    for (const [col, row] of pathTiles) this.tileMap[row][col] = 0;

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

    // 👾 Groups
    this.enemyGroup = this.add.group();
    this.bulletGroup = this.add.group();

    // 🔁 Enemy spawn loop
    this.enemySpawnEvent = this.time.addEvent({
      delay: 1000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

  // 🧠 Tower type selector with hover + selection styling
  const types = ['basic', 'cannon', 'rapid'];
  const buttonSpacing = 40;
  const buttonMargin = 20;
  
  const buttonStartX = screenWidth - buttonMargin;
  const buttonStartY = screenHeight - (types.length * buttonSpacing) - buttonMargin;
  
  const towerButtons: Phaser.GameObjects.Container[] = [];
  
  types.forEach((type, index) => {
    const label = this.add.text(0, 0, type.toUpperCase(), {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    });
  
    const paddingX = 12;
    const paddingY = 8;
    const bg = this.add.rectangle(0, 0, label.width + paddingX * 2, label.height + paddingY * 2, 0x333333)
      .setStrokeStyle(0); // no border initially
  
    label.setPosition(-label.width / 2, -label.height / 2);
    const buttonContainer = this.add.container(0, 0, [bg, label]);
  
    const btnX = buttonStartX - bg.width / 2;
    const btnY = buttonStartY + index * buttonSpacing;
    buttonContainer.setPosition(btnX, btnY);
    buttonContainer.setSize(bg.width, bg.height);
    buttonContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, bg.width, bg.height), Phaser.Geom.Rectangle.Contains);
  
    buttonContainer.on('pointerdown', () => {
      this.currentTowerType = type;
      console.log(`🔧 Selected tower: ${type}`);
  
      // Reset all button borders
      towerButtons.forEach(btn => {
        const bgRect = btn.list[0] as Phaser.GameObjects.Rectangle;
        bgRect.setStrokeStyle(0);
      });
  
      // Set selected border
      const strokeColor =
        type === 'basic' ? 0x3366ff :
        type === 'cannon' ? 0xff3333 :
        0xffff00;
  
      bg.setStrokeStyle(2, strokeColor);
    });
  
    towerButtons.push(buttonContainer);
  
    // If this is the default selected tower, highlight it
    if (type === this.currentTowerType) {
      const strokeColor =
        type === 'basic' ? 0x3366ff :
        type === 'cannon' ? 0xff3333 :
        0xffff00;
      bg.setStrokeStyle(2, strokeColor);
    }
  });
  
    // 💥 Bullet + Enemy collision
      this.physics.add.overlap(
      this.bulletGroup,
      this.enemyGroup,
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Phaser.GameObjects.Arc;
        const enemy = enemyObj as Phaser.GameObjects.Arc;
    
        // ⛑ Extract damage directly from the GameObject's data store
        const damage = bullet.getData('damage');
        let hp = enemy.getData('hp');
    
        if (typeof damage !== 'number') {
          console.warn('❌ Bullet has no damage value!', bullet);
          return;
        }
    
        hp -= damage;
        bullet.destroy();
    
        console.log(`💥 Bullet hit! Damage: ${damage} | HP now: ${hp}`);
    
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
            bar.setFillStyle(
              percent > 0.5 ? 0x00ff00 : percent > 0.25 ? 0xffa500 : 0xff0000
            );
          }
        }
      }
    );

    
    this.startNextWave(); // 👈 Kick off the first wave!

    // Restart Button
// ⏸ Pause Button
const pauseBtn = this.add.text(0, 0, '⏸ Pause', {
  fontSize: '18px',
  color: '#ffffff',
  backgroundColor: '#444444',
  padding: { x: 10, y: 6 }
})
.setOrigin(1, 0)
.setInteractive()
.on('pointerdown', () => {
  this.isPaused = !this.isPaused;
  pauseBtn.setText(this.isPaused ? '▶️ Resume' : '⏸ Pause');
});

// 🔁 Restart Button
const restartBtn = this.add.text(0, 0, '⟳ Restart', {
  fontSize: '18px',
  color: '#ffffff',
  backgroundColor: '#444444',
  padding: { x: 10, y: 6 }
})
.setOrigin(1, 0)
.setInteractive()
.on('pointerdown', () => this.restartGame());

// Position side-by-side in the top-right margin area
const spacing = 12;
const hudTopY = this.mapOffsetY / 6; // same as vine/wave HUD

restartBtn.setPosition(Number(this.game.config.width) - buttonMargin, hudTopY);
pauseBtn.setPosition(restartBtn.x - restartBtn.width - spacing, hudTopY);

  }

  // 💀 Redundant function, not used
  handleBulletHit(bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody, enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    const bullet = bulletObj as Phaser.GameObjects.Arc;
    const enemy = enemyObj as Phaser.GameObjects.PathFollower;
    bullet.destroy();
    enemy.destroy();
  }

  // 🧟 Spawns one enemy at start of path
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
  
    const barBg = this.add.rectangle(enemy.x, enemy.y - 16, 20, 4, 0x222222);
barBg.name = 'hpBarBg';

const bar = this.add.rectangle(enemy.x, enemy.y - 16, 20, 4, 0x00ff00);
bar.name = 'hpBar';

    enemy.setData('hpBar', bar);
    enemy.setData('hpBarBg', barBg);
  
    this.enemyGroup.add(enemy);
    this.enemiesSpawned++;
  }  

  // Create Enemy Graphic
  createEnemyGraphic(type: string, x: number, y: number): Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Triangle {
    let enemy;
  
    if (type === 'fast') {
      // Yellow triangle
      enemy = this.add.triangle(x, y, 0, 20, 10, 0, 20, 20, 0xffff00);
    } else if (type === 'tank') {
      // Blue square
      enemy = this.add.rectangle(x, y, 20, 20, 0x3399ff);
    } else {
      // Red circle (default)
      enemy = this.add.circle(x, y, 10, 0xff0000);
    }
  
    return enemy;
  }  
  
  // 🎯 Shoot bullet at closest enemy in range
  shootFromTower(tower: Phaser.GameObjects.Arc) {
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

    const bullet = this.add.circle(tower.x, tower.y, 4, 0xffff00);
    this.physics.add.existing(bullet);

    bullet.setData('target', closestEnemy);
    bullet.setData('damage', tower.getData('damage'));

    console.log(`💥 Creating bullet | Damage: ${tower.getData('damage')}`);

    const velocity = this.physics.velocityFromRotation(
      Phaser.Math.Angle.Between(tower.x, tower.y, closestEnemy.x, closestEnemy.y),
      500
    );
    (bullet.body as Phaser.Physics.Arcade.Body).setVelocity(velocity.x, velocity.y);
    this.bulletGroup.add(bullet);

    this.time.delayedCall(1500, () => bullet.destroy());
  }

  // 🧱 Place tower based on current type
  placeTowerAt(col: number, row: number) {
    if (this.upgradePanelOpen) return;
    if (this.tileMap[row][col] !== 1) return;
    let cost = 10;
    if (this.currentTowerType === 'cannon') {
      cost = 15;
    } else if (this.currentTowerType === 'rapid') {
      cost = 12;
    }
    
    if (this.vineBalance < cost) {
      const warning = this.add.text(Number(this.game.config.width) / 2, 40, '❌ Not enough $VINE', {
        fontSize: '16px',
        color: '#ff3333',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    
      this.time.delayedCall(1200, () => warning.destroy());
      return;
    }
    
    const x = this.mapOffsetX + col * this.tileSize + this.tileSize / 2;
    const y = this.mapOffsetY + row * this.tileSize + this.tileSize / 2;


    let color = 0x3366ff, fireRate = 700, range = 200, damage = 1;

    if (this.currentTowerType === 'cannon') {
      color = 0xff3333; fireRate = 1200; range = 250; damage = 3;
    } else if (this.currentTowerType === 'rapid') {
      color = 0xffff00; fireRate = 400; range = 150; damage = 0.5;
    }
    this.vineBalance -= cost;
    this.vineText.setText(`$VINE: ${this.vineBalance}`);    
    const tower = this.add.circle(x, y, 15, color);
    const levelText = this.add.text(x + 12, y - 18, '1', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Store on tower for reference
    tower.setData('levelText', levelText);    
    this.physics.add.existing(tower);
    tower.setData('range', range);
    tower.setData('level', 1);
    tower.setData('damage', damage);
    tower.setInteractive().on('pointerdown', () => {
      if (this.upgradePanelOpen) return; // 🚫 Block if panel already open
      this.showUpgradePanel(tower);
    });
    
    this.tileMap[row][col] = 2;
    this.tileSprites[row][col].setFillStyle(0x0000ff).setAlpha(0.3);
    this.towers.push(tower);

    const shootTimer = this.time.addEvent({
      delay: fireRate,
      callback: () => {
        if (!this.isPaused) {
          this.shootFromTower(tower);
        }
      },
      loop: true
    });
    
    // Store timer on tower
    tower.setData('shootTimer', shootTimer);    
  }

  // 🔁 Main game loop
  update(_: number, delta: number) {
    const baseSpeed = 1 / 8000;
    if (this.isPaused) return;
    this.enemyGroup.getChildren().forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.GameObjects.Arc;
      let t = enemy.getData('t') ?? 0;
      const speed = enemy.getData('speed') ?? baseSpeed;
      t += speed * delta;

      if (t >= 1) {
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
          this.scene.pause();
          // 🧹 Stop all tower shoot timers
          this.towers.forEach(tower => {
          const timer = tower.getData('shootTimer');
          timer?.remove(false);
          });

          const gameOverBg = this.add.rectangle(
            Number(this.game.config.width) / 2,
            Number(this.game.config.height) / 2,
            320, 100,
            0x111111,
            0.9
          ).setOrigin(0.5).setStrokeStyle(3, 0xff3333);
          
          const gameOverText = this.add.text(300, 250, '💀 Game Over', {
            fontSize: '40px',
            color: '#ff3333'
          }).setOrigin(0.5);
        
          const restartBtn = this.add.text(300, 300, '🔁 Restart', {
            fontSize: '20px',
            backgroundColor: '#444444',
            padding: { x: 10, y: 6 },
            color: '#ffffff'
          })
          .setOrigin(0.5)
          .setInteractive()
          .on('pointerdown', () => {
            gameOverText.destroy();
            restartBtn.destroy();
            this.restartGame();
          });        
          
        }

        return;
      }

      const vec = new Phaser.Math.Vector2();
      this.path.getPoint(t, vec);
      enemy.setPosition(vec.x, vec.y);

      const bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;
      const barBg = enemy.getData('hpBarBg') as Phaser.GameObjects.Rectangle;

      bar?.setPosition(vec.x, vec.y - 16);
      barBg?.setPosition(vec.x, vec.y - 16);

      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.reset(vec.x, vec.y);

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

    // 💡 Live update the upgrade button color
if (this.activeUpgradeButton && this.activeUpgradeCost !== undefined) {
  if (this.vineBalance >= this.activeUpgradeCost) {
    this.activeUpgradeButton.setColor('#00ff00'); // ✅ green
    this.activeUpgradeButton.setText(`Upgrade 🔼 (${this.activeUpgradeCost})`);
  } else {
    this.activeUpgradeButton.setColor('#ff3333'); // ❌ red
    this.activeUpgradeButton.setText(`Upgrade 🔼 (${this.activeUpgradeCost})`);
  }
}

  }

  // ✅ Ends wave & starts next
  checkWaveOver() {
    const activeEnemies = this.enemyGroup.getChildren().filter(enemy => enemy.active);
    const allSpawned = this.enemiesSpawned >= this.enemiesPerWave;

    if (allSpawned && activeEnemies.length === 0 && !this.gameOver) {
      this.time.delayedCall(1000, () => this.startNextWave());
    }
  }

  startNextWave() {
    this.enemiesEscaped = 0;
    this.waveNumber++;
    this.waveText.setText(`Wave: ${this.waveNumber}`);
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
  
    // 📦 Define enemy composition
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
  
    const bannerBg = this.add.rectangle(
      Number(this.game.config.width) / 2,
      Number(this.game.config.height) / 2,
      250, 80,
      0x222222,
      0.85
    ).setOrigin(0.5).setStrokeStyle(2, 0xffff00);
    
    const bannerText = this.add.text(
      bannerBg.x,
      bannerBg.y,
      `🌊 Wave ${this.waveNumber}`,
      {
        fontSize: '26px',
        color: '#ffcc00',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);
    
    this.time.delayedCall(2000, () => {
      bannerBg.destroy();
      bannerText.destroy();
    });
    
  
    this.time.delayedCall(2000, () => {
      bannerBg.destroy();
      bannerText.destroy();
    });    
    console.log(`🚨 Wave ${this.waveNumber} starting...`);
  }  


  restartGame() {
    console.log('🔁 Restarting game...');
  
    // 🧹 Cleanup enemies and bullets
    this.enemyGroup.getChildren().forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.GameObjects.GameObject;
    
      if (!enemy || !enemy.active) return;
    
      const hpBar = enemy.getData('hpBar');
      const hpBarBg = enemy.getData('hpBarBg');
    
      if (hpBar && hpBar.destroy) hpBar.destroy();
      if (hpBarBg && hpBarBg.destroy) hpBarBg.destroy();
      if (enemy.destroy) enemy.destroy();
    });
    
    this.enemyGroup.clear(true, true);
    // 🔥 Destroy leftover health bars (in case enemies were destroyed without clearing bars)
this.children.getAll().forEach(child => {
  if (child.name === 'hpBar' || child.name === 'hpBarBg') {
    child.destroy();
  }
});

    this.bulletGroup.clear(true, true);
  
    // 🧹 Destroy towers and cancel shoot timers
    this.towers.forEach(tower => {
      tower.getData('shootTimer')?.remove(false);
      const levelText = tower.getData('levelText') as Phaser.GameObjects.Text;
      levelText?.destroy();
      tower.destroy();
    });
    
    this.towers = [];
  
    // 🧹 Reset tile map visuals
    for (let row = 0; row < this.mapRows; row++) {
      for (let col = 0; col < this.mapCols; col++) {
        if (this.tileMap[row][col] === 2) this.tileMap[row][col] = 1;
        this.tileSprites[row][col].setFillStyle(
          this.tileMap[row][col] === 0 ? 0x555555 : 0x228b22
        );
      }
    }
  
    // 🔁 Reset game state
    this.waveNumber = 0;
    this.vineBalance = 20;
    this.lives = 10;
    this.gameOver = false;
  
    // 🔄 Update UI
    this.vineText.setText(`$VINE: ${this.vineBalance}`);
    this.waveText.setText(`Wave: 1`);
    this.livesText.setText(`Lives: 10`);
  
    // ▶️ Resume gameplay
    this.scene.resume();
    this.startNextWave();
  }
  

  // SHOW TOWER UPGRADE PANEL FUNCTION
  showUpgradePanel(tower: Phaser.GameObjects.Arc) {
    const existing = this.children.getByName('upgradePanel');
    if (existing) existing.destroy();
    
    this.upgradePanelOpen = true;
    this.isPaused = true;
    // 🚮 Remove any old range circles
this.rangeCircle?.destroy();
this.nextRangeCircle?.destroy();

    this.input.enabled = false;
    this.time.delayedCall(150, () => {
      this.input.enabled = true;
    });
  
    // 🧠 Position to the right of the tower, but shift left if near edge
const panelWidth = 170;
const padding = 10;

let x = tower.x + panelWidth / 2 + padding;
if (x + panelWidth / 2 > Number(this.game.config.width)) {
  x = tower.x - panelWidth / 2 - padding;
}

const y = tower.y;

    const panel = this.add.container(x, y).setName('upgradePanel');

  // 🎯 Show range indicator (don't add to panel!)
  

    const bgWidth = 170;
    const bgHeight = 110;

    const bg = this.add.rectangle(0, 0, bgWidth, bgHeight, 0x333333)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff);

  
    const dmg = tower.getData('damage');
    const rng = tower.getData('range');
    
    const level = tower.getData('level') ?? 1;
    const baseCost = 20;
    const upgradeCost = Math.floor(baseCost * Math.pow(1.3, level - 1));
  
    const nextDmg = dmg + 1;
    const nextRng = rng + 20;

   // 🔵 Show current range (soft blue)
this.rangeCircle = this.add.circle(tower.x, tower.y, rng, 0x88ccff, 0.2)
  .setStrokeStyle(1, 0x88ccff)
  .setDepth(-1);

// ⚪️ Show next range (faded blue)
this.nextRangeCircle = this.add.circle(tower.x, tower.y, nextRng, 0x88ccff, 0.15)
  .setStrokeStyle(1, 0x88ccff)
  .setDepth(-1);



    const statsText = this.add.text(-bgWidth / 2 + 10, -bgHeight / 2 + 16, 
      `🔸 DMG: ${dmg} ➡️ ${nextDmg}\n🔹 RNG: ${rng} ➡️ ${nextRng}`, 
      {
        fontSize: '14px',
        color: '#ffffff',
        align: 'left',
        lineSpacing: 6 // 🧼 adds vertical space between lines
      }
    );
    
    

  
    const hasEnough = this.vineBalance >= upgradeCost;
  
    const upgradeBtn = this.add.text(0, 20, `Upgrade 🔼 (${upgradeCost})`, {
      fontSize: '14px',
      backgroundColor: hasEnough ? '#555555' : '#552222',
      padding: { x: 10, y: 6 },
      color: hasEnough ? '#ffff00' : '#ff3333'
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
      if (this.vineBalance >= upgradeCost) {
        this.vineBalance -= upgradeCost;
        this.vineText.setText(`$VINE: ${this.vineBalance}`);
        tower.setData('level', level + 1);
        tower.setData('damage', dmg + 1);
        tower.setData('range', rng + 20);
        const levelText = tower.getData('levelText') as Phaser.GameObjects.Text;
if (levelText) {
  levelText.setText(String(level + 1));
}

        // 🧼 Clean up previous range circles
        this.rangeCircle?.destroy();
        this.nextRangeCircle?.destroy();
        this.rangeCircle = undefined;
        this.nextRangeCircle = undefined;
    
        this.showUpgradePanel(tower); // 🔁 Refresh
      } else {
        upgradeBtn.setText('❌ Not enough $VINE');
      }
    });    
    
    // 🧠 Store active button and context for live updates
    this.activeUpgradeButton = upgradeBtn;
    this.activeUpgradeCost = upgradeCost;
    this.activeTower = tower;    
  
    panel.add([bg, statsText, upgradeBtn]);
  
    // Remove panel on outside click
    this.time.delayedCall(100, () => {
      this.input.once('pointerdown', () => {
        panel.destroy();
        this.rangeCircle?.destroy();
this.nextRangeCircle?.destroy();
this.rangeCircle = undefined;
this.nextRangeCircle = undefined;

        this.upgradePanelOpen = false;
        this.isPaused = false;
        // 💣 Remove range circle when panel closes
        const existingCircle = this.children.getByName('rangeCircle');
        existingCircle?.destroy();
        
        // 🔁 Reset upgrade button tracking
        this.activeUpgradeButton = undefined;
        this.activeUpgradeCost = undefined;
        this.activeTower = undefined;
        
      });      
    });
  }  
  
}
