import { useEffect } from 'react';
import Phaser from 'phaser';
import GameConfig from '../game/GameConfig';
import WebFont from 'webfontloader';

let game: Phaser.Game | null = null;

const GameCanvas = () => {
  useEffect(() => {
    const startGame = () => {
      console.log('🚀 Initializing Phaser...');
      game = new Phaser.Game(GameConfig);

      // Wait a tick for scene manager to register scenes
      setTimeout(() => {
        const mainScene = game?.scene.keys['MainScene']; // 👈 Match your scene key
        if (mainScene) {
          (window as any).mainScene = mainScene;
          console.log('🧠 mainScene attached to window.mainScene');
        } else {
          console.warn('⚠️ mainScene not found!');
        }
      }, 500); // Give Phaser time to register scenes
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

    window.addEventListener('resize', checkOrientation);
    checkOrientation();

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return <div id="game-container" />;
};

export default GameCanvas;
