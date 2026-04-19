export class SaveManager {
    constructor() {
        this.dbName = 'SocialWarriors';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('players')) {
                    const playerStore = db.createObjectStore('players', { keyPath: 'pid' });
                    playerStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('saves')) {
                    const saveStore = db.createObjectStore('saves', { keyPath: 'id' });
                    saveStore.createIndex('playerId', 'playerId', { unique: false });
                    saveStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async loadPlayer(playerId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readonly');
            const store = transaction.objectStore('players');
            const request = store.get(playerId);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    this._createDefaultPlayer(playerId).then(resolve);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async savePlayer(playerData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readwrite');
            const store = transaction.objectStore('players');
            const request = store.put(playerData);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async listPlayers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readonly');
            const store = transaction.objectStore('players');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deletePlayer(playerId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readwrite');
            const store = transaction.objectStore('players');
            const request = store.delete(playerId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async createSave(playerId, name) {
        const player = await this.loadPlayer(playerId);
        const saveData = {
            id: `${playerId}_${Date.now()}`,
            playerId,
            name,
            data: JSON.parse(JSON.stringify(player)),
            timestamp: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            const request = store.put(saveData);

            request.onsuccess = () => resolve(saveData);
            request.onerror = () => reject(request.error);
        });
    }

    async loadSave(saveId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            const request = store.get(saveId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async listSaves(playerId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            const index = store.index('playerId');
            const request = index.getAll(playerId);

            request.onsuccess = () => {
                const saves = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(saves);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteSave(saveId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            const request = store.delete(saveId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async _createDefaultPlayer(playerId) {
        return {
            pid: playerId,
            name: playerId,
            playerInfo: {
                pid: playerId,
                name: playerId,
                cash: 100,
                completed_tutorial: 0,
                level: 1,
            },
            maps: [
                {
                    id: 0,
                    world_id: 0,
                    expansions: [],
                    grid: [],
                    width: 12,
                    height: 8,
                },
            ],
            resources: {
                gold: 100,
                wood: 50,
                oil: 25,
                steel: 10,
            },
            storage: [],
            units: [],
            quests: {},
            settings: {
                sound: true,
                music: true,
            },
            lastSaved: Date.now(),
        };
    }
}