import Phaser from 'phaser';
import MainScene from './MainScene';

const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1e1e1e',
  parent: 'game-container',
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

export default GameConfig;
