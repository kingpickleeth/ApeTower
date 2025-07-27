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
    let redirectToCampaign = false;

    if ((window as any).ethereum) {
        (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            (window as any).connectedWalletAddress = accounts[0];
            console.log('🔄 Wallet changed to:', accounts[0]);
          } else {
            // User fully disconnected their wallet
            (window as any).connectedWalletAddress = null;
          }
        });
      }
      (window as any).ethereum.on('chainChanged', (chainId: string) => {
        console.log('🌐 Chain changed to:', chainId);
        window.location.reload(); // 🔁 safest fallback to reset app state
      });
      
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
      // 🧭 Campaign Button (updated with smooth tween hover)
const campaignButtonBg = this.add.rectangle(centerX, centerY + 20, 200, 60, 0x00B3FF, 1)
.setOrigin(0.5)
.setStrokeStyle(2, 0x00B3FF)
.setInteractive({ useHandCursor: true })
.setAlpha(0)
.setScale(1);

const campaignButtonText = this.add.text(centerX, centerY + 20, 'Campaign', {
fontFamily: 'Outfit',
fontSize: '28px',
color: '#1A1F2B'
}).setOrigin(0.5).setAlpha(0);

// Fade in
this.tweens.add({
targets: [campaignButtonBg, campaignButtonText],
alpha: 1,
duration: 500,
ease: 'Power2',
delay: 400,
});

// Hover effects
campaignButtonBg.on('pointerover', () => {
campaignButtonBg.setFillStyle(0x3CDFFF);
this.tweens.add({
  targets: campaignButtonBg,
  scale: 1.05,
  duration: 150,
  ease: 'Power2'
});
});
campaignButtonBg.on('pointerout', () => {
campaignButtonBg.setFillStyle(0x007AC6);
this.tweens.add({
  targets: campaignButtonBg,
  scale: 1,
  duration: 150,
  ease: 'Power2'
});
});

// Click behavior
campaignButtonBg.on('pointerdown', async () => {
let wallet = (window as any).connectedWalletAddress;

if (!wallet && (window as any).ethereum) {
  const provider = new BrowserProvider((window as any).ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  wallet = accounts[0];
  (window as any).connectedWalletAddress = accounts[0];
}

if (!wallet) {
  console.warn('⚠️ Still no wallet after request');
  return;
}

const ownsDeng = await this.hasDeng(wallet);

if (!ownsDeng) {
  showSupportPopup(true);
} else {
  console.log('🎯 Launching CampaignMapScene with wallet:', wallet);
  this.scene.start('CampaignMapScene', { wallet });
}
});// 📜 Rules Button (updated with smooth tween hover)
const rulesButtonBg = this.add.rectangle(centerX, centerY + 100, 200, 60, 0x00B3FF, 1)
  .setOrigin(0.5)
  .setStrokeStyle(2, 0x00B3FF)
  .setInteractive({ useHandCursor: true })
  .setAlpha(0)
  .setScale(1);

const rulesButtonText = this.add.text(centerX, centerY + 100, 'The Rules', {
  fontFamily: 'Outfit',
  fontSize: '28px',
  color: '#1A1F2B',
  resolution: 2
}).setOrigin(0.5).setAlpha(0);

// Fade in
this.tweens.add({
  targets: [rulesButtonBg, rulesButtonText],
  alpha: 1,
  duration: 500,
  ease: 'Power2',
  delay: 300
});

// Hover effects
rulesButtonBg.on('pointerover', () => {
  rulesButtonBg.setFillStyle(0x3CDFFF);
  this.tweens.add({
    targets: rulesButtonBg,
    scale: 1.05,
    duration: 150,
    ease: 'Power2'
  });
});
rulesButtonBg.on('pointerout', () => {
  rulesButtonBg.setFillStyle(0x007AC6);
  this.tweens.add({
    targets: rulesButtonBg,
    scale: 1,
    duration: 150,
    ease: 'Power2'
  });
});

// Click to show rules modal
rulesButtonBg.on('pointerdown', () => {
  modalBlocker.setVisible(true);
  modalBg.setVisible(true);
  rulesText.setVisible(true);
  rulesTitle.setVisible(true);
  closeButtonBg.setVisible(true);
  closeButtonText.setVisible(true);
});

// 🔒 Interaction-blocking overlay (initially hidden)
const modalBlocker = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1A1F2B, 0)
  .setOrigin(0)
  .setInteractive()
  .setVisible(false);


    // 4. 🧾 Rules Modal (initially hidden)
    const modalBg = this.add.rectangle(centerX, centerY, 500, 600, 0x1A1F2B, .98)
      .setStrokeStyle(2, 0x00B3FF)
      .setOrigin(0.5).setDepth(1000)
      .setVisible(false);
      const rulesTitle = this.add.text(centerX, centerY - 265, '📜 How to Play Deng Defense 📜', {
        fontFamily: 'Outfit',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#DFFBFF',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(1001)
      .setVisible(false);
      
      const rulesText = this.add.text(centerX, centerY, 
        `1. Defend The Motherland!\nThe Smoove Brains are trying to sneak by you and destory DengLand. Your mission is to stop them before they reach the end!\n\n` +
        `2. Build & Upgrade Towers\nYou are't helpless. Click green tiles to build different towers. Then click on those towers to upgrade their strength/range.\n\n` +
        `3. Earn $MOO\nDestroy enemies to earn $MOO and spend it to build/upgrade. Whatever $MOO you end the round with, gets added to your profile\n\n` +
        `4. Enemies Get Tougher\nEnemies get faster and tankier with each wave. Each level has more and more waves. You must survive all waves.\n\n` +
        `5. You Have 10 Lives ❤️\nEach escaped enemy costs 1 life. Lose all = Game Over.\n\n` +
        `6. Claim Glory\nYou can go to your profile to claim your $MOO anytime you'd like. This sends it to your wallet automatically (onchain)`,
        {
          fontFamily: 'Outfit',
          fontSize: '16px',
          color: '#DFFBFF',
          align: 'left',
          wordWrap: { width: 460 }
        }
      )
      .setOrigin(0.5)
      .setDepth(1001)
      .setVisible(false);
      
    // ❌ Close Button on Rules Modal (styled like Start Game & Rules)
  // ❌ Close Button (styled to match red theme with animation)
const closeButtonBg = this.add.rectangle(centerX, centerY + 260, 140, 44, 0xB30000, 1)
.setOrigin(0.5)
.setStrokeStyle(2, 0xffffff)
.setInteractive({ useHandCursor: true })
.setDepth(1002)
.setScale(1)
.setVisible(false);

const closeButtonText = this.add.text(centerX, centerY + 260, '🆇 Close', {
fontFamily: 'Outfit',
fontSize: '20px',
color: '#ffffff'
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
const noThanksButton = this.add.rectangle(centerX, centerY + 120, 200, 44, 0xB30000, 1)
  .setOrigin(0.5).setStrokeStyle(2, 0xffffff)
  .setInteractive({ useHandCursor: true }).setDepth(1101).setVisible(false);
const noThanksText = this.add.text(centerX, centerY + 120, "Nah, I wanna play now", {
  fontFamily: 'Outfit',
  fontSize: '18px',
  color: '#ffffff'
}).setOrigin(0.5).setDepth(1101).setVisible(false);
noThanksButton.on('pointerdown', () => {
    hideSupportPopup();
    const wallet = (window as any).connectedWalletAddress;
    if (redirectToCampaign) {
      this.scene.start('CampaignMapScene', { wallet });
    } else {
      this.scene.start('MainScene', { wallet });
    }
  });
  
noThanksButton.on('pointerover', () => {
  noThanksButton.setFillStyle(0xFF4D4D)
    this.tweens.add({
      targets: noThanksButton,
      scale: 1.05,
      duration: 150,
      ease: 'Power2'
    });
  });
  noThanksButton.on('pointerout', () => {
    noThanksButton.setFillStyle(0xB30000)
  this.tweens.add({
    targets: noThanksButton,
    scale: 1,
    duration: 150,
    ease: 'Power2'
  });
});
  
// Hover Effects (same as other buttons)// 🎯 Hover effects for red rules modal close button
closeButtonBg.on('pointerover', () => {
  closeButtonBg.setFillStyle(0xFF4D4D);
  this.tweens.add({
    targets: closeButtonBg,
    scale: 1.05,
    duration: 150,
    ease: 'Power2'
  });
});
closeButtonBg.on('pointerout', () => {
  closeButtonBg.setFillStyle(0xB30000);
  this.tweens.add({
    targets: closeButtonBg,
    scale: 1,
    duration: 150,
    ease: 'Power2'
  });
});



    // 5. Modal Open/Close Logic
    rulesButtonBg.on('pointerdown', () => {
        modalBlocker.setVisible(true);
        modalBg.setVisible(true);
        rulesText.setVisible(true);
        rulesTitle.setVisible(true);
        closeButtonBg.setVisible(true);
        closeButtonText.setVisible(true);
      });
      closeButtonBg.on('pointerdown', () => {
        modalBlocker.setVisible(false);
        modalBg.setVisible(false);
        rulesText.setVisible(false);
        rulesTitle.setVisible(false);
        closeButtonBg.setVisible(false);
        closeButtonText.setVisible(false);
      });
        const showSupportPopup = (campaign = false) => {
        redirectToCampaign = campaign; // ✅ this line resolves the warning
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
