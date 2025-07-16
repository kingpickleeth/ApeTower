import { useEffect } from 'react';
import Phaser from 'phaser';
import GameConfig from '../game/GameConfig';
import WebFont from 'webfontloader';

let game: Phaser.Game | null = null;

const GameCanvas = ({ walletAddress }: { walletAddress: string }) => {
  useEffect(() => {
    const startGame = () => {
      console.log('🚀 Initializing Phaser...');
      game = new Phaser.Game(GameConfig);
    
      // Wait for scene manager to register scenes
      setTimeout(() => {
        const scenes = game?.scene?.keys;
if (scenes) {
  Object.entries(scenes).forEach(([key, scene]: [string, any]) => {
    if (scene) {
      scene.walletAddress = walletAddress;
      console.log(`🧠 ${key} attached with wallet: ${walletAddress}`);
    }
  });

  (window as any).mainScene = scenes['MainScene'];
}
 else {
          console.warn('⚠️ mainScene not found!');
        }
      }, 500);
    };
    
    if (!game) {
      console.log('🔤 Loading Orbitron font...');
      WebFont.load({
        google: { families: ['Orbitron'] },
        active: () => {
          console.log('✅ Font loaded');
          startGame();
        },
        inactive: () => {
          console.warn('⚠️ Failed to load font, starting anyway...');
          startGame();
        }
      });
    }

    return () => {
      game?.destroy(true);
      game = null;
    };
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      const isTooSmall = window.innerWidth < 500;
      const isPortrait = window.innerHeight > window.innerWidth;
      const overlay = document.getElementById('rotate-overlay');
      if (overlay) {
        overlay.classList.toggle('active', isPortrait || isTooSmall);
      }
    };
    window.addEventListener('upgrade-campaign', async (e: any) => {
      const wallet = (window as any).connectedWalletAddress;
      const targetLevel = e.detail.level;
      console.log(`🔁 Upgrade event received. Wallet: ${wallet}, Level: ${targetLevel}`);

      if (wallet && targetLevel) {
        const { upgradeCampaignLevel } = await import('../utils/profile');
        await upgradeCampaignLevel(wallet, targetLevel);
      }
    });
    
    window.addEventListener('resize', checkOrientation);
    checkOrientation();

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return <div id="game-container" />;
};

export default GameCanvas;
