import { GameLoop } from './core/gameLoop.js';
import { EventBus } from './core/eventBus.js';
import { CommandHandler } from './core/commandHandler.js';
import { SaveManager } from './storage/saveManager.js';
import { ConfigLoader } from './data/configLoader.js';
import { Resources } from './systems/resources.js';
import { Buildings } from './systems/buildings.js';
import { CanvasRenderer } from './rendering/canvasRenderer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');

        this.eventBus = new EventBus();
        this.saveManager = new SaveManager();
        this.configLoader = new ConfigLoader(this.eventBus);
        this.resources = null;
        this.buildings = null;
        this.renderer = null;
        this.commandHandler = null;
        this.gameLoop = null;

        this.playerData = null;
        this.config = null;
    }

    async init() {
        try {
            this.updateLoading(10, 'Loading game config...');
            this.config = await this.configLoader.load();

            this.updateLoading(30, 'Initializing save system...');
            await this.saveManager.init();

            this.updateLoading(50, 'Loading player data...');
            this.playerData = await this.saveManager.loadPlayer('Neutral');

            this.updateLoading(70, 'Setting up systems...');
            this.resources = new Resources(this.playerData, this.eventBus);
            this.buildings = new Buildings(this.playerData, this.config, this.eventBus);

            this.updateLoading(85, 'Initializing renderer...');
            this.renderer = new CanvasRenderer(this.canvas, this.eventBus);
            this.commandHandler = new CommandHandler(
                this.playerData,
                this.config,
                this.resources,
                this.buildings,
                this.eventBus
            );

            this.updateLoading(90, 'Starting game loop...');
            this.gameLoop = new GameLoop(this.eventBus, this.renderer);

            this.updateLoading(100, 'Ready!');
            await this.delay(500);

            this.gameLoop.start();
            this.loadingScreen.classList.add('hidden');

            console.log('Social Warriors Reloaded initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.loadingText.textContent = `Error: ${error.message}`;
        }
    }

    updateLoading(percent, text) {
        this.loadingBar.style.width = `${percent}%`;
        this.loadingText.textContent = text;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const game = new Game();
window.addEventListener('load', () => game.init());
window.game = game;