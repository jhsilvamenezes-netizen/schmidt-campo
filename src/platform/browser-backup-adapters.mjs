// Contratos das bases existentes. Não muda versões, nomes ou schemas legados.
export function schmidtIDBTransaction(db, store, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result;
    try { result = operation(tx.objectStore(store)); }
    catch (error) { tx.abort(); reject(error); return; }
    tx.oncomplete = () => resolve(result?.result);
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('IndexedDB recusado'));
  });
}

export function createSchmidtJournal(indexedDB) {
  let connection;
  const open = () => connection ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('schmidt-restauracao', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('journal');
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
    request.onerror = request.onblocked = () => { connection = null; reject(request.error || new Error('IndexedDB bloqueado')); };
  });
  return {
    read: async () => schmidtIDBTransaction(await open(), 'journal', 'readonly', store => store.get('restore')),
    write: async value => schmidtIDBTransaction(await open(), 'journal', 'readwrite', store => store.put(value, 'restore')),
    clear: async () => schmidtIDBTransaction(await open(), 'journal', 'readwrite', store => store.delete('restore')),
  };
}

export function createSchmidtImageRepository(indexedDB) {
  let connection;
  const open = () => connection ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('monitoramento-imagens', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('fundo');
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
    request.onerror = request.onblocked = () => { connection = null; reject(request.error || new Error('IndexedDB bloqueado')); };
  });
  return {
    readAll: async () => {
      const rows = [];
      await schmidtIDBTransaction(await open(), 'fundo', 'readonly', store => {
        const cursor = store.openCursor();
        cursor.onsuccess = () => { const entry = cursor.result; if (entry) { rows.push({ key: entry.key, rec: entry.value }); entry.continue(); } };
      });
      return rows;
    },
    replaceAll: async rows => schmidtIDBTransaction(await open(), 'fundo', 'readwrite', store => {
      store.clear();
      for (const { key, rec } of rows) store.put(rec, key);
    }),
  };
}
