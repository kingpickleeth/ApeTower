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
    const title = this.add.text(centerX, centerY - 140, 'Deng Defense', {
        fontFamily: 'Outfit',
        fontSize: '84px',
        color: '#00B3FF',
        padding: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20
        }
      })
        .setOrigin(0.5)
        .setShadow(0, 0, '#00B3FF', 18, true, true) // 🔥 neon glow
        .setAlpha(0)
        .setDepth(999); // 🔝 Ensure it's rendered on top just in case
      
      this.tweens.add({
        targets: title,
        alpha: 1,
        duration: 600,
        ease: 'Power2',
      });
      

    // 2. 🟩 Start Game Button
    const buttonBg = this.add.rectangle(centerX, centerY + 20, 200, 60, 0x00B3FF, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x00B3FF)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const buttonText = this.add.text(centerX, centerY + 20, 'Start Game', {
      fontFamily: 'Outfit',
      fontSize: '28px',
      color: '#1A1F2B'
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
      scale: { from: 1, to: 1.04 },
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut'
    });

    // 🧠 Hover Effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x3CDFFF);
      buttonBg.setScale(1.05);
      buttonText.setColor('#1A1F2B');
    });
    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x007AC6) // 🔷 deep brand blue);
      buttonBg.setScale(1);
      buttonText.setColor('#1A1F2B');
    });

    buttonBg.on('pointerdown', () => {
      this.scene.start('MainScene');
    });

    // 3. 📜 Rules Button
 // 📜 Rules Button (now fully matches Start Game style)
// 📜 Rules Button
const rulesButtonBg = this.add.rectangle(centerX, centerY + 100, 200, 60, 0x00B3FF, 1)
  .setOrigin(0.5)
  .setStrokeStyle(2, 0x00B3FF)
  .setInteractive({ useHandCursor: true })
  .setAlpha(0); // <== important for fade in

const rulesButtonText = this.add.text(centerX, centerY + 100, 'The Rules', {
  fontFamily: 'Outfit',
  fontSize: '28px',
  color: '#1A1F2B',
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
rulesButtonBg.setFillStyle(0x3CDFFF);
rulesButtonBg.setScale(1.05);
rulesButtonText.setColor('#1A1F2B');
});
rulesButtonBg.on('pointerout', () => {
rulesButtonBg.setFillStyle(0x007AC6) // 🔷 deep brand blue);
rulesButtonBg.setScale(1);
rulesButtonText.setColor('#1A1F2B');
});
// 🔒 Interaction-blocking overlay (initially hidden)
const modalBlocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1A1F2B, 0)
  .setOrigin(0)
  .setInteractive()
  .setVisible(false);


    // 4. 🧾 Rules Modal (initially hidden)
    const modalBg = this.add.rectangle(centerX, centerY, 500, 300, 0x1A1F2B, .98)
      .setStrokeStyle(2, 0x00B3FF)
      .setOrigin(0.5).setDepth(1000)
      .setVisible(false);

    const rulesText = this.add.text(centerX, centerY, `Don't be a pussy. Get in there and get your hands dirty 😈`, {
      fontFamily: 'Outfit',
      fontSize: '16px',
      color: '#DFFBFF',
      align: 'center',
      wordWrap: { width: 460 }
    })
      .setOrigin(0.5).setDepth(1001)
      .setVisible(false);

    // ❌ Close Button (styled like Start Game & Rules)
    const closeButtonBg = this.add.rectangle(centerX, centerY + 110, 140, 44, 0xFF4F66, 1)
  .setOrigin(0.5).setDepth(1002)
  .setStrokeStyle(2, 0x00B3FF)
  .setInteractive({ useHandCursor: true })
  .setVisible(false);

const closeButtonText = this.add.text(centerX, centerY + 110, '🆇 Close', {
  fontFamily: 'Outfit',
  fontSize: '22px',
  color: '#1A1F2B' // bright red for visibility
}).setOrigin(0.5).setDepth(1002).setVisible(false);


// Hover Effects (same as other buttons)
closeButtonBg.on('pointerover', () => {
closeButtonBg.setFillStyle(0xFF6F80);
closeButtonBg.setScale(1.05);
closeButtonText.setColor('#1A1F2B');
});
closeButtonBg.on('pointerout', () => {
closeButtonBg.setFillStyle(0xFF4F66);
closeButtonBg.setScale(1);
closeButtonText.setColor('#1A1F2B');
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
      
      // ⛔ Disable input when profile modal is open
(window as any).disableMainMenuInput = () => {
  this.input.enabled = false;
};

// ✅ Re-enable it when modal is closed
(window as any).enableMainMenuInput = () => {
  this.input.enabled = true;
};

  }
}
