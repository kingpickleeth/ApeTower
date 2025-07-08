import { useEffect } from 'react';
import Phaser from 'phaser';
import GameConfig from '../game/GameConfig';
import WebFont from 'webfontloader';

let game: Phaser.Game | null = null;

const GameCanvas = () => {
  // 🎮 Load game with Orbitron font
  useEffect(() => {
    if (!game) {
      console.log('🔤 Loading Orbitron font...');
      WebFont.load({
        google: {
          families: ['Orbitron']
        },
        active: () => {
          console.log('✅ Font loaded, starting Phaser...');
          game = new Phaser.Game(GameConfig);
        },
        inactive: () => {
          console.warn('⚠️ Failed to load font, starting anyway...');
          game = new Phaser.Game(GameConfig);
        }
      });
    }

    return () => {
      game?.destroy(true);
      game = null;
    };
  }, []);

  // 🔄 Step 2: Add orientation check overlay logic here
  useEffect(() => {
    const checkPlayable = () => {
      const overlay = document.getElementById('rotate-overlay');
      const isPortrait = window.innerHeight > window.innerWidth;
      const isTooSmall = window.innerWidth < 768 
  
      const shouldShowOverlay = isPortrait || isTooSmall;
  
      if (overlay) {
        overlay.style.display = shouldShowOverlay ? 'flex' : 'none';
      }
    };
  
    checkPlayable();
    window.addEventListener('resize', checkPlayable);
    window.addEventListener('orientationchange', checkPlayable);
  
    return () => {
      window.removeEventListener('resize', checkPlayable);
      window.removeEventListener('orientationchange', checkPlayable);
    };
  }, []);
  

  return <div id="game-container" />;
};

export default GameCanvas;
