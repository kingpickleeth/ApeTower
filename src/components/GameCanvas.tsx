import { useEffect } from 'react';
import Phaser from 'phaser';
import GameConfig from '../game/GameConfig';
import WebFont from 'webfontloader';

let game: Phaser.Game | null = null;

const GameCanvas = () => {
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

  return (
    <div id="game-container" />
  );
};

export default GameCanvas;
