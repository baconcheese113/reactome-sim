import Phaser from 'phaser';
import { CellManagementGame } from './scenes/CellManagementGame';

// Game configuration optimized for Reactome Sim
const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 600,
    },
    max: {
      width: 1920,
      height: 1080,
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // No gravity for molecular simulation
      debug: false,
    },
  },
  scene: [CellManagementGame], // Start directly with CellManagementGame
  callbacks: {
    postBoot: () => {
      // Hide loading screen once game is ready
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
    },
  },
};

// Initialize the game
const game = new Phaser.Game(gameConfig);

// Export for debugging - properly typed window extension
declare global {
  interface Window {
    game: Phaser.Game;
  }
}

window.game = game;

export default game;