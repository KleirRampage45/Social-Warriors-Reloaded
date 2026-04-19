export class CommandHandler {
    constructor(playerData, config, resources, buildings, eventBus) {
        this.playerData = playerData;
        this.config = config;
        this.resources = resources;
        this.buildings = buildings;
        this.eventBus = eventBus;
    }

    execute(command) {
        const [mapId, cmdName, args, resourcesChanged] = command;

        const handler = this.commands[cmdName];
        if (!handler) {
            console.warn(`Unknown command: ${cmdName}`);
            return { success: false, error: `Unknown command: ${cmdName}` };
        }

        try {
            const result = handler.call(this, ...args);

            if (resourcesChanged && result.resourcesUsed) {
                this.resources.deduct(result.resourcesUsed);
            }

            this.eventBus.emit('command:executed', { command: cmdName, result });
            return { success: true, result };
        } catch (error) {
            console.error(`Command ${cmdName} failed:`, error);
            return { success: false, error: error.message };
        }
    }

    executeBatch(commands) {
        const results = [];
        for (const cmd of commands) {
            results.push(this.execute(cmd));
        }
        return results;
    }

    get commands() {
        return {
            buy: this._buy.bind(this),
            sell: this._sell.bind(this),
            kill: this._kill.bind(this),
            move: this._move.bind(this),
            upgrade: this._upgrade.bind(this),
            level_up: this._levelUp.bind(this),
            expand: this._expand.bind(this),
            collect: this._collect.bind(this),
            activate: this._activate.bind(this),
            store_item: this._storeItem.bind(this),
            place_stored_item: this._placeStoredItem.bind(this),
            push_unit: this._pushUnit.bind(this),
            pop_unit: this._popUnit.bind(this),
            complete_tutorial: this._completeTutorial.bind(this),
            quest_mission: this._questMission.bind(this),
            end_quest: this._endQuest.bind(this),
            weekly_reward: this._weeklyReward.bind(this),
            fast_forward: this._fastForward.bind(this),
        };
    }

    _buy(itemIndex, itemId, x, y, playerId, orientation, unknown, reason) {
        const item = this.config.items[itemId];
        if (!item) {
            throw new Error(`Unknown item: ${itemId}`);
        }

        const cost = this._calculateCost(item, itemIndex);
        if (!this.resources.canAfford(cost)) {
            throw new Error('Insufficient resources');
        }

        const grid = this.playerData.maps[0].grid;
        this._placeItemOnGrid(grid, x, y, itemId, itemIndex, orientation);

        this.buildings.add(itemId, itemIndex, x, y, orientation);

        return { resourcesUsed: cost, itemIndex, x, y };
    }

    _sell(itemIndex, reason) {
        const grid = this.playerData.maps[0].grid;
        const item = this._getItemFromGrid(grid, itemIndex);
        if (!item) {
            throw new Error(`Item not found at index: ${itemIndex}`);
        }

        const refund = {
            gold: Math.floor(item.cost.gold * 0.5),
            wood: Math.floor(item.cost.wood * 0.5),
            oil: Math.floor(item.cost.oil * 0.5),
            steel: Math.floor(item.cost.steel * 0.5),
        };

        grid[itemIndex] = null;
        this.buildings.remove(itemIndex);

        this.resources.add(refund);
        return { refund };
    }

    _kill(itemIndex, reason) {
        const grid = this.playerData.maps[0].grid;
        grid[itemIndex] = null;
        this.buildings.remove(itemIndex);
        return { success: true };
    }

    _move(itemIndex, x, y, frame, string) {
        const grid = this.playerData.maps[0].grid;
        const item = grid[itemIndex];
        if (!item) {
            throw new Error(`Item not found at index: ${itemIndex}`);
        }

        this._removeItemFromGrid(grid, itemIndex);
        this._placeItemOnGrid(grid, x, y, item.id, itemIndex, item.orientation);

        item.x = x;
        item.y = y;

        return { success: true };
    }

    _upgrade(itemIndex) {
        const building = this.buildings.get(itemIndex);
        if (!building) {
            throw new Error(`Building not found at index: ${itemIndex}`);
        }

        const upgradeCost = this._calculateUpgradeCost(building);
        if (!this.resources.canAfford(upgradeCost)) {
            throw new Error('Insufficient resources');
        }

        building.level++;

        return { resourcesUsed: upgradeCost, newLevel: building.level };
    }

    _levelUp() {
        const currentLevel = this.playerData.playerInfo.level || 1;
        const upgradeCost = this._calculateLevelUpCost(currentLevel);

        if (!this.resources.canAfford(upgradeCost)) {
            throw new Error('Insufficient resources');
        }

        this.playerData.playerInfo.level = currentLevel + 1;

        return { resourcesUsed: upgradeCost, newLevel: currentLevel + 1 };
    }

    _expand(direction) {
        const map = this.playerData.maps[0];
        const expansionCost = this._calculateExpansionCost(map.expansions.length);

        if (!this.resources.canAfford(expansionCost)) {
            throw new Error('Insufficient resources');
        }

        map.expansions.push(direction);

        return { resourcesUsed: expansionCost, direction };
    }

    _collect(itemIndex) {
        const building = this.buildings.get(itemIndex);
        if (!building) {
            throw new Error(`Building not found at index: ${itemIndex}`);
        }

        const collectAmount = this._calculateCollection(building);
        this.resources.add(collectAmount);

        building.lastCollected = Date.now();

        return { collected: collectAmount };
    }

    _activate(itemIndex) {
        const building = this.buildings.get(itemIndex);
        if (!building) {
            throw new Error(`Building not found at index: ${itemIndex}`);
        }

        building.active = true;
        return { success: true };
    }

    _storeItem(itemIndex, targetIndex) {
        const grid = this.playerData.maps[0].grid;
        const item = grid[itemIndex];
        if (!item) {
            throw new Error(`Item not found at index: ${itemIndex}`);
        }

        const storage = this.playerData.storage || [];
        storage.push({ ...item, originalIndex: itemIndex });
        this.playerData.storage = storage;

        grid[itemIndex] = null;

        return { success: true };
    }

    _placeStoredItem(itemIndex, x, y) {
        const storage = this.playerData.storage || [];
        const storedItem = storage[itemIndex];
        if (!storedItem) {
            throw new Error(`Stored item not found at index: ${itemIndex}`);
        }

        const grid = this.playerData.maps[0].grid;
        this._placeItemOnGrid(grid, x, y, storedItem.id, storedItem.originalIndex, storedItem.orientation);

        storage.splice(itemIndex, 1);
        this.playerData.storage = storage;

        return { success: true };
    }

    _pushUnit(itemIndex, unitId) {
        const building = this.buildings.get(itemIndex);
        if (!building) {
            throw new Error(`Building not found at index: ${itemIndex}`);
        }

        const unit = this.config.units[unitId];
        if (!unit) {
            throw new Error(`Unknown unit: ${unitId}`);
        }

        const queue = building.unitQueue || [];
        queue.push({ unitId, queuedAt: Date.now() });
        building.unitQueue = queue;

        return { success: true };
    }

    _popUnit(itemIndex) {
        const building = this.buildings.get(itemIndex);
        if (!building) {
            throw new Error(`Building not found at index: ${itemIndex}`);
        }

        const queue = building.unitQueue || [];
        if (queue.length === 0) {
            throw new Error('No units in queue');
        }

        const unit = queue.shift();
        building.unitQueue = queue;

        this._spawnUnit(unit.unitId);

        return { spawned: unit.unitId };
    }

    _completeTutorial() {
        this.playerData.playerInfo.completed_tutorial = 1;
        return { success: true };
    }

    _questMission(questId, missionId) {
        const quest = this.playerData.quests?.[questId];
        if (!quest) {
            throw new Error(`Quest not found: ${questId}`);
        }

        quest.progress = quest.progress || {};
        quest.progress[missionId] = true;

        return { success: true };
    }

    _endQuest(questId) {
        const quest = this.playerData.quests?.[questId];
        if (!quest) {
            throw new Error(`Quest not found: ${questId}`);
        }

        if (quest.rewards) {
            this.resources.add(quest.rewards);
        }

        quest.completed = true;

        return { success: true };
    }

    _weeklyReward() {
        const lastReward = this.playerData.lastWeeklyReward || 0;
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        if (now - lastReward < weekMs) {
            throw new Error('Weekly reward not available yet');
        }

        const reward = {
            gold: 5000,
            wood: 1000,
            oil: 500,
            steel: 250,
        };

        this.resources.add(reward);
        this.playerData.lastWeeklyReward = now;

        return { reward };
    }

    _fastForward(itemIndex) {
        const building = this.buildings.get(itemIndex);
        if (!building) {
            throw new Error(`Building not found at index: ${itemIndex}`);
        }

        const remainingTime = building.finishesAt - Date.now();
        if (remainingTime <= 0) {
            throw new Error('Nothing to fast forward');
        }

        building.finishesAt = Date.now();

        return { success: true };
    }

    _calculateCost(item, itemIndex) {
        return {
            gold: item.gold || 0,
            wood: item.wood || 0,
            oil: item.oil || 0,
            steel: item.steel || 0,
        };
    }

    _calculateUpgradeCost(building) {
        const item = this.config.items[building.itemId];
        const level = building.level || 1;
        const baseCost = {
            gold: item.gold || 0,
            wood: item.wood || 0,
            oil: item.oil || 0,
            steel: item.steel || 0,
        };

        return {
            gold: Math.floor(baseCost.gold * Math.pow(1.5, level)),
            wood: Math.floor(baseCost.wood * Math.pow(1.5, level)),
            oil: Math.floor(baseCost.oil * Math.pow(1.5, level)),
            steel: Math.floor(baseCost.steel * Math.pow(1.5, level)),
        };
    }

    _calculateLevelUpCost(currentLevel) {
        return {
            gold: Math.floor(100 * Math.pow(1.5, currentLevel)),
            wood: Math.floor(50 * Math.pow(1.5, currentLevel)),
            oil: 0,
            steel: Math.floor(25 * Math.pow(1.5, currentLevel)),
        };
    }

    _calculateExpansionCost(expansionCount) {
        return {
            gold: Math.floor(1000 * Math.pow(1.3, expansionCount)),
            wood: Math.floor(500 * Math.pow(1.3, expansionCount)),
            oil: Math.floor(250 * Math.pow(1.3, expansionCount)),
            steel: Math.floor(100 * Math.pow(1.3, expansionCount)),
        };
    }

    _calculateCollection(building) {
        const item = this.config.items[building.itemId];
        const multiplier = 1 + (building.level || 1) * 0.2;

        return {
            gold: Math.floor((item.production?.gold || 0) * multiplier),
            wood: Math.floor((item.production?.wood || 0) * multiplier),
            oil: Math.floor((item.production?.oil || 0) * multiplier),
            steel: Math.floor((item.production?.steel || 0) * multiplier),
        };
    }

    _placeItemOnGrid(grid, x, y, itemId, itemIndex, orientation) {
        const item = {
            id: itemId,
            x,
            y,
            orientation,
            itemIndex,
            placedAt: Date.now(),
        };
        grid[itemIndex] = item;
    }

    _removeItemFromGrid(grid, itemIndex) {
        const item = grid[itemIndex];
        grid[itemIndex] = null;
        return item;
    }

    _getItemFromGrid(grid, itemIndex) {
        return grid[itemIndex];
    }

    _spawnUnit(unitId) {
        const unit = this.config.units[unitId];
        if (!unit) return;

        const unitIndex = this.playerData.units?.length || 0;
        this.playerData.units = this.playerData.units || [];
        this.playerData.units.push({
            id: unitId,
            index: unitIndex,
            health: unit.health,
            attack: unit.attack,
            defense: unit.defense,
            spawnedAt: Date.now(),
        });
    }
}