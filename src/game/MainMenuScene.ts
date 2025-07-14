// src/game/MainMenuScene.ts
import Phaser from 'phaser';
import { BrowserProvider, Contract, parseEther } from 'ethers';


export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }
  async hasDeng(wallet: string): Promise<boolean> {
    const DENG_CONTRACT = '0x2cf92fe634909a9cf5e41291f54e5784d234cf8d';
    const DENG_ABI = ['function balanceOf(address) view returns (uint256)'];
    const provider = new BrowserProvider((window as any).ethereum);
    const contract = new Contract(DENG_CONTRACT, DENG_ABI, provider);
    const balance = await contract.balanceOf(wallet);
    return Number(balance) > 0;
  }
  
  create() {
    const centerX = Math.round(this.cameras.main.centerX);
    const centerY = Math.round(this.cameras.main.centerY);
    const trySetupWalletListeners = () => {
        const eth = (window as any).ethereum;
        if (!eth) return;
      
        if (!eth._hasSetupDengListeners) {
          eth._hasSetupDengListeners = true; // Prevent double-adding
      
          eth.on('accountsChanged', (accounts: string[]) => {
            (window as any).connectedWalletAddress = accounts[0] || null;
            console.log('🔄 Wallet changed to:', accounts[0]);
          });
      
          eth.on('chainChanged', (chainId: string) => {
            console.log('🌐 Chain changed to:', chainId);
            window.location.reload();
          });
      
          // If already connected, set it
          eth.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
            if (accounts.length > 0) {
              (window as any).connectedWalletAddress = accounts[0];
              console.log('✅ Wallet pre-connected:', accounts[0]);
            }
          }).catch(console.error);
        }
      };
      
      // 👀 Re-attempt setup until Ethereum is injected
      const walletCheckInterval = setInterval(() => {
        if ((window as any).ethereum) {
          trySetupWalletListeners();
          clearInterval(walletCheckInterval); // ✅ done
        }
      }, 300); // Poll every 300ms until found
      
      
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
    buttonBg.on('pointerdown', async () => {
        let wallet = (window as any).connectedWalletAddress;
      
        // ⛔ If wallet is undefined, request connection
        if (!wallet && (window as any).ethereum) {
          const provider = new BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_requestAccounts', []);
          wallet = accounts[0];
          (window as any).connectedWalletAddress = wallet; // store for later use
        }
      
        if (!wallet) {
          console.warn('No wallet connected');
          return;
        }
      
        const ownsDeng = await this.hasDeng(wallet);
      
        if (!ownsDeng) {
          showSupportPopup();
        } else {
          this.scene.start('MainScene');
        }
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

const supportModal = this.add.rectangle(centerX, centerY, 520, 360, 0x1A1F2B, 0.96)
  .setStrokeStyle(2, 0x00B3FF)
  .setOrigin(0.5).setDepth(1100).setVisible(false);

const supportText = this.add.text(centerX, centerY - 145,
  "Hey, we noticed you don't have a Deng in your wallet.\nThat’s TOTALLY fine, but support would mean the world 💙",
  {
    fontFamily: 'Outfit',
    fontSize: '16px',
    color: '#DFFBFF',
    align: 'center',
    wordWrap: { width: 480 }
  }).setOrigin(0.5).setDepth(1101).setVisible(false);

// 🌐 Magic Eden Button
const magicButton = this.add.rectangle(centerX, centerY - 90, 200, 44, 0x00B3FF, 1)
  .setOrigin(0.5).setStrokeStyle(2, 0xffffff)
  .setInteractive({ useHandCursor: true }).setDepth(1101).setVisible(false);
const magicButtonText = this.add.text(centerX, centerY - 90, '🛒 Buy a Deng', {
  fontFamily: 'Outfit',
  fontSize: '18px',
  color: '#1A1F2B'
}).setOrigin(0.5).setDepth(1101).setVisible(false);

magicButton.on('pointerdown', () => {
  window.open('https://magiceden.us/collections/apechain/0x2cf92fe634909a9cf5e41291f54e5784d234cf8d', '_blank');
});magicButton.on('pointerover', () => {
    this.tweens.add({
      targets: magicButton,
      scale: 1.05,
      duration: 150,
      ease: 'Power2'
    });
  });
  
  magicButton.on('pointerout', () => {
    this.tweens.add({
      targets: magicButton,
      scale: 1,
      duration: 150,
      ease: 'Power2'
    });
  });
  
  
const orText = this.add.text(centerX, centerY - 40,
    "OR",
    {
      fontFamily: 'Outfit',
      fontSize: '20px',
      color: '#DFFBFF',
      align: 'center',
      wordWrap: { width: 480 }
    }).setOrigin(0.5).setDepth(1101).setVisible(false);

// 💸 Tip Buttons
// 💸 Tip Buttons (1, 5, 20 APE)
const tipOptions = [1, 5, 20];
let selectedTipAmount = 5;
const buttonWidth = 60;
const tipButtonWidth = 80;
const gap = 12;

const totalTipRowWidth = tipOptions.length * buttonWidth + (tipOptions.length - 1) * gap + gap + tipButtonWidth;
const rowStartX = centerX - totalTipRowWidth / 2;

const tipButtons: Phaser.GameObjects.Rectangle[] = [];
const tipTexts: Phaser.GameObjects.Text[] = [];

tipOptions.forEach((amount, index) => {
  const btnX = rowStartX + index * (buttonWidth + gap);
  const btnY = centerY + 10;

  const btn = this.add.rectangle(btnX + 10, btnY, buttonWidth, 36, 0x1A1F2B)
    .setStrokeStyle(2, amount === selectedTipAmount ? 0x00B3FF : 0x333333)
    .setInteractive({ useHandCursor: true })
    .setDepth(1101)
    .setVisible(false);

  const txt = this.add.text(btnX + 10, btnY, `${amount} APE`, {
    fontFamily: 'Outfit',
    fontSize: '16px',
    color: '#DFFBFF'
  }).setOrigin(0.5).setDepth(1101).setVisible(false);

  btn.on('pointerdown', () => {
    selectedTipAmount = amount;
    tipButtons.forEach((b, i) => {
      const isSelected = tipOptions[i] === selectedTipAmount;
      b.setStrokeStyle(2, isSelected ? 0x00B3FF : 0x333333);
      b.setAlpha(isSelected ? 1 : 0.9);
    });
  });

  btn.on('pointerover', () => btn.setFillStyle(0x2a2f3c));
  btn.on('pointerout', () => btn.setFillStyle(0x1A1F2B));

  tipButtons.push(btn);
  tipTexts.push(txt);
});


// 💰 Tip Send Button
const tipButtonX = rowStartX + tipOptions.length * (buttonWidth + gap);
const tipButton = this.add.rectangle(tipButtonX + 35, centerY + 10, tipButtonWidth +20, 36, 0x00B3FF)
  .setOrigin(0.5)
  .setStrokeStyle(2, 0xffffff)
  .setInteractive({ useHandCursor: true })
  .setDepth(1101)
  .setVisible(false);

const tipButtonText = this.add.text(tipButtonX +35, centerY + 10, 'Tip 💰', {
  fontFamily: 'Outfit',
  fontSize: '16px',
  color: '#1A1F2B'
}).setOrigin(0.5).setDepth(1101).setVisible(false);

this.tweens.add({
    targets: tipButton,
    scale: { from: 1, to: 1.05 },
    yoyo: true,
    repeat: -1,
    duration: 1000,
    ease: 'Sine.easeInOut'
  });
  
// 🧠 Send $APE transaction on click
tipButton.on('pointerdown', async () => {
  try {
    if (!selectedTipAmount || isNaN(selectedTipAmount)) return;

    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    await signer.sendTransaction({
      to: '0x1ce0982849f847abD410e387843F61C00eeD14c0',
      value: parseEther(selectedTipAmount.toString())
    });

    hideSupportPopup();
    this.scene.start('MainScene');

  } catch (err) {
    console.error('❌ Tip transaction failed:', err);
    alert('Transaction failed or rejected.');
  }
});
const or2Text = this.add.text(centerX, centerY + 60,
    "OR",
    {
      fontFamily: 'Outfit',
      fontSize: '20px',
      color: '#DFFBFF',
      align: 'center',
      wordWrap: { width: 480 }
    }).setOrigin(0.5).setDepth(1101).setVisible(false);
// 🤪 Funny Close Button
const noThanksButton = this.add.rectangle(centerX, centerY + 120, 200, 44, 0xFF4F66, 1)
  .setOrigin(0.5).setStrokeStyle(2, 0xB0304A)
  .setInteractive({ useHandCursor: true }).setDepth(1101).setVisible(false);
const noThanksText = this.add.text(centerX, centerY + 120, "Nah, I don't do that", {
  fontFamily: 'Outfit',
  fontSize: '18px',
  color: '#1A1F2B'
}).setOrigin(0.5).setDepth(1101).setVisible(false);

noThanksButton.on('pointerdown', () => {
  hideSupportPopup();
  this.scene.start('MainScene');
});
noThanksButton.on('pointerover', () => {
    this.tweens.add({
      targets: noThanksButton,
      scale: 1.05,
      duration: 150,
      ease: 'Power2'
    });
  });
  noThanksButton.on('pointerout', () => {
  this.tweens.add({
    targets: noThanksButton,
    scale: 1,
    duration: 150,
    ease: 'Power2'
  });
});
  
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
      });const showSupportPopup = () => {
        modalBlocker.setVisible(true);
        supportModal.setVisible(true);
        supportText.setVisible(true);
        orText.setVisible(true);
        or2Text.setVisible(true);
        magicButton.setVisible(true);
        magicButtonText.setVisible(true);
        tipButton.setVisible(true);
        tipButtonText.setVisible(true);
        noThanksButton.setVisible(true);
        noThanksText.setVisible(true);
        tipButtons.forEach((b, i) => {
          b.setVisible(true);
          b.setStrokeStyle(2, tipOptions[i] === selectedTipAmount ? 0x00B3FF : 0x333333);
        });
        tipTexts.forEach(t => t.setVisible(true));
      };
      
      const hideSupportPopup = () => {
        modalBlocker.setVisible(false);
        supportModal.setVisible(false);
        supportText.setVisible(false);
        orText.setVisible(false);
        or2Text.setVisible(false);
        magicButton.setVisible(false);
        magicButtonText.setVisible(false);
        tipButton.setVisible(false);
        tipButtonText.setVisible(false);
        noThanksButton.setVisible(false);
        noThanksText.setVisible(false);
        tipButtons.forEach(b => b.setVisible(false));
        tipTexts.forEach(t => t.setVisible(false));
      };
      
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
