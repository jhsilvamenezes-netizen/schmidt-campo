import { createSchmidtBackupService } from '../persistence/backup-service.mjs';
import { createSchmidtSessionLock, installSchmidtSessionLifecycle } from './browser-session-lock.mjs';
import { createSchmidtWriteBarrier } from './browser-write-barrier.mjs';
import { schmidtIDBTransaction, createSchmidtImageRepository, createSchmidtJournal } from './browser-backup-adapters.mjs';
// Integrador explícito com APIs do artefato congelado; não altera DOM/CSS/rotas.
let schmidtBackupService;
export async function initialiseSchmidtCorrections(historyDB, basemap) {
  const session = createSchmidtSessionLock(navigator.locks);
  // Arma o fim da sessão só depois de o aplicativo registrar seus gravadores de
  // saída: a continuação deste await inicializa o bundle de forma síncrona, e
  // o temporizador agendado por último roda depois dela (inclusive nos retornos
  // de erro). Antes, a página perdia a permissão antes de gravar o pendente.
  const armSessionEnd = installSchmidtSessionLifecycle(window,session,{deferEnd:true});
  try { await initialiseSchmidtStores(session,historyDB,basemap); }
  finally { setTimeout(armSessionEnd,0); }
}
async function initialiseSchmidtStores(session,historyDB,basemap) {
  SCHMIDT.storageAccess=Object.freeze({canWrite:session.canWrite,message:()=>session.writeError().userMessage});
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
