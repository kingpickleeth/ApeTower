import { useEffect } from 'react';
import Phaser from 'phaser';
import GameConfig from '../game/GameConfig';

let game: Phaser.Game | null = null;

const GameCanvas = () => {
  useEffect(() => {
    if (!game) {
      console.log('🌀 Initializing Phaser...');
      game = new Phaser.Game(GameConfig);
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
