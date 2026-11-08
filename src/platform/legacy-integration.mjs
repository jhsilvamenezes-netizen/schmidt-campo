// Integrador explícito com APIs do artefato congelado; não altera DOM/CSS/rotas.
let schmidtBackupService;
export async function initialiseSchmidtCorrections(historyDB) {
  schmidtBackupService = createSchmidtBackupService({
    storage: localStorage,
    onCorrupt: () => { SCHMIDT.restaurando = true; },
    images: createSchmidtImageRepository(indexedDB),
    history: {
      readAll: async () => schmidtIDBTransaction(await historyDB.abrir(), 'versoes', 'readonly', store => store.getAll()),
      replaceAll: values => historyDB.substituir(values),
    },
    journal: createSchmidtJournal(indexedDB),
  });
  try { await schmidtBackupService.recover(); }
  catch (error) { schmidtReportLegacyStoreFailure(error); SCHMIDT.restaurando = true; return; }
  schmidtBackupService.loadAppState();
  if (schmidtBackupService.isWriteBlocked()) {
    SCHMIDT.restaurando = true;
    schmidtReportLegacyStoreFailure(new Error('configurações em formato inválido'));
  }
}
