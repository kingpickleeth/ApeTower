import Phaser from 'phaser';
import MainScene from './MainScene';
import MainMenuScene from './MainMenuScene';
import CampaignMapScene from './CampaignMapScene';
import Level2 from './Level2';
import Level3 from './Level3'
import Level4 from './Level4'
import Level5 from './Level5'
import Level6 from './Level6'
import Level7 from './Level7'

const scale = window.devicePixelRatio || 1;

// Extend GameConfig to allow 'resolution'
interface HighResGameConfig extends Phaser.Types.Core.GameConfig {
  resolution?: number;
}

const GameConfig: HighResGameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1e1e1e',
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
  scene: [MainMenuScene, CampaignMapScene, MainScene, Level2, Level3, Level4, Level5, Level6, Level7],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
  
};

export default GameConfig;
