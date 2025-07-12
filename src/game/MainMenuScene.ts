// src/game/MainMenuScene.ts
import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    const centerX = Math.round(this.cameras.main.centerX);
    const centerY = Math.round(this.cameras.main.centerY);
    

    // 1. 🔤 Title
    const title = this.add.text(centerX, centerY - 140, 'Ape Tower', {
      fontFamily: 'Outfit',
      fontSize: '64px',
      color: '#00ff88',
    })
      .setOrigin(0.5)
      .setShadow(4, 4, '#000000', 4, true, true)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    // 2. 🟩 Start Game Button
    const buttonBg = this.add.rectangle(centerX, centerY + 20, 200, 60, 0x00ff88, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const buttonText = this.add.text(centerX, centerY + 20, 'Start Game', {
      fontFamily: 'Outfit',
      fontSize: '28px',
      color: '#000000'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [buttonBg, buttonText],
      alpha: 1,
      duration: 500,
      ease: 'Power2',
      delay: 300,
    });

    // 💫 Subtle glow pulse on title
    this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.03 },
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut'
    });

    // 🧠 Hover Effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x00ffaa);
      buttonBg.setScale(1.05);
      buttonText.setColor('#111111');
    });
    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x00ff88);
      buttonBg.setScale(1);
      buttonText.setColor('#000000');
    });

    buttonBg.on('pointerdown', () => {
      this.scene.start('MainScene');
    });

    // 3. 📜 Rules Button
 // 📜 Rules Button (now fully matches Start Game style)
// 📜 Rules Button
const rulesButtonBg = this.add.rectangle(centerX, centerY + 100, 200, 60, 0xffaa44, 1)
  .setOrigin(0.5)
  .setStrokeStyle(2, 0xffffff)
  .setInteractive({ useHandCursor: true })
  .setAlpha(0); // <== important for fade in

const rulesButtonText = this.add.text(centerX, centerY + 100, 'The Rules', {
  fontFamily: 'Outfit',
  fontSize: '28px',
  color: '#000000',
  resolution: 2 // <== 👈 crisp on HiDPI
}).setOrigin(0.5).setAlpha(0); // <== important for fade in

// 🌀 Fade-in Tween (matches Start Game)
this.tweens.add({
  targets: [rulesButtonBg, rulesButtonText],
  alpha: 1,
  duration: 500,
  ease: 'Power2',
  delay: 300, // match Start Game or change to 400 for a staggered look
});


// 🎯 Hover Effects — matches Start Game
rulesButtonBg.on('pointerover', () => {
rulesButtonBg.setFillStyle(0xffbb66);
rulesButtonBg.setScale(1.05);
rulesButtonText.setColor('#111111');
});
rulesButtonBg.on('pointerout', () => {
rulesButtonBg.setFillStyle(0xffaa44);
rulesButtonBg.setScale(1);
rulesButtonText.setColor('#000000');
});
// 🔒 Interaction-blocking overlay (initially hidden)
const modalBlocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
  .setOrigin(0)
  .setInteractive()
  .setVisible(false);


    // 4. 🧾 Rules Modal (initially hidden)
    const modalBg = this.add.rectangle(centerX, centerY, 500, 300, 0x0d130f, .98)
      .setStrokeStyle(2, 0x00ff88)
      .setOrigin(0.5)
      .setVisible(false);

    const rulesText = this.add.text(centerX, centerY, `Don't be a pussy. Get in there and get your hands dirty 😈`, {
      fontFamily: 'Outfit',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 460 }
    })
      .setOrigin(0.5)
      .setVisible(false);

    // ❌ Close Button (styled like Start Game & Rules)
    const closeButtonBg = this.add.rectangle(centerX, centerY + 110, 140, 44, 0x111111, 1)
  .setOrigin(0.5)
  .setStrokeStyle(2, 0xffffff)
  .setInteractive({ useHandCursor: true })
  .setVisible(false);

const closeButtonText = this.add.text(centerX, centerY + 110, '🆇 Close', {
  fontFamily: 'Outfit',
  fontSize: '22px',
  color: '#ff4444' // bright red for visibility
}).setOrigin(0.5).setVisible(false);


// Hover Effects (same as other buttons)
closeButtonBg.on('pointerover', () => {
closeButtonBg.setFillStyle(0xff6666);
closeButtonBg.setScale(1.05);
closeButtonText.setColor('#111111');
});
closeButtonBg.on('pointerout', () => {
closeButtonBg.setFillStyle(0xff4444);
closeButtonBg.setScale(1);
closeButtonText.setColor('#000000');
});


    // 5. Modal Open/Close Logic
    rulesButtonBg.on('pointerdown', () => {
        modalBlocker.setVisible(true);
        modalBg.setVisible(true);
        rulesText.setVisible(true);
        closeButtonBg.setVisible(true);
        closeButtonText.setVisible(true);
      });
      closeButtonBg.on('pointerdown', () => {
        modalBlocker.setVisible(false);
        modalBg.setVisible(false);
        rulesText.setVisible(false);
        closeButtonBg.setVisible(false);
        closeButtonText.setVisible(false);
      });
      
  }
}
