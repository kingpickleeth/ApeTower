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
    const checkOrientation = () => {
      const isTooSmall = window.innerWidth < 500; // 🟡 Adjust breakpoint as needed
      const isPortrait = window.innerHeight > window.innerWidth;
      const overlay = document.getElementById('rotate-overlay');
    
      if (overlay) {
        overlay.classList.toggle('active', isPortrait || isTooSmall);
      }
    };
    

    window.addEventListener('resize', checkOrientation);
    checkOrientation(); // initial check

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return <div id="game-container" />;
};

export default GameCanvas;
