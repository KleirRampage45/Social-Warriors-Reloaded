export class ConfigLoader {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.config = null;
        this.items = new Map();
        this.units = new Map();
    }

    async load() {
        if (this.config) return this.config;

        const response = await fetch('config/main.json');
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }

        const rawConfig = await response.json();
        this.config = this._normalizeConfig(rawConfig);
        this.eventBus.emit('config:loaded', this.config);

        return this.config;
    }

    _normalizeConfig(rawConfig) {
        const items = new Map();
        const units = new Map();

        if (rawConfig.items && Array.isArray(rawConfig.items)) {
            for (const item of rawConfig.items) {
                const id = item.id;
                items.set(id, {
                    id,
                    name: item.name,
                    type: item.type,
                    width: parseInt(item.width) || 1,
                    height: parseInt(item.height) || 1,
                    cost: this._parseCosts(item.costs),
                    production: this._parseProduction(item),
                    category: item.category_id,
                    subcategory: item.subcategory_id,
                    img: item.img_name,
                    xp: parseInt(item.xp) || 0,
                    population: parseInt(item.population) || 0,
                    defense: parseInt(item.defense) || 0,
                    attack: parseInt(item.attack) || 0,
                    life: parseInt(item.life) || 100,
                    elevation: parseInt(item.elevation) || 0,
                    upgradesTo: item.upgrades_to,
                    collect: parseInt(item.collect) || 0,
                    collectType: item.collect_type,
                    buildTime: parseInt(item.build_time) || 0,
                    groupType: item.group_type,
                });
            }
        }

        if (rawConfig.units && Array.isArray(rawConfig.units)) {
            for (const unit of rawConfig.units) {
                const id = unit.id;
                units.set(id, {
                    id,
                    name: unit.name,
                    type: unit.type,
                    cost: this._parseCosts(unit.costs),
                    category: unit.category_id,
                    subcategory: unit.subcategory_id,
                    img: unit.img_name,
                    attack: parseInt(unit.attack) || 0,
                    defense: parseInt(unit.defense) || 0,
                    life: parseInt(unit.life) || 100,
                    velocity: parseInt(unit.velocity) || 0,
                    attackRange: parseInt(unit.attack_range) || 0,
                    attackInterval: parseInt(unit.attack_interval) || 0,
                    xp: parseInt(unit.xp) || 0,
                });
            }
        }

        this.items = items;
        this.units = units;

        return {
            categories: rawConfig.categories,
            items,
            units,
            quests: rawConfig.quests || {},
        };
    }

    _parseCosts(costsStr) {
        if (!costsStr) return { gold: 0, wood: 0, oil: 0, steel: 0 };
        try {
            const parsed = JSON.parse(costsStr);
            return {
                gold: parsed.g || 0,
                wood: parsed.w || 0,
                oil: parsed.o || 0,
                steel: parsed.s || 0,
                cash: parsed.cash || 0,
            };
        } catch {
            return { gold: 0, wood: 0, oil: 0, steel: 0 };
        }
    }

    _parseProduction(item) {
        const collect = parseInt(item.collect) || 0;
        if (!collect) return null;

        return {
            type: item.collect_type,
            amount: collect,
        };
    }

    getItem(itemId) {
        return this.items.get(String(itemId)) || this.items.get(itemId) || null;
    }

    getUnit(unitId) {
        return this.units.get(String(unitId)) || this.units.get(unitId) || null;
    }

    getBuilding(buildingId) {
        return this.items.get(String(buildingId)) || null;
    }

    getQuest(questId) {
        return this.config?.quests?.[questId] || null;
    }

    getItemsByCategory(categoryId) {
        const result = [];
        for (const [id, item] of this.items) {
            if (String(item.category) === String(categoryId)) {
                result.push(item);
            }
        }
        return result;
    }

    getItemsBySubcategory(subcategoryId) {
        const result = [];
        for (const [id, item] of this.items) {
            if (String(item.subcategory) === String(subcategoryId)) {
                result.push(item);
            }
        }
        return result;
    }
}