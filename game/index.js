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

            this.eventBus.emit('map:loaded', this.playerData.maps?.[0]);

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

            this._setupAutoSave();
            this._setupInputHandlers();

            console.log('Social Warriors Reloaded initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.loadingText.textContent = `Error: ${error.message}`;
        }
    }

    _setupAutoSave() {
        let saveTimeout = null;

        const scheduleSave = () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    await this.saveManager.savePlayer(this.playerData);
                    console.log('[Game] Auto-saved');
                } catch (e) {
                    console.error('[Game] Auto-save failed:', e);
                }
            }, 2000);
        };

        this.eventBus.on('building:added', scheduleSave);
        this.eventBus.on('building:removed', scheduleSave);
        this.eventBus.on('building:updated', scheduleSave);
        this.eventBus.on('resources:changed', scheduleSave);
    }

    _setupInputHandlers() {
        this.eventBus.on('render:click', async (data) => {
            if (!data?.grid) return;

            const { x, y } = data.grid;
            console.log(`[Game] Clicked at tile: ${x}, ${y}`);

            const existingBuilding = this.buildings.getByLocation(x, y);
            if (existingBuilding) {
                console.log(`[Game] Building at ${x},${y}:`, existingBuilding.itemId);
            }
        });

        this.eventBus.on('render:mousemove', (data) => {
        });
    }

    updateLoading(percent, text) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${percent}%`;
        }
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const game = new Game();
window.addEventListener('load', () => game.init());
window.game = game;