const DB_NAME = 'meal-planner-db';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('ingredients')) {
        const store = db.createObjectStore('ingredients', { keyPath: 'id' });
        store.createIndex('byName', 'nameLower', { unique: true });
      }

      if (!db.objectStoreNames.contains('meals')) {
        const store = db.createObjectStore('meals', { keyPath: 'id' });
        store.createIndex('byCategory', 'category', { unique: false });
      }

      if (!db.objectStoreNames.contains('plannedMeals')) {
        const store = db.createObjectStore('plannedMeals', { keyPath: 'id' });
        store.createIndex('byWeek', 'weekStart', { unique: false });
        store.createIndex('byWeekDay', ['weekStart', 'day'], { unique: false });
      }

      if (!db.objectStoreNames.contains('manualShoppingItems')) {
        const store = db.createObjectStore('manualShoppingItems', { keyPath: 'id' });
        store.createIndex('byWeek', 'weekStart', { unique: false });
      }

      if (!db.objectStoreNames.contains('shoppingItemState')) {
        db.createObjectStore('shoppingItemState', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeNames, mode = 'readonly') {
  return openDb().then((db) => db.transaction(storeNames, mode));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function genId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export const DB = {
  genId,

  async getAll(storeName) {
    const t = await tx([storeName]);
    return reqToPromise(t.objectStore(storeName).getAll());
  },

  async get(storeName, id) {
    const t = await tx([storeName]);
    return reqToPromise(t.objectStore(storeName).get(id));
  },

  async put(storeName, value) {
    const t = await tx([storeName], 'readwrite');
    await reqToPromise(t.objectStore(storeName).put(value));
    return value;
  },

  async putMany(storeName, values) {
    const t = await tx([storeName], 'readwrite');
    const store = t.objectStore(storeName);
    values.forEach((v) => store.put(v));
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },

  async delete(storeName, id) {
    const t = await tx([storeName], 'readwrite');
    await reqToPromise(t.objectStore(storeName).delete(id));
  },

  async deleteWhere(storeName, predicate) {
    const all = await this.getAll(storeName);
    const toDelete = all.filter(predicate);
    const t = await tx([storeName], 'readwrite');
    const store = t.objectStore(storeName);
    toDelete.forEach((item) => store.delete(item.id));
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve(toDelete.length);
      t.onerror = () => reject(t.error);
    });
  },

  async getByIndex(storeName, indexName, key) {
    const t = await tx([storeName]);
    return reqToPromise(t.objectStore(storeName).index(indexName).getAll(key));
  },

  async count(storeName) {
    const t = await tx([storeName]);
    return reqToPromise(t.objectStore(storeName).count());
  },

  async getSetting(key, fallback = null) {
    const row = await this.get('settings', key);
    return row ? row.value : fallback;
  },

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  },
};
