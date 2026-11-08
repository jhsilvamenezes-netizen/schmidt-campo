import { SCHMIDT_BACKUP_KEYS } from '../persistence/backup-service.mjs';
// Clientes desta versão mantêm presença compartilhada durante a vida da página.
// Uma operação destrutiva exige presença exclusiva; não usa prazo/lease renovável.
export function createSchmidtSessionLock(locks) {
  const presence = 'schmidt.storage.session.v1';
  const gate = 'schmidt.storage.operation.v1';
  let releasePresence, presenceDone, busy = false;
  const invalid = () => new Error('IndexedDB bloqueado');

  async function enter() {
    if (!locks?.request || releasePresence) return;
    let ready;
    const acquired = new Promise(resolve => { ready = resolve; });
    presenceDone = locks.request(presence, { mode: 'shared' }, async () => {
      await new Promise(resolve => { releasePresence = resolve; ready(); });
    });
    await Promise.race([acquired, presenceDone.then(() => { throw invalid(); })]);
  }

  async function exclusive(operation) {
    if (busy || !locks?.request) throw invalid();
    busy = true;
    try {
      return await locks.request(gate, { ifAvailable: true }, async token => {
        if (!token) throw invalid();
        releasePresence?.();
        releasePresence = undefined;
        await presenceDone;
        try {
          return await locks.request(presence, { ifAvailable: true }, lock => {
            if (!lock) throw invalid();
            return operation();
          });
        } finally { await enter(); }
      });
    } finally { busy = false; }
  }
  return { enter, exclusive, isBusy: () => busy };
}

// Bloqueia escritores da própria página e drena mutações assíncronas já iniciadas.
// As portas privadas da restauração continuam usando as APIs originais.
export function createSchmidtWriteBarrier(session, storage, historyDB, basemap) {
  const pending = new Set();
  const originals = { setItem: Storage.prototype.setItem, removeItem: Storage.prototype.removeItem, clear: Storage.prototype.clear };
  let internal = false;
  const blocked = () => session.isBusy() && !internal;
  const invalid = () => new Error('IndexedDB bloqueado');
  for (const method of ['setItem', 'removeItem', 'clear']) {
    Storage.prototype[method] = function(key, ...args) {
      if (this === storage && blocked() && (method === 'clear' || SCHMIDT_BACKUP_KEYS.includes(String(key)))) throw invalid();
      return originals[method].call(this, key, ...args);
    };
  }
  const privateStorage = {
    getItem: key => storage.getItem(key),
    ...Object.fromEntries(['setItem','removeItem'].map(method => [method, (...args) => {
      internal = true;
      try { return storage[method](...args); } finally { internal = false; }
    }])),
  };
  const replaceHistory = historyDB.substituir.bind(historyDB);
  for (const [object, method, quiet] of [[historyDB,'gravar',true], [historyDB,'substituir',false],
    [basemap,'saveBasemap',false], [basemap,'deleteBasemap',false]]) {
    const original = object[method].bind(object);
    object[method] = async (...args) => {
      if (blocked()) { if (quiet) return null; throw invalid(); }
      const operation = Promise.resolve(original(...args));
      pending.add(operation);
      try { return await operation; } finally { pending.delete(operation); }
    };
  }
  return { storage: privateStorage, replaceHistory,
    exclusive: operation => session.exclusive(async () => {
      await Promise.allSettled([...pending]);
      return operation();
    }),
  };
}
