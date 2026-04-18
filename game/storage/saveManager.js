const DB_NAME = 'SocialWarriorsDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

let db = null;

export async function initSaveManager() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'playerInfo.pid' });
            }
        };
    });
}

export async function saveVillage(saveData) {
    if (!db) await initSaveManager();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(saveData);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
    });
}

export async function loadVillage(userId) {
    if (!db) await initSaveManager();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(userId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

export async function deleteVillage(userId) {
    if (!db) await initSaveManager();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(userId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
    });
}

export async function listAllVillages() {
    if (!db) await initSaveManager();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

export async function exportSave(userId) {
    const save = await loadVillage(userId);
    if (!save) return null;
    return JSON.stringify(save, null, 2);
}

export async function importSave(jsonString) {
    try {
        const save = JSON.parse(jsonString);
        if (!save.playerInfo?.pid) {
            throw new Error('Invalid save format');
        }
        await saveVillage(save);
        return save.playerInfo.pid;
    } catch (e) {
        throw new Error('Failed to import save: ' + e.message);
    }
}

export function generateUserId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}