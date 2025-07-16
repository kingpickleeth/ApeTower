// src/game/CampaignMapScene.ts
import Phaser from 'phaser';
import { getProfile } from '../utils/profile';
const LEVEL_SCENES: Record<number, string> = {
    1: 'MainScene',
    2: 'Level2',
    3: 'Level3',
    4: 'Level4',
    5: 'Level5',
    6: 'Level6',
    7: 'Level7',
  };
  
export default class CampaignMapScene extends Phaser.Scene {
  campaignLevel: number = 1;
  wallet: string = '';

  constructor() {
    super('CampaignMapScene');
  }

  create(data: { wallet: string }) {
    this.wallet = data.wallet;
    this.loadProfileAndRender();
  }
  
  async loadProfileAndRender() {
    const cx = this.cameras.main.centerX;
  
    // 🔄 Wait until wallet is connected
    const wallet = this.wallet;
    console.log('📩 Wallet passed to campaign scene:', wallet);
    
    if (wallet) {
      try {
        const profile = await getProfile(wallet);
        console.log('👤 Profile response:', profile);
    
        this.campaignLevel = Number(profile?.campaign_level ?? 1);
        console.log('📊 Campaign level from Supabase:', this.campaignLevel);
      } catch (e) {
        console.error('❌ Failed to fetch profile:', e);
      }
    } else {
      console.warn('⚠️ No wallet passed into CampaignMapScene');
    }
    
    this.add.text(cx, 60, '📍 Select Your Mission', {
      fontSize: '32px',
      fontFamily: 'Outfit',
      color: '#00B3FF'
    }).setOrigin(0.5);

    const startY = 140;
    const gapY = 55;

    for (let i = 1; i <= 7; i++) {
      const isUnlocked = i <= this.campaignLevel;
      const y = startY + (i - 1) * gapY;

      const bg = this.add.rectangle(cx, y, 220, 44, isUnlocked ? 0x00B3FF : 0x444444)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .setAlpha(1);

    this.add.text(cx, y, `Level ${i}`, {
        fontFamily: 'Outfit',
        fontSize: '22px',
        color: isUnlocked ? '#1A1F2B' : '#999'
      }).setOrigin(0.5);

      if (isUnlocked) {
        bg.on('pointerdown', () => {
          console.log(`🟢 Starting level ${i}`);
          const sceneName = LEVEL_SCENES[i] || 'MainScene';
this.scene.start(sceneName, { level: i });

        });

        bg.on('pointerover', () => bg.setFillStyle(0x3CDFFF));
        bg.on('pointerout', () => bg.setFillStyle(0x00B3FF));
      }
    }

    const backBtn = this.add.text(cx, 550, '← Back to Menu', {
      fontSize: '18px',
      fontFamily: 'Outfit',
      color: '#DFFBFF'
    }).setOrigin(0.5).setInteractive();

    backBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }
}
