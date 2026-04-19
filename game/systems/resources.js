export class Resources {
    constructor(playerData, eventBus) {
        this.playerData = playerData;
        this.eventBus = eventBus;
        this.resources = playerData.resources || {
            gold: 100,
            wood: 50,
            oil: 25,
            steel: 10,
        };
    }

    getGold() {
        return this.resources.gold;
    }

    getWood() {
        return this.resources.wood;
    }

    getOil() {
        return this.resources.oil;
    }

    getSteel() {
        return this.resources.steel;
    }

    getAll() {
        return { ...this.resources };
    }

    add(resources) {
        this.resources.gold += resources.gold || 0;
        this.resources.wood += resources.wood || 0;
        this.resources.oil += resources.oil || 0;
        this.resources.steel += resources.steel || 0;

        this.eventBus.emit('resources:changed', this.getAll());
    }

    deduct(resources) {
        if (!this.canAfford(resources)) {
            throw new Error('Insufficient resources');
        }

        this.resources.gold -= resources.gold || 0;
        this.resources.wood -= resources.wood || 0;
        this.resources.oil -= resources.oil || 0;
        this.resources.steel -= resources.steel || 0;

        this.eventBus.emit('resources:changed', this.getAll());
    }

    canAfford(resources) {
        return (
            this.resources.gold >= (resources.gold || 0) &&
            this.resources.wood >= (resources.wood || 0) &&
            this.resources.oil >= (resources.oil || 0) &&
            this.resources.steel >= (resources.steel || 0)
        );
    }

    set(resources) {
        this.resources = { ...resources };
        this.eventBus.emit('resources:changed', this.getAll());
    }
}