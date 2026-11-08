// Nova fonte de correção; não é a fonte original recuperada do bundle 1.31.
export const SCHMIDT_BACKUP_KEYS = ['monitoramento.v03', 'schmidt.v07.map.preferences', 'schmidt.lotes.importados'];
export const SCHMIDT_RESTORE_MARKER = 'schmidt.restore.pending.v1';
export const SCHMIDT_BACKUP_MAX_BYTES = 80 * 1024 * 1024;

export function createSchmidtBackupService({ storage, images, history, journal, maxBytes = SCHMIDT_BACKUP_MAX_BYTES, onCorrupt = () => {} }) {
  let corruptState = false;
  let active = false;
  const invalid = () => new Error('configurações em formato inválido');
  const rawState = () => Object.fromEntries(SCHMIDT_BACKUP_KEYS.map(key => [key, storage.getItem(key)]));
  const pending = () => storage.getItem(SCHMIDT_RESTORE_MARKER) !== null;
  const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const corrupted = () => { corruptState = true; onCorrupt(); return invalid(); };

  function readJSON(key) {
    const value = storage.getItem(key);
    if (value === null) return null;
    let parsed;
    try { parsed = JSON.parse(value); } catch { throw corrupted(); }
    if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) throw corrupted();
    return parsed;
  }

  function loadAppState() {
    try { return readJSON('monitoramento.v03') || {}; }
    catch { corruptState = true; return {}; }
  }

  async function collect() {
    if (pending()) throw invalid();
    const before = rawState();
    const data = Object.fromEntries(SCHMIDT_BACKUP_KEYS.map(key => [key, readJSON(key)]));
    // Rejeições não são convertidas em coleções vazias.
    const imageRecords = await images.readAll();
    const versions = await history.readAll();
    if (!sameJSON(before, rawState())) throw invalid();
    return { data, images: imageRecords, history: versions };
  }

  function assertExportable(backup) {
    if (new TextEncoder().encode(JSON.stringify(backup)).byteLength > maxBytes) throw new Error('arquivo acima de 80 MB');
    return backup;
  }

  function preflightExport(snapshot) {
    let encodedBytes = 0;
    const metadata = snapshot.images.map(({ key, rec }) => {
      if (!Number.isSafeInteger(rec.blob?.size) || rec.blob.size < 0) throw new Error('imagem de fundo em formato inválido');
      encodedBytes += 4 * Math.ceil(rec.blob.size / 3);
      return { chave: String(key), nome: rec.name, crs: rec.crs, largura: rec.width,
        altura: rec.height, world: rec.world, tipo: rec.blob.type || 'image/png', base64: '' };
    });
    const payload = { dados: snapshot.data, imagens: metadata, ...(snapshot.history.length ? { historico: snapshot.history } : {}) };
    // Limite inferior: evita converter imagens já sabidamente grandes demais.
    // O manifesto e o hash serão incluídos na checagem exata final em UTF-8.
    if (encodedBytes + new TextEncoder().encode(JSON.stringify(payload)).byteLength > maxBytes) throw new Error('arquivo acima de 80 MB');
  }

  function writeRaw(raw) {
    for (const key of SCHMIDT_BACKUP_KEYS) {
      // Evita regravar chaves que não mudaram, inclusive durante rollback por quota.
      if (storage.getItem(key) === raw[key]) continue;
      if (raw[key] === null) storage.removeItem(key);
      else storage.setItem(key, raw[key]);
    }
  }

  async function rollback(snapshot) {
    if (!snapshot?.raw || !Array.isArray(snapshot.images) || !Array.isArray(snapshot.history)
      || SCHMIDT_BACKUP_KEYS.some(key => !Object.hasOwn(snapshot.raw, key)
        || (snapshot.raw[key] !== null && typeof snapshot.raw[key] !== 'string'))) throw invalid();
    // Cada replaceAll é transacional na respectiva base. O journal cobre as bases.
    await images.replaceAll(snapshot.images);
    await history.replaceAll(snapshot.history);
    writeRaw(snapshot.raw);
    if (!sameJSON(rawState(), snapshot.raw)) throw invalid();
  }

  async function recover() {
    if (!pending()) return false;
    const record = await journal.read();
    if (!record || !['prepared', 'committed'].includes(record.stage) || !record.before) throw invalid();
    if (record.stage === 'prepared') await rollback(record.before);
    storage.removeItem(SCHMIDT_RESTORE_MARKER);
    // Um journal órfão sem marcador não contém alterações a recuperar.
    try { await journal.clear(); } catch { /* coleta de lixo pode ser repetida */ }
    return true;
  }

  async function restore({ data, images: incomingImages, history: incomingHistory, legacy = false }) {
    if (active) throw invalid();
    active = true;
    try {
      await recover();
      const before = { raw: rawState(), images: await images.readAll(), history: await history.readAll() };
      const afterRaw = { ...before.raw };
      for (const key of legacy ? ['monitoramento.v03'] : SCHMIDT_BACKUP_KEYS) {
        if (!Object.hasOwn(data, key)) throw invalid();
        afterRaw[key] = data[key] == null ? null : JSON.stringify(data[key]);
      }
      const targetImages = legacy ? before.images : incomingImages;
      const targetHistory = legacy ? before.history : incomingHistory;
      // Nenhuma escrita destrutiva ocorre antes da cópia durável de recuperação.
      await journal.write({ stage: 'prepared', before });
      storage.setItem(SCHMIDT_RESTORE_MARKER, '1');
      let committed = false;
      try {
        await images.replaceAll(targetImages);
        await history.replaceAll(targetHistory);
        writeRaw(afterRaw);
        if (!sameJSON(rawState(), afterRaw)) throw invalid();
        // O commit durável é o ponto após o qual a recuperação conserva o novo estado.
        await journal.write({ stage: 'committed', before });
        committed = true;
        storage.removeItem(SCHMIDT_RESTORE_MARKER);
        corruptState = false;
        try { await journal.clear(); } catch { /* marcador já foi removido */ }
      } catch (error) {
        if (committed) throw error;
        try {
          await rollback(before);
          storage.removeItem(SCHMIDT_RESTORE_MARKER);
          try { await journal.clear(); } catch { /* cópia anterior já restaurada */ }
        } catch { /* marcador e snapshot permanecem para recuperação na reabertura */ }
        throw error;
      }
    } finally { active = false; }
  }

  return { readJSON, loadAppState, collect, preflightExport, assertExportable, restore, recover,
    isWriteBlocked: () => corruptState || pending() };
}
