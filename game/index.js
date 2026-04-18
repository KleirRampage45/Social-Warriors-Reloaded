import { initSaveManager, saveVillage, loadVillage, listAllVillages, generateUserId } from './storage/saveManager.js';
import { on, emit, clear } from './core/eventBus.js';
import { start, stop } from './core/gameLoop.js';
import { render } from './rendering/canvasRenderer.js';
import { init as initRenderer } from './rendering/canvasRenderer.js';
import { setCurrentSave, executeCommand } from './core/commandHandler.js';
import { createEmptySave, applyResources } from './core/engine.js';

let currentUserId = null;
let canvas = null;
let gameStarted = false;

async function init() {
    console.log('[Game] Initializing...');

    try {
        await initSaveManager();
        console.log('[Game] Save manager initialized');
    } catch (e) {
        console.error('[Game] Failed to initialize save manager:', e);
    }

    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[Game] Canvas not found');
        return;
    }

    initRenderer(canvas);

    setupEventHandlers();

    const saves = await listAllVillages();
    if (saves.length > 0) {
        currentUserId = saves[0].playerInfo.pid;
        await loadGame(currentUserId);
    } else {
        await newGame();
    }

    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }

    startGameLoop();
}

function setupEventHandlers() {
    on('save:modified', async (save) => {
        try {
            await saveVillage(save);
            updateResourceDisplay(save);
        } catch (e) {
            console.error('[Game] Auto-save failed:', e);
        }
    });

    on('map:click', (data) => {
        console.log('[Game] Map click:', data);
    });

    const menuButtons = {
        'btn-buildings': () => emit('ui:buildings'),
        'btn-units': () => emit('ui:units'),
        'btn-quests': () => emit('ui:quests'),
        'btn-storage': () => emit('ui:storage'),
        'btn-save': async () => {
            if (currentUserId) {
                const save = await loadVillage(currentUserId);
                if (save) {
                    await saveVillage(save);
                    showNotification('Game saved!');
                }
            }
        }
    };

    for (const [id, handler] of Object.entries(menuButtons)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    }
}

function startGameLoop() {
    if (gameStarted) return;
    gameStarted = true;

    start(
        (deltaTime) => {
            update(deltaTime);
        },
        () => {
            draw();
        },
        60
    );
}

function update(deltaTime) {
}

function draw() {
    if (!currentUserId) return;

    loadVillage(currentUserId).then(save => {
        if (save) {
            const map = save.maps?.[save.playerInfo?.default_map || 0];
            render(map);
        }
    });
}

async function newGame() {
    const userId = generateUserId();
    const save = createEmptySave(userId);

    try {
        await saveVillage(save);
        currentUserId = userId;
        setCurrentSave(save);
        updateResourceDisplay(save);
        console.log('[Game] Created new village:', userId);
    } catch (e) {
        console.error('[Game] Failed to create new game:', e);
    }
}

async function loadGame(userId) {
    try {
        const save = await loadVillage(userId);
        if (save) {
            currentUserId = userId;
            setCurrentSave(save);
            updateResourceDisplay(save);
            console.log('[Game] Loaded village:', userId);
        }
    } catch (e) {
        console.error('[Game] Failed to load game:', e);
    }
}

function updateResourceDisplay(save) {
    if (!save) return;

    const map = save.maps?.[0];
    const playerInfo = save.playerInfo;

    const elements = {
        'res-cash': playerInfo?.cash || 0,
        'res-gold': map?.gold || 0,
        'res-wood': map?.wood || 0,
        'res-oil': map?.oil || 0,
        'res-steel': map?.steel || 0
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }
    }
}

function showNotification(message) {
    const ui = document.getElementById('game-ui');
    if (!ui) return;

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #e94560;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: bold;
        animation: fadeInOut 2s ease-in-out;
    `;
    notification.textContent = message;

    ui.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { executeCommand };