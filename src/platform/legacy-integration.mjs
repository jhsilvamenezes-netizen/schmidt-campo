// Integrador explícito com APIs do artefato congelado; não altera DOM/CSS/rotas.
let schmidtBackupService;
export async function initialiseSchmidtCorrections(historyDB, basemap) {
  const session = createSchmidtSessionLock(navigator.locks);
  const barrier = createSchmidtWriteBarrier(session, localStorage, historyDB, basemap);
  schmidtBackupService = createSchmidtBackupService({
    storage: barrier.storage,
    exclusive: barrier.exclusive,
    onCorrupt: () => { SCHMIDT.restaurando = true; },
    images: createSchmidtImageRepository(indexedDB),
    history: {
      readAll: async () => schmidtIDBTransaction(await historyDB.abrir(), 'versoes', 'readonly', store => store.getAll()),
      replaceAll: barrier.replaceHistory,
    },
    journal: createSchmidtJournal(indexedDB),
  });
  try { await session.enter(); await schmidtBackupService.recover(); }
  catch (error) { schmidtReportLegacyStoreFailure(error); SCHMIDT.restaurando = true; return; }
  schmidtBackupService.loadAppState();
  if (schmidtBackupService.isWriteBlocked()) {
    SCHMIDT.restaurando = true;
    schmidtReportLegacyStoreFailure(new Error('configurações em formato inválido'));
  }
}
