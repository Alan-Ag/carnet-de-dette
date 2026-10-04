// Stockage local via IndexedDB (persistant, hors ligne).
const DB = (() => {
  const NAME = 'carnet-dette';
  const VERSION = 1;
  let dbPromise;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const tx = db.createObjectStore('transactions', { keyPath: 'id' });
          tx.createIndex('clientId', 'clientId');
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

  async function run(storeNames, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeNames, mode);
      let result;
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
      result = fn(t);
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    async getAll(store) {
      const db = await open();
      return reqToPromise(db.transaction(store).objectStore(store).getAll());
    },
    put(store, value) {
      return run([store], 'readwrite', (t) => { t.objectStore(store).put(value); });
    },
    delete(store, id) {
      return run([store], 'readwrite', (t) => { t.objectStore(store).delete(id); });
    },
    // Supprime un client et toutes ses opérations dans une seule transaction.
    deleteClient(clientId, txIds) {
      return run(['clients', 'transactions'], 'readwrite', (t) => {
        t.objectStore('clients').delete(clientId);
        const store = t.objectStore('transactions');
        txIds.forEach((id) => store.delete(id));
      });
    },
    // Remplace tout le contenu (import de sauvegarde).
    replaceAll({ clients, transactions, settings }) {
      return run(['clients', 'transactions', 'settings'], 'readwrite', (t) => {
        const c = t.objectStore('clients');
        const x = t.objectStore('transactions');
        const s = t.objectStore('settings');
        c.clear(); x.clear(); s.clear();
        clients.forEach((v) => c.put(v));
        transactions.forEach((v) => x.put(v));
        settings.forEach((v) => s.put(v));
      });
    },
  };
})();
