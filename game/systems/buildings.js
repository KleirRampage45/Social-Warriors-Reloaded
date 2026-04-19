export class Buildings {
    constructor(playerData, config, eventBus) {
        this.playerData = playerData;
        this.config = config;
        this.eventBus = eventBus;
        this.buildings = new Map();

        this._loadFromGrid();
    }

    _loadFromGrid() {
        const grid = this.playerData.maps?.[0]?.grid || [];

        for (let i = 0; i < grid.length; i++) {
            const item = grid[i];
            if (item) {
                this.buildings.set(i, {
                    index: i,
                    itemId: item.id,
                    itemIndex: item.itemIndex,
                    x: item.x,
                    y: item.y,
                    orientation: item.orientation,
                    level: 1,
                    active: false,
                    lastCollected: null,
                    finishesAt: null,
                    unitQueue: [],
                });
            }
        }
    }

    get(index) {
        return this.buildings.get(index) || null;
    }

    getAll() {
        return Array.from(this.buildings.values());
    }

    add(itemId, itemIndex, x, y, orientation = 0) {
        const building = {
            index: itemIndex,
            itemId,
            itemIndex,
            x,
            y,
            orientation,
            level: 1,
            active: false,
            lastCollected: null,
            finishesAt: null,
            unitQueue: [],
        };

        this.buildings.set(itemIndex, building);
        this.eventBus.emit('building:added', building);

        return building;
    }

    remove(index) {
        const building = this.buildings.get(index);
        if (building) {
            this.buildings.delete(index);
            this.eventBus.emit('building:removed', building);
        }
        return building;
    }

    update(index, updates) {
        const building = this.buildings.get(index);
        if (building) {
            Object.assign(building, updates);
            this.eventBus.emit('building:updated', building);
        }
        return building;
    }

    getByType(type) {
        return this.getAll().filter(b => b.itemId === type);
    }

    getByLocation(x, y) {
        return this.getAll().find(b => b.x === x && b.y === y);
    }

    save() {
        const grid = this.playerData.maps?.[0]?.grid || [];

        for (const [index, building] of this.buildings) {
            grid[index] = {
                id: building.itemId,
                itemIndex: building.itemIndex,
                x: building.x,
                y: building.y,
                orientation: building.orientation,
                cost: this._getItemCost(building.itemId),
            };
        }

        return this.buildings;
    }

    _getItemCost(itemId) {
        const item = this.config?.items?.[itemId];
        return {
            gold: item?.gold || 0,
            wood: item?.wood || 0,
            oil: item?.oil || 0,
            steel: item?.steel || 0,
        };
    }
}