import { emit } from './eventBus.js';

const TILE_SIZE = 64;
const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;

export function timestampNow() {
    return Math.floor(Date.now() / 1000);
}

export function mapAddItem(map, index, item, x, y, orientation = 0, timestamp = null, attr = null, store = null, player = 1) {
    if (!attr) attr = {};
    if (!store) store = [];
    if (!timestamp) timestamp = timestampNow();

    if (!map.items) map.items = {};
    map.items[str(index)] = [item, x, y, timestamp, orientation, store, attr, player];
}

export function mapAddItemFromItem(map, index, item) {
    if (!map.items) map.items = {};
    map.items[str(index)] = item;
}

export function mapGetItem(map, index) {
    if (!map.items) return null;
    return map.items[str(index)] || null;
}

export function mapPopItem(map, index) {
    if (!map.items) return null;
    const key = str(index);
    const item = map.items[key];
    if (item) {
        delete map.items[key];
    }
    return item || null;
}

export function mapDeleteItem(map, index) {
    if (!map.items) return false;
    const key = str(index);
    if (map.items[key]) {
        delete map.items[key];
        return true;
    }
    return false;
}

export function pushUnit(unit, building) {
    if (!building[5]) building[5] = [];
    building[5].push(unit);
    building[3] = timestampNow();
}

export function popUnit(building, itemId) {
    if (!building[5]) return null;
    for (let i = 0; i < building[5].length; i++) {
        if (building[5][i][0] === itemId) {
            return building[5].splice(i, 1)[0];
        }
    }
    return null;
}

export function addStoreItem(map, item, quantity = 1) {
    if (!map.store) map.store = {};
    const key = str(item);
    map.store[key] = (map.store[key] || 0) + quantity;
}

export function removeStoreItem(map, item, quantity = 1) {
    if (!map.store) return;
    const key = str(item);
    const remaining = (map.store[key] || 0) - quantity;
    if (remaining <= 0) {
        delete map.store[key];
    } else {
        map.store[key] = remaining;
    }
}

export function applyResources(save, map, resource) {
    if (!resource || resource.length < 8) return;

    const [unknown, xp, gold, wood, oil, steel, cash, mana] = resource;

    map.xp = Math.max(0, (map.xp || 0) + xp);
    map.gold = Math.max(0, (map.gold || 0) + gold);
    map.wood = Math.max(0, (map.wood || 0) + wood);
    map.oil = Math.max(0, (map.oil || 0) + oil);
    map.steel = Math.max(0, (map.steel || 0) + steel);

    if (save?.playerInfo) {
        save.playerInfo.cash = Math.max(0, (save.playerInfo.cash || 0) + cash);
    }

    if (save?.privateState) {
        if (!save.privateState.mana) save.privateState.mana = 0;
        save.privateState.mana = Math.max(0, save.privateState.mana + mana);
    }

    emit('resources:changed', { xp, gold, wood, oil, steel, cash, mana });
}

export function checkDailyReset(map) {
    const now = timestampNow();
    const DAY = 86400;

    if (!map || !map.timestampLastTrade) return false;

    const lastTradeDay = Math.floor(map.timestampLastTrade / DAY);
    const currentDay = Math.floor(now / DAY);

    if (currentDay !== lastTradeDay) {
        map.numTradesDone = 0;
        return true;
    }
    return false;
}

export function getTileSize() {
    return TILE_SIZE;
}

export function getGridSize() {
    return { width: GRID_WIDTH, height: GRID_HEIGHT };
}

export function screenToGrid(screenX, screenY, offsetX = 0, offsetY = 0) {
    const x = Math.floor((screenX - offsetX) / TILE_SIZE);
    const y = Math.floor((screenY - offsetY) / TILE_SIZE);
    return { x, y };
}

export function gridToScreen(gridX, gridY, offsetX = 0, offsetY = 0) {
    return {
        x: gridX * TILE_SIZE + offsetX,
        y: gridY * TILE_SIZE + offsetY
    };
}

function str(n) {
    return String(n);
}

export function createEmptyMap() {
    return {
        id: 0,
        xp: 0,
        level: 1,
        gold: 100,
        wood: 100,
        oil: 100,
        steel: 100,
        timestamp: timestampNow(),
        items: {},
        store: {},
        expansions: [],
        level: 1,
        idCurrentMission: '1',
        timestampLastChapter: timestampNow(),
        currentQuestVars: {},
        questTimes: {},
        numTradesDone: 0,
        timestampLastTrade: timestampNow(),
        timestampLastTreasure: timestampNow(),
        resourceAlliesMarket: 'gold'
    };
}

export function createEmptySave(userId) {
    return {
        playerInfo: {
            pid: userId,
            name: 'New Empire',
            pic: '',
            default_map: 0,
            cash: 1000,
            completed_tutorial: 0
        },
        maps: [createEmptyMap()],
        privateState: {
            boughtUnits: [],
            unitCollectionsCompleted: [],
            collections: [],
            researchStepNumber: [0, 0],
            researchItemNumber: [0, 0],
            timeStampDoResearch: [0, 0],
            goals: [],
            inventoryItems: {},
            deadHeroes: {},
            timeStampEndPremium: 0,
            magics: {},
            bonusNextId: 1,
            timestampLastBonus: 0,
            weeklyRewardIndex: 0,
            timeStampMondayBonus: 0,
            dartsRandomSeed: 0,
            dartsBalloonsShot: [],
            dartsHasFree: true,
            dartsGotExtra: false,
            timeStampDartsReset: 0,
            timeStampDartsNewFree: 0,
            marketPlaceFirstTime: false,
            questsRank: {}
        },
        version: '1.0.0'
    };
}