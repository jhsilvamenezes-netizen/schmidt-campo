// 3.0 · versões anteriores do plano de cada lote: mesma base da 2.x (IndexedDB "schmidt", depósito "versoes",
// índice "lote"), mesmo registro {lote, em, estado:{params, edits}, assinatura, resumo, motivo}; 20 por lote.
const STORE = 'versoes', MAX = 20;
const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const done = tx => new Promise((/** @type {(v?: any) => void} */ ok, ko) => { tx.oncomplete = () => ok(); tx.onerror = tx.onabort = () => ko(tx.error); });

export function createVersions(indexedDB) {
  /** @type {Promise<any>|null} */ let db = null;
  const open = () => db || (db = new Promise((ok, ko) => {
    if (!indexedDB) { ko(Error('IndexedDB indisponível')); return; }
    const r = indexedDB.open('schmidt', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }).createIndex('lote', 'lote'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); r.onblocked = () => ko(Error('IndexedDB bloqueado'));
  }).catch(e => { db = null; throw e; }));
  async function list(lote) {
    try { return (await req((await open()).transaction(STORE, 'readonly').objectStore(STORE).index('lote').getAll(lote))).sort((a, b) => b.em - a.em || b.id - a.id); } catch { return []; }
  }
  async function save(lote, estado, resumo, motivo = '') {
    try {
      const assinatura = JSON.stringify(estado), old = await list(lote);
      if (old[0]?.assinatura === assinatura) return null;
      const tx = (await open()).transaction(STORE, 'readwrite'), st = tx.objectStore(STORE), row = { lote, em: Date.now(), estado, assinatura, resumo, motivo };
      row.id = await req(st.add(row));
      for (const o of old.slice(MAX - 1)) st.delete(o.id);
      await done(tx); return row;
    } catch { return null; }
  }
  /** Para a cópia de segurança (mesmo contrato do serviço da 2.x). */
  const history = {
    readAll: async () => { try { return await req((await open()).transaction(STORE, 'readonly').objectStore(STORE).getAll()); } catch { return []; } },
    replaceAll: async rows => { const tx = (await open()).transaction(STORE, 'readwrite'), st = tx.objectStore(STORE); st.clear(); for (const r of rows) st.put(r); await done(tx); },
  };
  return { list, save, history };
}
