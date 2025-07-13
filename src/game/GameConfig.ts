import Phaser from 'phaser';
import MainScene from './MainScene';
import MainMenuScene from './MainMenuScene';

const scale = window.devicePixelRatio || 1;

// Extend GameConfig to allow 'resolution'
interface HighResGameConfig extends Phaser.Types.Core.GameConfig {
  resolution?: number;
}

const GameConfig: HighResGameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1A1F2B',
  parent: 'game-container',
  resolution: scale, // 👈 this makes your canvas crisp!
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  scene: [MainMenuScene, MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
  
};

export default GameConfig;
