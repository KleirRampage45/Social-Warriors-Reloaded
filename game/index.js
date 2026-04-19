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
        this.selectedItem = null;
        this.selectedItemId = null;
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
            this._setupShopUI();
            this._renderBuildingShop();
            this._updateResourceDisplay();

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
        this.eventBus.on('resources:changed', () => {
            this._updateResourceDisplay();
            scheduleSave();
        });
    }

    _setupInputHandlers() {
        this.eventBus.on('render:click', async (data) => {
            if (!data?.grid) return;

            const { x, y } = data.grid;
            console.log(`[Game] Clicked at tile: ${x}, ${y}`);

            const existingBuilding = this.buildings.getByLocation(x, y);
            if (existingBuilding) {
                console.log(`[Game] Building at ${x},${y}:`, existingBuilding.itemId);
                return;
            }

            if (this.selectedItem && this.selectedItemId) {
                await this._placeBuilding(x, y);
            }
        });

        this.eventBus.on('render:mousemove', (data) => {
        });
    }

    _setupShopUI() {
        const btnBuildings = document.getElementById('btn-buildings');
        const btnUnits = document.getElementById('btn-units');
        const btnQuests = document.getElementById('btn-quests');
        const btnStorage = document.getElementById('btn-storage');
        const btnSave = document.getElementById('btn-save');

        const closeBuildings = document.getElementById('close-buildings');
        const closeUnits = document.getElementById('close-units');
        const closeQuests = document.getElementById('close-quests');
        const closeStorage = document.getElementById('close-storage');

        const shopBuilding = document.getElementById('building-shop');
        const shopUnit = document.getElementById('unit-shop');
        const panelQuest = document.getElementById('quest-panel');
        const panelStorage = document.getElementById('storage-panel');

        const closeShop = (shop) => shop.classList.remove('open');
        const openShop = (shop) => {
            closeShop(shopBuilding);
            closeShop(shopUnit);
            closeShop(panelQuest);
            closeShop(panelStorage);
            shop.classList.add('open');
        };

        btnBuildings?.addEventListener('click', () => openShop(shopBuilding));
        btnUnits?.addEventListener('click', () => openShop(shopUnit));
        btnQuests?.addEventListener('click', () => openShop(panelQuest));
        btnStorage?.addEventListener('click', () => openShop(panelStorage));
        btnSave?.addEventListener('click', async () => {
            await this.saveManager.savePlayer(this.playerData);
            console.log('[Game] Saved manually');
        });

        closeBuildings?.addEventListener('click', () => closeShop(shopBuilding));
        closeUnits?.addEventListener('click', () => closeShop(shopUnit));
        closeQuests?.addEventListener('click', () => closeShop(panelQuest));
        closeStorage?.addEventListener('click', () => closeShop(panelStorage));
    }

    _renderBuildingShop() {
        const listContainer = document.getElementById('building-list');
        if (!listContainer) return;

        const config = this.config;
        if (!config?.items) return;

        const categories = {};
        for (const [id, item] of config.items) {
            if (item.type !== 'b') continue;

            const cat = item.category || 'Other';
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push({ id, ...item });
        }

        let html = '';
        for (const [catName, items] of Object.entries(categories)) {
            html += `<div class="shop-category"><div class="category-name">${catName}</div>`;
            for (const item of items.slice(0, 20)) {
                const cost = item.cost || {};
                const costStr = this._formatCost(cost);
                const canAfford = this.resources.canAfford(cost);

                html += `
                    <div class="shop-item ${canAfford ? '' : 'disabled'}" data-item-id="${item.id}">
                        <div class="shop-item-icon">${item.name?.substring(0, 6) || item.id}</div>
                        <div class="shop-item-info">
                            <div class="shop-item-name">${item.name || item.id}</div>
                            <div class="shop-item-cost">${costStr}</div>
                        </div>
                    </div>
                `;
            }
            html += '</div>';
        }

        listContainer.innerHTML = html;

        listContainer.querySelectorAll('.shop-item:not(.disabled)').forEach(el => {
            el.addEventListener('click', () => {
                const itemId = el.dataset.itemId;
                this._selectBuilding(itemId);
            });
        });
    }

    _selectBuilding(itemId) {
        const item = this.config.items.get(itemId);
        if (!item) return;

        this.selectedItem = item;
        this.selectedItemId = itemId;

        document.querySelectorAll('.shop-item').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelector(`[data-item-id="${itemId}"]`)?.classList.add('selected');

        console.log(`[Game] Selected building: ${item.name} (${itemId})`);
    }

    async _placeBuilding(x, y) {
        if (!this.selectedItem || !this.selectedItemId) return;

        const item = this.selectedItem;
        const cost = item.cost || {};

        if (!this.resources.canAfford(cost)) {
            console.log('[Game] Cannot afford building');
            return;
        }

        try {
            const result = this.commandHandler.execute([
                0,
                'buy',
                [0, this.selectedItemId, x, y, 'Neutral', 0, 0, 'place'],
                true
            ]);

            if (result.success) {
                console.log(`[Game] Placed building ${item.name} at ${x},${y}`);
                this._updateResourceDisplay();
            } else {
                console.log('[Game] Failed to place building:', result.error);
            }
        } catch (e) {
            console.error('[Game] Error placing building:', e);
        }
    }

    _updateResourceDisplay() {
        const resources = this.resources?.getAll() || { gold: 0, wood: 0, oil: 0, steel: 0 };

        const elements = {
            'res-gold': resources.gold,
            'res-wood': resources.wood,
            'res-oil': resources.oil,
            'res-steel': resources.steel,
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        }
    }

    _formatCost(cost) {
        const parts = [];
        if (cost.gold) parts.push(`${cost.gold}G`);
        if (cost.wood) parts.push(`${cost.wood}W`);
        if (cost.oil) parts.push(`${cost.oil}O`);
        if (cost.steel) parts.push(`${cost.steel}S`);
        return parts.length > 0 ? parts.join(' ') : 'Free';
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